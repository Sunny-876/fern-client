import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadConfigDto } from './dto';

@Controller('api/v1/sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('status')
  async getStatus(@CurrentUser('userId') userId: string) {
    const data = await this.syncService.getStatus(userId);
    return { success: true, data, timestamp: Date.now() };
  }

  @Post('enable')
  @HttpCode(HttpStatus.OK)
  async enable(@CurrentUser('userId') userId: string) {
    const data = await this.syncService.setEnabled(userId, true);
    return { success: true, data, timestamp: Date.now() };
  }

  @Post('disable')
  @HttpCode(HttpStatus.OK)
  async disable(@CurrentUser('userId') userId: string) {
    const data = await this.syncService.setEnabled(userId, false);
    return { success: true, data, timestamp: Date.now() };
  }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  async upload(
    @CurrentUser('userId') userId: string,
    @Body() dto: UploadConfigDto,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const data = await this.syncService.uploadConfig(userId, dto, ip);
    return { success: true, data, timestamp: Date.now() };
  }

  @Get('download')
  async download(
    @CurrentUser('userId') userId: string,
    @Query('revisionId') revisionId?: string,
  ) {
    const data = await this.syncService.downloadConfig(userId, revisionId);
    return { success: true, data, timestamp: Date.now() };
  }

  @Get('revisions')
  async listRevisions(
    @CurrentUser('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const data = await this.syncService.listRevisions(userId, parsedLimit);
    return { success: true, data, timestamp: Date.now() };
  }

  @Delete('reset')
  async resetSync(@CurrentUser('userId') userId: string) {
    const data = await this.syncService.resetSync(userId);
    return { success: true, data, timestamp: Date.now() };
  }
}
