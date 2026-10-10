import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PresenceService } from './presence.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdatePresenceDto } from './dto';

@Controller('api/v1/presence')
@UseGuards(JwtAuthGuard)
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Get('me')
  async getMyPresence(@CurrentUser('userId') userId: string) {
    const data = await this.presenceService.getPublishedPresenceForUser(userId);
    return { success: true, data, timestamp: Date.now() };
  }

  @Get('friends')
  async getFriendsPresence(@CurrentUser('userId') userId: string) {
    const data = await this.presenceService.getFriendsPresence(userId);
    return { success: true, data, timestamp: Date.now() };
  }

  @Get(':userId')
  async getUserPresence(@Param('userId') targetUserId: string) {
    const data = await this.presenceService.getPublishedPresenceForUser(targetUserId);
    return { success: true, data, timestamp: Date.now() };
  }

  @Post('update')
  @HttpCode(HttpStatus.OK)
  async updatePresence(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdatePresenceDto,
  ) {
    const data = await this.presenceService.updatePresence(userId, dto);
    return { success: true, data, timestamp: Date.now() };
  }

  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  async heartbeat(@CurrentUser('userId') userId: string) {
    await this.presenceService.heartbeat(userId);
    return { success: true, timestamp: Date.now() };
  }
}
