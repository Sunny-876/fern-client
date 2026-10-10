import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../database/prisma.service';
import { loadConfig } from '../../config/configuration';

export interface TokenClaims {
  sub: string; // userId
  username: string;
  email: string;
  sessionId: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly config = loadConfig();

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Authorization header is required');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('Invalid Authorization format. Expected: Bearer <token>');
    }

    const token = parts[1];
    let decoded: TokenClaims;
    try {
      decoded = jwt.verify(token, this.config.jwtSecret) as TokenClaims;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Session expired. Please log in again.');
      }
      throw new UnauthorizedException('Invalid or malformed authentication token');
    }

    // Verify session state in database
    const session = await this.prisma.session.findUnique({
      where: { id: decoded.sessionId },
      include: { user: true },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session has been revoked or expired');
    }

    if (!session.user || !session.user.isActive) {
      throw new UnauthorizedException('User account is disabled or deactivated');
    }

    // Update last active timestamp asynchronously (non-blocking)
    this.prisma.session
      .update({
        where: { id: session.id },
        data: { lastActiveAt: new Date() },
      })
      .catch((e) => this.logger.warn(`Failed to update session active timestamp: ${e.message}`));

    request.user = {
      userId: session.user.id,
      username: session.user.username,
      email: session.user.email,
      sessionId: session.id,
      role: session.user.role,
    };

    return true;
  }
}
