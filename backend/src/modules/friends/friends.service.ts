import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SendFriendRequestDto, BlockUserDto } from './dto';

@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async searchUsers(requesterUserId: string, query: string, limit = 20) {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    // Find users whose username starts with or contains query, excluding requester
    const users = await this.prisma.fernUser.findMany({
      where: {
        id: { not: requesterUserId },
        isActive: true,
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { profile: { displayName: { contains: q, mode: 'insensitive' } } },
        ],
        privacy: {
          allowProfileDiscovery: true,
        },
      },
      include: {
        profile: true,
        privacy: true,
      },
      take: limit,
    });

    // Check blocking and relationship status for each candidate
    const results = [];
    for (const u of users) {
      // Check if blocked in either direction
      const block = await this.prisma.blockEntry.findFirst({
        where: {
          OR: [
            { blockerId: requesterUserId, blockedId: u.id },
            { blockerId: u.id, blockedId: requesterUserId },
          ],
        },
      });

      if (block) {
        if (block.blockerId === requesterUserId) {
          results.push({
            userId: u.id,
            username: u.username,
            displayName: u.profile?.displayName || u.username,
            avatar: u.profile?.avatar || 'avatar_fern_emerald',
            relationshipStatus: 'blocked' as const,
          });
        }
        // If blocked by them, do not reveal them in search
        continue;
      }

      // Check if already friends
      const friendship = await this.prisma.friend.findFirst({
        where: {
          userId: requesterUserId,
          friendUserId: u.id,
          status: 'accepted',
        },
      });

      if (friendship) {
        results.push({
          userId: u.id,
          username: u.username,
          displayName: u.profile?.displayName || u.username,
          avatar: u.profile?.avatar || 'avatar_fern_emerald',
          relationshipStatus: 'friend' as const,
        });
        continue;
      }

      // Check pending requests
      const pendingOutgoing = await this.prisma.friendRequest.findFirst({
        where: { fromUserId: requesterUserId, toUserId: u.id, status: 'pending' },
      });
      if (pendingOutgoing) {
        results.push({
          userId: u.id,
          username: u.username,
          displayName: u.profile?.displayName || u.username,
          avatar: u.profile?.avatar || 'avatar_fern_emerald',
          relationshipStatus: 'outgoing_request' as const,
        });
        continue;
      }

      const pendingIncoming = await this.prisma.friendRequest.findFirst({
        where: { fromUserId: u.id, toUserId: requesterUserId, status: 'pending' },
      });
      if (pendingIncoming) {
        results.push({
          userId: u.id,
          username: u.username,
          displayName: u.profile?.displayName || u.username,
          avatar: u.profile?.avatar || 'avatar_fern_emerald',
          relationshipStatus: 'incoming_request' as const,
        });
        continue;
      }

      results.push({
        userId: u.id,
        username: u.username,
        displayName: u.profile?.displayName || u.username,
        avatar: u.profile?.avatar || 'avatar_fern_emerald',
        relationshipStatus: 'none' as const,
      });
    }

    return results;
  }

  async sendFriendRequest(requesterUserId: string, dto: SendFriendRequestDto) {
    const target = dto.targetUsernameOrId.trim();

    const targetUser = await this.prisma.fernUser.findFirst({
      where: {
        OR: [{ id: target }, { username: target }],
      },
      include: {
        profile: true,
        privacy: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.id === requesterUserId) {
      throw new BadRequestException('You cannot send a friend request to yourself');
    }

    // Check if blocked
    const block = await this.prisma.blockEntry.findFirst({
      where: {
        OR: [
          { blockerId: requesterUserId, blockedId: targetUser.id },
          { blockerId: targetUser.id, blockedId: requesterUserId },
        ],
      },
    });

    if (block) {
      throw new ForbiddenException('Cannot interact with this user');
    }

    // Check target privacy: allowFriendRequests
    if (targetUser.privacy && !targetUser.privacy.allowFriendRequests) {
      throw new ForbiddenException('This user is not accepting friend requests');
    }

    // Check if already friends
    const existingFriend = await this.prisma.friend.findFirst({
      where: { userId: requesterUserId, friendUserId: targetUser.id },
    });
    if (existingFriend) {
      throw new ConflictException('You are already friends with this user');
    }

    // Check if reverse request exists (auto-accept!)
    const reverseRequest = await this.prisma.friendRequest.findFirst({
      where: {
        fromUserId: targetUser.id,
        toUserId: requesterUserId,
        status: 'pending',
      },
    });

    if (reverseRequest) {
      // Auto-accept friendship!
      return this.acceptFriendRequest(requesterUserId, reverseRequest.id);
    }

    // Check if already pending request
    const existingReq = await this.prisma.friendRequest.findFirst({
      where: {
        fromUserId: requesterUserId,
        toUserId: targetUser.id,
        status: 'pending',
      },
    });

    if (existingReq) {
      throw new ConflictException('Friend request is already pending');
    }

    // Fetch requester profile for notification
    const requester = await this.prisma.fernUser.findUnique({
      where: { id: requesterUserId },
      include: { profile: true },
    });

    const request = await this.prisma.friendRequest.create({
      data: {
        fromUserId: requesterUserId,
        toUserId: targetUser.id,
        status: 'pending',
      },
      include: {
        fromUser: { include: { profile: true } },
        toUser: { include: { profile: true } },
      },
    });

    // Create notification for target user
    await this.prisma.notification.create({
      data: {
        userId: targetUser.id,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `@${requester?.username} sent you a friend request.`,
        metadata: JSON.stringify({ requestId: request.id, fromUserId: requesterUserId }),
      },
    });

    return {
      id: request.id,
      fromUserId: request.fromUserId,
      toUserId: request.toUserId,
      fromUsername: request.fromUser.username,
      fromDisplayName: request.fromUser.profile?.displayName || request.fromUser.username,
      fromAvatar: request.fromUser.profile?.avatar || 'avatar_fern_emerald',
      toUsername: request.toUser.username,
      timestamp: request.createdAt.getTime(),
      direction: 'outgoing',
      status: request.status,
    };
  }

  async acceptFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
      include: {
        fromUser: { include: { profile: true } },
        toUser: { include: { profile: true } },
      },
    });

    if (!request || request.status !== 'pending') {
      throw new NotFoundException('Friend request not found or already handled');
    }

    // Must be the recipient to accept
    if (request.toUserId !== userId) {
      throw new ForbiddenException('You do not have permission to accept this request');
    }

    // In transaction: mark request accepted, create bidirectional friendship
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.friendRequest.update({
        where: { id: request.id },
        data: { status: 'accepted' },
      });

      // Insert both directions
      await tx.friend.upsert({
        where: { userId_friendUserId: { userId: request.fromUserId, friendUserId: request.toUserId } },
        update: { status: 'accepted', since: new Date() },
        create: { userId: request.fromUserId, friendUserId: request.toUserId, status: 'accepted' },
      });

      await tx.friend.upsert({
        where: { userId_friendUserId: { userId: request.toUserId, friendUserId: request.fromUserId } },
        update: { status: 'accepted', since: new Date() },
        create: { userId: request.toUserId, friendUserId: request.fromUserId, status: 'accepted' },
      });

      // Create notification for requester
      await tx.notification.create({
        data: {
          userId: request.fromUserId,
          type: 'friend_accepted',
          title: 'Friend Request Accepted',
          message: `@${request.toUser.username} accepted your friend request!`,
          metadata: JSON.stringify({ friendUserId: request.toUserId }),
        },
      });

      return request;
    });

    return {
      id: result.id,
      friendUserId: result.fromUserId,
      username: result.fromUser.username,
      displayName: result.fromUser.profile?.displayName || result.fromUser.username,
      avatar: result.fromUser.profile?.avatar || 'avatar_fern_emerald',
      status: 'accepted',
      since: Date.now(),
    };
  }

  async declineFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.status !== 'pending') {
      throw new NotFoundException('Friend request not found');
    }

    if (request.toUserId !== userId) {
      throw new ForbiddenException('You do not have permission to decline this request');
    }

    await this.prisma.friendRequest.update({
      where: { id: request.id },
      data: { status: 'declined' },
    });

    return { success: true };
  }

  async cancelFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.status !== 'pending') {
      throw new NotFoundException('Friend request not found');
    }

    if (request.fromUserId !== userId) {
      throw new ForbiddenException('You can only cancel your own outgoing requests');
    }

    await this.prisma.friendRequest.update({
      where: { id: request.id },
      data: { status: 'cancelled' },
    });

    return { success: true };
  }

  async listFriends(userId: string) {
    const friendships = await this.prisma.friend.findMany({
      where: { userId, status: 'accepted' },
      include: {
        friend: {
          include: {
            profile: true,
            privacy: true,
            presence: true,
          },
        },
      },
    });

    return friendships.map((f) => {
      const u = f.friend;
      const privacy = u.privacy;

      let presenceState = 'offline';
      let mcVer: string | undefined = undefined;
      let instName: string | undefined = undefined;

      if (u.presence && !privacy?.invisibleMode && privacy?.showOnlineStatus) {
        presenceState = u.presence.state;
        if (privacy.showPlayingStatus && u.presence.state === 'playing_minecraft') {
          if (privacy.showMinecraftVersion) mcVer = u.presence.minecraftVersion || undefined;
          if (privacy.showInstallationName) instName = u.presence.installationName || undefined;
        }
      }

      return {
        id: f.id,
        friendUserId: u.id,
        username: u.username,
        displayName: u.profile?.displayName || u.username,
        avatar: u.profile?.avatar || 'avatar_fern_emerald',
        status: f.status,
        since: f.since.getTime(),
        presence: {
          userId: u.id,
          state: presenceState,
          minecraftVersion: mcVer,
          installationName: instName,
          lastSeen: u.presence?.lastSeen ? u.presence.lastSeen.getTime() : Date.now(),
        },
      };
    });
  }

  async removeFriend(userId: string, friendUserId: string) {
    await this.prisma.$transaction([
      this.prisma.friend.deleteMany({
        where: {
          OR: [
            { userId, friendUserId },
            { userId: friendUserId, friendUserId: userId },
          ],
        },
      }),
      this.prisma.friendRequest.updateMany({
        where: {
          OR: [
            { fromUserId: userId, toUserId: friendUserId, status: 'accepted' },
            { fromUserId: friendUserId, toUserId: userId, status: 'accepted' },
          ],
        },
        data: { status: 'cancelled' },
      }),
    ]);

    return { success: true };
  }

  async listRequests(userId: string) {
    const incoming = await this.prisma.friendRequest.findMany({
      where: { toUserId: userId, status: 'pending' },
      include: {
        fromUser: { include: { profile: true } },
        toUser: { include: { profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const outgoing = await this.prisma.friendRequest.findMany({
      where: { fromUserId: userId, status: 'pending' },
      include: {
        fromUser: { include: { profile: true } },
        toUser: { include: { profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatReq = (r: any, direction: 'incoming' | 'outgoing') => ({
      id: r.id,
      fromUserId: r.fromUserId,
      toUserId: r.toUserId,
      fromUsername: r.fromUser.username,
      fromDisplayName: r.fromUser.profile?.displayName || r.fromUser.username,
      fromAvatar: r.fromUser.profile?.avatar || 'avatar_fern_emerald',
      toUsername: r.toUser.username,
      timestamp: r.createdAt.getTime(),
      direction,
      status: r.status,
    });

    return [
      ...incoming.map((r) => formatReq(r, 'incoming')),
      ...outgoing.map((r) => formatReq(r, 'outgoing')),
    ];
  }

  async blockUser(userId: string, targetUserId: string, dto: BlockUserDto) {
    if (userId === targetUserId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const targetUser = await this.prisma.fernUser.findUnique({
      where: { id: targetUserId },
      include: { profile: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.$transaction([
      // Create block entry
      this.prisma.blockEntry.upsert({
        where: { blockerId_blockedId: { blockerId: userId, blockedId: targetUserId } },
        update: { reason: dto.reason },
        create: { blockerId: userId, blockedId: targetUserId, reason: dto.reason },
      }),
      // Remove any friendship
      this.prisma.friend.deleteMany({
        where: {
          OR: [
            { userId, friendUserId: targetUserId },
            { userId: targetUserId, friendUserId: userId },
          ],
        },
      }),
      // Cancel any friend requests
      this.prisma.friendRequest.updateMany({
        where: {
          OR: [
            { fromUserId: userId, toUserId: targetUserId },
            { fromUserId: targetUserId, toUserId: userId },
          ],
          status: 'pending',
        },
        data: { status: 'cancelled' },
      }),
    ]);

    return {
      blockedUserId: targetUser.id,
      username: targetUser.username,
      displayName: targetUser.profile?.displayName || targetUser.username,
      blockedAt: Date.now(),
      reason: dto.reason,
    };
  }

  async unblockUser(userId: string, targetUserId: string) {
    await this.prisma.blockEntry.deleteMany({
      where: { blockerId: userId, blockedId: targetUserId },
    });

    return { success: true };
  }

  async listBlocked(userId: string) {
    const blocks = await this.prisma.blockEntry.findMany({
      where: { blockerId: userId },
      include: {
        blocked: { include: { profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return blocks.map((b) => ({
      blockedUserId: b.blocked.id,
      username: b.blocked.username,
      displayName: b.blocked.profile?.displayName || b.blocked.username,
      blockedAt: b.createdAt.getTime(),
      reason: b.reason || undefined,
    }));
  }
}
