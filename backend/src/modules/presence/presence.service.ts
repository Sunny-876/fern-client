import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdatePresenceDto } from './dto';

export interface PublishedPresence {
  userId: string;
  state: 'offline' | 'online' | 'in_launcher' | 'playing_minecraft' | 'invisible';
  minecraftVersion?: string;
  installationName?: string;
  lastSeen: number;
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  // Active socket connections: userId -> Set of socket IDs
  private readonly activeSockets = new Map<string, Set<string>>();

  constructor(private readonly prisma: PrismaService) {}

  addSocket(userId: string, socketId: string) {
    if (!this.activeSockets.has(userId)) {
      this.activeSockets.set(userId, new Set());
    }
    this.activeSockets.get(userId)!.add(socketId);
  }

  removeSocket(userId: string, socketId: string): boolean {
    const set = this.activeSockets.get(userId);
    if (set) {
      set.delete(socketId);
      if (set.size === 0) {
        this.activeSockets.delete(userId);
        return true; // user has no more active socket connections
      }
    }
    return false;
  }

  isUserConnected(userId: string): boolean {
    return (this.activeSockets.get(userId)?.size || 0) > 0;
  }

  async updatePresence(userId: string, dto: UpdatePresenceDto, socketId?: string): Promise<PublishedPresence> {
    const user = await this.prisma.fernUser.findUnique({
      where: { id: userId },
      include: { privacy: true },
    });

    if (!user) {
      return {
        userId,
        state: 'offline',
        lastSeen: Date.now(),
      };
    }

    // Persist raw presence in database
    await this.prisma.presence.upsert({
      where: { userId },
      update: {
        state: dto.state,
        minecraftVersion: dto.minecraftVersion || null,
        installationName: dto.installationName || null,
        socketId: socketId || null,
        lastSeen: new Date(),
      },
      create: {
        userId,
        state: dto.state,
        minecraftVersion: dto.minecraftVersion || null,
        installationName: dto.installationName || null,
        socketId: socketId || null,
        lastSeen: new Date(),
      },
    });

    return this.getPublishedPresenceForUser(userId);
  }

  async setOffline(userId: string) {
    await this.prisma.presence.updateMany({
      where: { userId },
      data: {
        state: 'offline',
        socketId: null,
        lastSeen: new Date(),
      },
    });
  }

  async getPublishedPresenceForUser(targetUserId: string): Promise<PublishedPresence> {
    const user = await this.prisma.fernUser.findUnique({
      where: { id: targetUserId },
      include: {
        privacy: true,
        presence: true,
      },
    });

    if (!user || !user.presence) {
      return {
        userId: targetUserId,
        state: 'offline',
        lastSeen: Date.now(),
      };
    }

    const privacy = user.privacy;
    const rawPresence = user.presence;

    // Check invisibleMode & showOnlineStatus
    if (privacy?.invisibleMode || !privacy?.showOnlineStatus || rawPresence.state === 'invisible') {
      return {
        userId: targetUserId,
        state: 'offline',
        lastSeen: rawPresence.lastSeen.getTime(),
      };
    }

    let state = rawPresence.state as any;
    let mcVer: string | undefined = undefined;
    let instName: string | undefined = undefined;

    if (state === 'playing_minecraft') {
      if (!privacy?.showPlayingStatus) {
        state = 'online';
      } else {
        if (privacy?.showMinecraftVersion) mcVer = rawPresence.minecraftVersion || undefined;
        if (privacy?.showInstallationName) instName = rawPresence.installationName || undefined;
      }
    }

    return {
      userId: targetUserId,
      state,
      minecraftVersion: mcVer,
      installationName: instName,
      lastSeen: rawPresence.lastSeen.getTime(),
    };
  }

  async getFriendsPresence(userId: string): Promise<Record<string, PublishedPresence>> {
    const friendships = await this.prisma.friend.findMany({
      where: { userId, status: 'accepted' },
      select: { friendUserId: true },
    });

    const results: Record<string, PublishedPresence> = {};
    for (const f of friendships) {
      results[f.friendUserId] = await this.getPublishedPresenceForUser(f.friendUserId);
    }

    return results;
  }

  async heartbeat(userId: string) {
    await this.prisma.presence.updateMany({
      where: { userId },
      data: { lastSeen: new Date() },
    });
  }
}
