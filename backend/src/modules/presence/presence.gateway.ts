import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { PresenceService } from './presence.service';
import { PrismaService } from '../../database/prisma.service';
import { loadConfig } from '../../config/configuration';
import { UpdatePresenceDto } from './dto';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'presence',
})
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PresenceGateway.name);
  private readonly config = loadConfig();

  constructor(
    private readonly presenceService: PresenceService,
    private readonly prisma: PrismaService,
  ) {}

  private authenticateSocket(client: Socket): { userId: string; username: string } | null {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers['authorization']?.replace(/^Bearer /i, '');

      if (!token) return null;

      const decoded = jwt.verify(token, this.config.jwtSecret) as any;
      return { userId: decoded.sub, username: decoded.username };
    } catch {
      return null;
    }
  }

  async handleConnection(client: Socket) {
    const auth = this.authenticateSocket(client);
    if (!auth) {
      this.logger.warn(`Unauthenticated socket connection rejected: ${client.id}`);
      client.disconnect(true);
      return;
    }

    client.data.user = auth;
    this.presenceService.addSocket(auth.userId, client.id);

    // Join user specific room
    client.join(`user:${auth.userId}`);

    this.logger.log(`Socket connected: ${client.id} (User: ${auth.username})`);

    // Set default in_launcher state upon connection
    const published = await this.presenceService.updatePresence(
      auth.userId,
      { state: 'in_launcher' },
      client.id,
    );

    // Broadcast to friends
    await this.broadcastPresenceToFriends(auth.userId, published);
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (!user) return;

    const becameOffline = this.presenceService.removeSocket(user.userId, client.id);
    this.logger.log(`Socket disconnected: ${client.id} (User: ${user.username})`);

    if (becameOffline) {
      await this.presenceService.setOffline(user.userId);
      await this.broadcastPresenceToFriends(user.userId, {
        userId: user.userId,
        state: 'offline',
        lastSeen: Date.now(),
      });
    }
  }

  @SubscribeMessage('presence:update')
  async handlePresenceUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: UpdatePresenceDto,
  ) {
    const user = client.data.user;
    if (!user) return;

    const published = await this.presenceService.updatePresence(user.userId, dto, client.id);
    await this.broadcastPresenceToFriends(user.userId, published);

    return { success: true, presence: published };
  }

  @SubscribeMessage('presence:heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    if (!user) return;

    await this.presenceService.heartbeat(user.userId);
    return { success: true, timestamp: Date.now() };
  }

  private async broadcastPresenceToFriends(userId: string, presence: any) {
    try {
      const friends = await this.prisma.friend.findMany({
        where: { userId, status: 'accepted' },
        select: { friendUserId: true },
      });

      for (const f of friends) {
        this.server.to(`user:${f.friendUserId}`).emit('presence:friend_update', presence);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to broadcast presence update: ${err.message}`);
    }
  }
}
