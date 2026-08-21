import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Assessment } from '../libs/entities/assessment/assessment.entity';
import { User } from '../libs/entities/user/user.entity';
import { Notification, NotificationStatus, NotificationType } from '../libs/entities/user/notification.entity';
import { MailerService } from '@nestjs-modules/mailer';

export interface NotificationPayload {
    title: string;
    message?: string;
    actionUrl?: string;
    type?: NotificationType;
}

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        @InjectRepository(Assessment) private readonly assessmentRepo: Repository<Assessment>,
        @InjectRepository(Notification) private readonly notificationRepo: Repository<Notification>,
        private readonly mailerService: MailerService,
    ) { }

    /**
     * Notify a single student and store in DB
     */
    async notifyStudent(student: User, payload: NotificationPayload): Promise<void> {
        const promises: Promise<void>[] = [];

        // 1️⃣ Save notification in DB
        const notification = this.notificationRepo.create({
            user: student,
            title: payload.title,
            message: payload.message || '',
            type: payload.type || NotificationType.INFO,
            status: NotificationStatus.UNREAD,
        });
        await this.notificationRepo.save(notification);

        // 2️⃣ Send via Email
        promises.push(this.sendEmail(student, payload));

        // 3️⃣ Send via Telegram if linked
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
     * Batch notify students
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
     * CRON: Deadline reminders
     */
    @Cron(CronExpression.EVERY_HOUR)
    async scheduleDeadlineReminders() {
        this.logger.log('Checking for upcoming assignment deadlines...');

        const now = new Date();
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

    /**
     * Send Email
     */
    private async sendEmail(user: User, payload: NotificationPayload) {
        if (!user.email) return;

        try {
            this.logger.log(`[EMAIL] To: ${user.email} | ${payload.title}`);
            await this.mailerService.sendMail({
                to: user.email,
                subject: payload.title,
                text: payload.message,
                html: `<p>${payload.message}</p><p><a href="${payload.actionUrl}">View</a></p>`,
            });
        } catch (err) {
            this.logger.error(`Failed to send email to ${user.id}: ${err}`);
            throw err;
        }
    }

    /**
     * Mocked Telegram
     */
    private async sendTelegram(user: User, payload: NotificationPayload) {
        if (!user.telegramChats || user.telegramChats.length === 0) return;

        for (const chat of user.telegramChats) {
            try {
                const msg = `*${payload.title}*\n${payload.message || ''}\n${payload.actionUrl || ''}`;
                this.logger.log(`[TELEGRAM MOCK] ChatID: ${chat.chatId} | Message: ${msg}`);
            } catch (err) {
                this.logger.error(`Failed Telegram to ${user.id} (ChatID: ${chat.chatId}): ${err}`);
            }
        }
    }

    /**
     * Mark a notification as read
     */
    async markAsRead(notificationId: number): Promise<void> {
        await this.notificationRepo.update(notificationId, { status: NotificationStatus.READ });
    }

    /**
     * Get all unread notifications for a user
     */
    async getUnreadNotifications(userId: number): Promise<Notification[]> {
        return this.notificationRepo.find({
            where: { user: { id: userId }, status: NotificationStatus.UNREAD },
            order: { createdAt: 'DESC' },
        });
    }
}