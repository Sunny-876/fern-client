import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SendFriendRequestDto, BlockUserDto } from './dto';

@Controller('api/v1/friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  async listFriends(@CurrentUser('userId') userId: string) {
    const data = await this.friendsService.listFriends(userId);
    return { success: true, data, timestamp: Date.now() };
  }

  @Get('search')
  async searchUsers(
    @CurrentUser('userId') userId: string,
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const data = await this.friendsService.searchUsers(userId, query || '', parsedLimit);
    return { success: true, data, timestamp: Date.now() };
  }

  @Get('requests')
  async listRequests(@CurrentUser('userId') userId: string) {
    const data = await this.friendsService.listRequests(userId);
    return { success: true, data, timestamp: Date.now() };
  }

  @Post('requests')
  async sendFriendRequest(
    @CurrentUser('userId') userId: string,
    @Body() dto: SendFriendRequestDto,
  ) {
    const data = await this.friendsService.sendFriendRequest(userId, dto);
    return { success: true, data, timestamp: Date.now() };
  }

  @Post('requests/:id/accept')
  @HttpCode(HttpStatus.OK)
  async acceptRequest(
    @CurrentUser('userId') userId: string,
    @Param('id') requestId: string,
  ) {
    const data = await this.friendsService.acceptFriendRequest(userId, requestId);
    return { success: true, data, timestamp: Date.now() };
  }

  @Post('requests/:id/decline')
  @HttpCode(HttpStatus.OK)
  async declineRequest(
    @CurrentUser('userId') userId: string,
    @Param('id') requestId: string,
  ) {
    await this.friendsService.declineFriendRequest(userId, requestId);
    return { success: true, timestamp: Date.now() };
  }

  @Delete('requests/:id')
  async cancelRequest(
    @CurrentUser('userId') userId: string,
    @Param('id') requestId: string,
  ) {
    await this.friendsService.cancelFriendRequest(userId, requestId);
    return { success: true, timestamp: Date.now() };
  }

  @Delete(':friendUserId')
  async removeFriend(
    @CurrentUser('userId') userId: string,
    @Param('friendUserId') friendUserId: string,
  ) {
    await this.friendsService.removeFriend(userId, friendUserId);
    return { success: true, timestamp: Date.now() };
  }

  @Get('blocked')
  async listBlocked(@CurrentUser('userId') userId: string) {
    const data = await this.friendsService.listBlocked(userId);
    return { success: true, data, timestamp: Date.now() };
  }

  @Post('block/:targetUserId')
  async blockUser(
    @CurrentUser('userId') userId: string,
    @Param('targetUserId') targetUserId: string,
    @Body() dto: BlockUserDto,
  ) {
    const data = await this.friendsService.blockUser(userId, targetUserId, dto);
    return { success: true, data, timestamp: Date.now() };
  }

  @Delete('block/:targetUserId')
  async unblockUser(
    @CurrentUser('userId') userId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    await this.friendsService.unblockUser(userId, targetUserId);
    return { success: true, timestamp: Date.now() };
  }
}
