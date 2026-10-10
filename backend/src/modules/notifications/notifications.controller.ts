import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async listNotifications(@CurrentUser('userId') userId: string) {
    const data = await this.notificationsService.listNotifications(userId);
    return { success: true, data, timestamp: Date.now() };
  }

  @Patch(':id/read')
  async markRead(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    const data = await this.notificationsService.markAsRead(userId, id);
    return { success: true, data, timestamp: Date.now() };
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@CurrentUser('userId') userId: string) {
    const data = await this.notificationsService.markAllAsRead(userId);
    return { success: true, data, timestamp: Date.now() };
  }

  @Delete()
  async clearNotifications(@CurrentUser('userId') userId: string) {
    const data = await this.notificationsService.clearNotifications(userId);
    return { success: true, data, timestamp: Date.now() };
  }
}
