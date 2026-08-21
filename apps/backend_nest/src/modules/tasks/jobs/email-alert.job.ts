import { Injectable } from '@nestjs/common';
import { TaskHandler } from '../../../libs/interfaces/task-handler';
import { MailerService } from '@nestjs-modules/mailer';
import { Tasks } from '../../../libs/enums/taks.enum';

@Injectable()
export class EmailAlertTask implements TaskHandler {

    constructor(
        private readonly mailerService: MailerService,
    ) { }

    taskName() {
        return Tasks.EMAIL_ALERT;
    }

    async execute(payload: { content: string }) {
        console.log('Publishing assessment', payload.content);
        await this.mailerService.sendMail({ to: "vathanakphy@gmail.com", subject: "TEST TASK SCHEDULE ", text: "Welcome to domrov" })
    }
}