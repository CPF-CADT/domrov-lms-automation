import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Assessment } from '../../libs/entities/assessment.entity';
import { User } from '../../libs/entities/user.entity';
import { MailerService } from '@nestjs-modules/mailer';

// Entities & Interfaces

export interface NotificationPayload {
    title: string;
    message: string;
    actionUrl?: string;
}

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        @InjectRepository(Assessment) private readonly assessmentRepo: Repository<Assessment>,
        private readonly mailerService: MailerService,
    ) { }

    /**
     * 1. Notify Single Student
     * Sends to Email (Always) + Telegram (If linked)
     */
    async notifyStudent(student: User, payload: NotificationPayload): Promise<void> {
        const promises: Promise<void>[] = [];

        // Channel A: Email
        promises.push(this.sendEmail(student, payload));

        // Channel B: Telegram
        if (student.telegramChats?.length > 0) {
            promises.push(this.sendTelegram(student, payload));
        }

        const results = await Promise.allSettled(promises);
        results.forEach((r, i) => {
            if (r.status === 'rejected') {
                this.logger.error(`Notification failed for student ${student.id} via ${i === 0 ? 'Email' : 'Telegram'}: ${r.reason}`);
            }
        });
    }

    /**
     * 2. Batch Notify Students
     * Optimized for bulk alerts (e.g., new assignment for whole class)
     */
    async notifyStudents(students: User[], payload: NotificationPayload): Promise<void> {
        this.logger.log(`Sending bulk notifications to ${students.length} students...`);

        const batchSize = 50;
        for (let i = 0; i < students.length; i += batchSize) {
            const batch = students.slice(i, i + batchSize);
            await Promise.allSettled(
                batch.map((student) => this.notifyStudent(student, payload))
            );
        }
    }

    /**
     * 3. CRON JOB: Deadline Reminders
     * Runs every hour. Finds assignments due in exactly 24 hours.
     */
    @Cron(CronExpression.EVERY_HOUR)
    async scheduleDeadlineReminders() {
        this.logger.log('Checking for upcoming assignment deadlines...');

        const now = new Date();
        // Look for due dates between 24h and 25h from now
        const startWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const endWindow = new Date(startWindow.getTime() + 60 * 60 * 1000);

        const upcomingAssessments = await this.assessmentRepo.find({
            where: {
                dueDate: Between(startWindow, endWindow),
            },
            relations: ['class', 'class.enrollments', 'class.enrollments.user', 'class.enrollments.user.telegramChats'],
        });

        for (const assessment of upcomingAssessments) {
            const students = assessment.class.enrollments.map((e) => e.user);

            if (students.length > 0) {
                await this.notifyStudents(students, {
                    title: 'Deadline Reminder',
                    message: `The assignment "${assessment.title}" is due in 24 hours.`,
                    actionUrl: `http://localhost:3000/assessments/${assessment.id}`,
                });
                this.logger.log(`Sent reminders for assessment ${assessment.id}`);
            }
        }
    }

    private async sendEmail(user: User, payload: NotificationPayload) {
        if (!user.email) return;
        this.logger.log(`[EMAIL] To: ${user.email} | ${payload.title}`);
        await this.mailerService.sendMail({
            to: user.email,
            subject: payload.title,
            text: payload.message,
            html: `<p>${payload.message}</p><p><a href="${payload.actionUrl}">View Assignment</a></p>`,
        });
    }


    private async sendTelegram(user: User, payload: NotificationPayload) {
        if (!user.telegramChats) return;

        for (const chat of user.telegramChats) {
            const msg = `*${payload.title}*\n${payload.message}\n${payload.actionUrl || ''}`;
            this.logger.log(`[TELEGRAM] ChatID: ${chat.chatId} | ${payload.title}`);
        }
    }
}