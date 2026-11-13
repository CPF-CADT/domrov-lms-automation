import { Controller, Get, Param, ParseIntPipe, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationService } from './notification.service';

type AuthenticatedRequest = Request & { user: { sub: number } };

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.notifications.listForUser(request.user.sub) };
  }

  @Get('unread')
  async unread(@Req() request: AuthenticatedRequest) {
    return { success: true, data: await this.notifications.unreadForUser(request.user.sub) };
  }

  @Patch(':id/read')
  async markRead(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return { success: true, data: await this.notifications.markAsRead(request.user.sub, id) };
  }
}
