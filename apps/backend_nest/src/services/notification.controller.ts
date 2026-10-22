import { Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../modules/auth/jwt-auth.guard';
import { UserId } from '../common/decorators/user.decorator';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async list(@UserId() userId: number) {
    return { success: true, data: await this.notificationService.getNotifications(userId) };
  }

  @Get('unread')
  async unread(@UserId() userId: number) {
    return { success: true, data: await this.notificationService.getUnreadNotifications(userId) };
  }

  @Patch(':id/read')
  async markRead(@UserId() userId: number, @Param('id', ParseIntPipe) id: number) {
    await this.notificationService.markAsReadForUser(id, userId);
    return { success: true, data: { message: 'Notification marked as read' } };
  }
}
