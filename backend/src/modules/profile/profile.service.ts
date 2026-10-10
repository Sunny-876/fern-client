import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateProfileDto, UpdatePrivacyDto } from './dto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOwnProfile(userId: string) {
    const user = await this.prisma.fernUser.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        privacy: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    let badges: string[] = [];
    try {
      badges = JSON.parse(user.profile?.badgesJson || '[]');
    } catch {
      badges = [];
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.profile?.displayName || user.username,
      avatar: user.profile?.avatar || 'avatar_fern_emerald',
      bio: user.profile?.bio,
      createdAt: user.createdAt.getTime(),
      lastActive: user.updatedAt.getTime(),
      favoriteMinecraftVersion: user.profile?.favoriteMinecraftVersion,
      favoriteInstallation: user.profile?.favoriteInstallation,
      profileVisibility: user.privacy?.allowProfileViewing || 'friends_only',
      onlineStatusVisibility: user.privacy?.showOnlineStatus ? 'friends_only' : 'private',
      playingStatusVisibility: user.privacy?.showPlayingStatus ? 'friends_only' : 'private',
      badges,
    };
  }

  async updateOwnProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.fernUser.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        displayName: dto.displayName !== undefined ? dto.displayName.trim() : undefined,
        avatar: dto.avatar !== undefined ? dto.avatar : undefined,
        bio: dto.bio !== undefined ? dto.bio.trim() : undefined,
        favoriteMinecraftVersion: dto.favoriteMinecraftVersion !== undefined ? dto.favoriteMinecraftVersion : undefined,
        favoriteInstallation: dto.favoriteInstallation !== undefined ? dto.favoriteInstallation : undefined,
      },
      create: {
        userId,
        displayName: dto.displayName?.trim() || user.username,
        avatar: dto.avatar || 'avatar_fern_emerald',
        bio: dto.bio?.trim(),
        favoriteMinecraftVersion: dto.favoriteMinecraftVersion,
        favoriteInstallation: dto.favoriteInstallation,
      },
    });

    return this.getOwnProfile(userId);
  }

  async getPublicProfile(requesterUserId: string, targetIdOrUsername: string) {
    const targetUser = await this.prisma.fernUser.findFirst({
      where: {
        OR: [
          { id: targetIdOrUsername },
          { username: targetIdOrUsername },
        ],
      },
      include: {
        profile: true,
        privacy: true,
        presence: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check if requester is blocked by target or target is blocked by requester
    const block = await this.prisma.blockEntry.findFirst({
      where: {
        OR: [
          { blockerId: targetUser.id, blockedId: requesterUserId },
          { blockerId: requesterUserId, blockedId: targetUser.id },
        ],
      },
    });

    if (block) {
      throw new ForbiddenException('You cannot view this profile.');
    }

    // Check privacy rules
    const isSelf = targetUser.id === requesterUserId;
    const privacy = targetUser.privacy;

    if (!isSelf && privacy) {
      if (privacy.allowProfileViewing === 'nobody') {
        throw new ForbiddenException('This user profile is private.');
      }

      if (privacy.allowProfileViewing === 'friends_only') {
        const isFriend = await this.prisma.friend.findFirst({
          where: {
            userId: requesterUserId,
            friendUserId: targetUser.id,
            status: 'accepted',
          },
        });

        if (!isFriend) {
          throw new ForbiddenException('This profile is restricted to friends only.');
        }
      }
    }

    // Filter presence according to privacy settings
    let presenceState = 'offline';
    let mcVer: string | undefined = undefined;
    let instName: string | undefined = undefined;

    if (targetUser.presence && !privacy?.invisibleMode && privacy?.showOnlineStatus) {
      presenceState = targetUser.presence.state;
      if (privacy.showPlayingStatus && targetUser.presence.state === 'playing_minecraft') {
        if (privacy.showMinecraftVersion) mcVer = targetUser.presence.minecraftVersion || undefined;
        if (privacy.showInstallationName) instName = targetUser.presence.installationName || undefined;
      }
    }

    let badges: string[] = [];
    try {
      badges = JSON.parse(targetUser.profile?.badgesJson || '[]');
    } catch {
      badges = [];
    }

    return {
      id: targetUser.id,
      username: targetUser.username,
      displayName: targetUser.profile?.displayName || targetUser.username,
      avatar: targetUser.profile?.avatar || 'avatar_fern_emerald',
      bio: targetUser.profile?.bio,
      createdAt: targetUser.createdAt.getTime(),
      lastActive: targetUser.updatedAt.getTime(),
      favoriteMinecraftVersion: privacy?.showMinecraftVersion ? targetUser.profile?.favoriteMinecraftVersion : undefined,
      badges,
      presence: {
        state: presenceState,
        minecraftVersion: mcVer,
        installationName: instName,
      },
    };
  }

  async getPrivacySettings(userId: string) {
    let privacy = await this.prisma.privacySettings.findUnique({
      where: { userId },
    });

    if (!privacy) {
      privacy = await this.prisma.privacySettings.create({
        data: { userId },
      });
    }

    return {
      allowFriendRequests: privacy.allowFriendRequests,
      allowProfileDiscovery: privacy.allowProfileDiscovery,
      showOnlineStatus: privacy.showOnlineStatus,
      showPlayingStatus: privacy.showPlayingStatus,
      showMinecraftVersion: privacy.showMinecraftVersion,
      showInstallationName: privacy.showInstallationName,
      allowProfileViewing: privacy.allowProfileViewing as 'everyone' | 'friends_only' | 'nobody',
      invisibleMode: privacy.invisibleMode,
    };
  }

  async updatePrivacySettings(userId: string, dto: UpdatePrivacyDto) {
    const updated = await this.prisma.privacySettings.upsert({
      where: { userId },
      update: {
        ...dto,
      },
      create: {
        userId,
        ...dto,
      },
    });

    return {
      allowFriendRequests: updated.allowFriendRequests,
      allowProfileDiscovery: updated.allowProfileDiscovery,
      showOnlineStatus: updated.showOnlineStatus,
      showPlayingStatus: updated.showPlayingStatus,
      showMinecraftVersion: updated.showMinecraftVersion,
      showInstallationName: updated.showInstallationName,
      allowProfileViewing: updated.allowProfileViewing as 'everyone' | 'friends_only' | 'nobody',
      invisibleMode: updated.invisibleMode,
    };
  }
}
