import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assessment } from '../libs/entities/assessment/assessment.entity';
import { NotificationService } from '../services/notification.service';
import { Notification } from '../libs/entities/user/notification.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, Assessment])
  ],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}