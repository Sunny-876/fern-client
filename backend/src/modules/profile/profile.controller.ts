import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto, UpdatePrivacyDto } from './dto';

@Controller('api/v1/profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getOwnProfile(@CurrentUser('userId') userId: string) {
    const data = await this.profileService.getOwnProfile(userId);
    return { success: true, data, timestamp: Date.now() };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateOwnProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const data = await this.profileService.updateOwnProfile(userId, dto);
    return { success: true, data, timestamp: Date.now() };
  }

  @Get('privacy')
  @UseGuards(JwtAuthGuard)
  async getPrivacy(@CurrentUser('userId') userId: string) {
    const data = await this.profileService.getPrivacySettings(userId);
    return { success: true, data, timestamp: Date.now() };
  }

  @Patch('privacy')
  @UseGuards(JwtAuthGuard)
  async updatePrivacy(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdatePrivacyDto,
  ) {
    const data = await this.profileService.updatePrivacySettings(userId, dto);
    return { success: true, data, timestamp: Date.now() };
  }

  @Get(':idOrUsername')
  @UseGuards(JwtAuthGuard)
  async getPublicProfile(
    @CurrentUser('userId') requesterUserId: string,
    @Param('idOrUsername') idOrUsername: string,
  ) {
    const data = await this.profileService.getPublicProfile(requesterUserId, idOrUsername);
    return { success: true, data, timestamp: Date.now() };
  }
}
