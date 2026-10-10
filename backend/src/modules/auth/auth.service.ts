import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { loadConfig } from '../../config/configuration';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  RequestPasswordResetDto,
  ConfirmPasswordResetDto,
  DeleteAccountDto,
} from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly config = loadConfig();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const normalizedUsername = dto.username.trim();

    // Check unique email and username
    const existingEmail = await this.prisma.fernUser.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const existingUsername = await this.prisma.fernUser.findUnique({
      where: { username: normalizedUsername },
    });
    if (existingUsername) {
      throw new ConflictException('Username is already taken.');
    }

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Create user and related records in transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.fernUser.create({
        data: {
          email: normalizedEmail,
          username: normalizedUsername,
          role: 'USER',
          credential: {
            create: {
              passwordHash,
              passwordAlgo: 'argon2id',
            },
          },
          profile: {
            create: {
              displayName: dto.displayName?.trim() || normalizedUsername,
              avatar: 'avatar_fern_emerald',
              bio: 'Exploring Minecraft with Fern Client. High FPS, clean HUD.',
            },
          },
          privacy: {
            create: {
              allowFriendRequests: true,
              allowProfileDiscovery: true,
              showOnlineStatus: true,
              showPlayingStatus: true,
              showMinecraftVersion: true,
              showInstallationName: false,
              allowProfileViewing: 'friends_only',
              invisibleMode: false,
            },
          },
          presence: {
            create: {
              state: 'offline',
            },
          },
          cloudConfig: {
            create: {
              isEnabled: false,
            },
          },
        },
        include: {
          profile: true,
          privacy: true,
        },
      });

      // Grant starter cosmetics
      const starterCosmetics = await tx.cosmeticDefinition.findMany({
        where: { isStarter: true },
      });

      for (const cosmetic of starterCosmetics) {
        await tx.cosmeticOwnership.create({
          data: {
            userId: newUser.id,
            cosmeticId: cosmetic.id,
          },
        });
      }

      return newUser;
    });

    // Generate email verification token
    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenHash = this.hashToken(rawVerifyToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: verifyTokenHash,
        expiresAt,
      },
    });

    await this.emailService.sendVerificationEmail(user.email, rawVerifyToken);

    await this.auditService.logEvent({
      userId: user.id,
      eventType: 'AUTH_REGISTER',
      severity: 'INFO',
      ipAddress,
      userAgent,
      metadata: { username: user.username, email: user.email },
    });

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      displayName: user.profile?.displayName,
      message: 'Account registered successfully. Please verify your email.',
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const identifier = dto.loginIdentifier.trim();

    const user = await this.prisma.fernUser.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier },
        ],
      },
      include: {
        credential: true,
        profile: true,
        privacy: true,
      },
    });

    if (!user || !user.credential) {
      // Timing-safe dummy hash comparison to prevent timing enumeration
      await argon2.verify(
        '$argon2id$v=19$m=65536,t=3,p=4$UVJhpJlyzKt/YpWB92eK9A$cWAb9oyeAfmcVFvEnbG59ZBh1aTmQbM0b2dIBh3gfFs',
        dto.password,
      );
      await this.auditService.logEvent({
        eventType: 'AUTH_LOGIN_FAILED',
        severity: 'WARN',
        ipAddress,
        userAgent,
        metadata: { identifier, reason: 'user_not_found' },
      });
      throw new UnauthorizedException('Invalid login credentials');
    }

    // Check account lockout
    if (user.credential.lockedUntil && user.credential.lockedUntil > new Date()) {
      const waitMinutes = Math.ceil((user.credential.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Account temporarily locked due to excessive failed attempts. Please retry in ${waitMinutes} minute(s).`,
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been disabled');
    }

    // Verify password
    const isPasswordValid = await argon2.verify(user.credential.passwordHash, dto.password);
    if (!isPasswordValid) {
      const failedAttempts = user.credential.failedLoginAttempts + 1;
      let lockedUntil: Date | null = null;
      if (failedAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
        this.logger.warn(`User ${user.id} (${user.username}) locked out due to 5 consecutive failed logins.`);
      }

      await this.prisma.userCredential.update({
        where: { id: user.credential.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil,
        },
      });

      await this.auditService.logEvent({
        userId: user.id,
        eventType: 'AUTH_LOGIN_FAILED',
        severity: 'SECURITY',
        ipAddress,
        userAgent,
        metadata: { failedAttempts, locked: Boolean(lockedUntil) },
      });

      throw new UnauthorizedException('Invalid login credentials');
    }

    // Reset failed login attempts on successful authentication
    if (user.credential.failedLoginAttempts > 0 || user.credential.lockedUntil) {
      await this.prisma.userCredential.update({
        where: { id: user.credential.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    // Create session
    const rawSessionToken = crypto.randomBytes(32).toString('hex');
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = this.hashToken(rawSessionToken);
    const refreshTokenHash = this.hashToken(rawRefreshToken);

    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        sessionTokenHash,
        refreshTokenHash,
        deviceInfo: dto.deviceInfo || 'Fern Client Desktop',
        ipAddress,
        expiresAt: sessionExpiresAt,
      },
    });

    // Issue JWT bearer token signed with JWT_SECRET
    const accessToken = jwt.sign(
      {
        sub: user.id,
        username: user.username,
        email: user.email,
        sessionId: session.id,
        role: user.role,
      },
      this.config.jwtSecret,
      { expiresIn: this.config.jwtExpiration as any },
    );

    await this.auditService.logEvent({
      userId: user.id,
      eventType: 'AUTH_LOGIN_SUCCESS',
      severity: 'INFO',
      ipAddress,
      userAgent,
      metadata: { sessionId: session.id, deviceInfo: dto.deviceInfo },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresAt: sessionExpiresAt.toISOString(),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        displayName: user.profile?.displayName || user.username,
        avatar: user.profile?.avatar || 'avatar_fern_emerald',
      },
    };
  }

  async logout(sessionId: string, userId: string, ipAddress?: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: { isRevoked: true },
    });

    await this.auditService.logEvent({
      userId,
      eventType: 'AUTH_LOGOUT',
      severity: 'INFO',
      ipAddress,
      metadata: { sessionId },
    });

    return { success: true, message: 'Logged out successfully' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.fernUser.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        privacy: true,
        presence: true,
        cloudConfig: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      profile: user.profile,
      privacy: user.privacy,
      cloudSyncEnabled: user.cloudConfig?.isEnabled || false,
    };
  }

  async listSessions(userId: string, currentSessionId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        lastActiveAt: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return sessions.map((s) => ({
      ...s,
      isCurrent: s.id === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionIdToRevoke: string, ipAddress?: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionIdToRevoke, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found or already terminated');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    await this.auditService.logEvent({
      userId,
      eventType: 'AUTH_SESSION_REVOKED',
      severity: 'INFO',
      ipAddress,
      metadata: { revokedSessionId: sessionIdToRevoke },
    });

    return { success: true, message: 'Session revoked successfully' };
  }

  async revokeAllOtherSessions(userId: string, currentSessionId: string, ipAddress?: string) {
    const res = await this.prisma.session.updateMany({
      where: {
        userId,
        id: { not: currentSessionId },
        isRevoked: false,
      },
      data: { isRevoked: true },
    });

    await this.auditService.logEvent({
      userId,
      eventType: 'AUTH_ALL_SESSIONS_REVOKED',
      severity: 'SECURITY',
      ipAddress,
      metadata: { currentSessionId, count: res.count },
    });

    return { success: true, revokedCount: res.count };
  }

  async verifyEmail(dto: VerifyEmailDto, ipAddress?: string) {
    const tokenHash = this.hashToken(dto.token.trim());

    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.usedAt !== null) {
      throw new BadRequestException('Invalid or already used verification token');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired. Please request a new one.');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.fernUser.update({
        where: { id: tokenRecord.userId },
        data: { isEmailVerified: true },
      }),
    ]);

    await this.auditService.logEvent({
      userId: tokenRecord.userId,
      eventType: 'AUTH_EMAIL_VERIFIED',
      severity: 'INFO',
      ipAddress,
    });

    return { success: true, message: 'Email address verified successfully!' };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto, ipAddress?: string) {
    const identifier = dto.emailOrUsername.trim();

    const user = await this.prisma.fernUser.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier },
        ],
      },
    });

    // Resistance to user enumeration: always return success response
    if (!user) {
      return {
        success: true,
        message: 'If an account with that identifier exists, password reset instructions have been dispatched.',
      };
    }

    // Invalidate existing unused tokens for user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await this.emailService.sendPasswordResetEmail(user.email, rawToken);

    await this.auditService.logEvent({
      userId: user.id,
      eventType: 'AUTH_PASSWORD_RESET_REQUESTED',
      severity: 'INFO',
      ipAddress,
    });

    return {
      success: true,
      message: 'If an account with that identifier exists, password reset instructions have been dispatched.',
    };
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto, ipAddress?: string) {
    const tokenHash = this.hashToken(dto.token.trim());

    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.usedAt !== null) {
      throw new BadRequestException('Invalid or already used password reset token.');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Password reset token has expired. Please request a new one.');
    }

    const newPasswordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.userCredential.update({
        where: { userId: tokenRecord.userId },
        data: {
          passwordHash: newPasswordHash,
          lastPasswordChange: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      // Revoke all existing sessions for security
      this.prisma.session.updateMany({
        where: { userId: tokenRecord.userId, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);

    await this.auditService.logEvent({
      userId: tokenRecord.userId,
      eventType: 'AUTH_PASSWORD_RESET_COMPLETED',
      severity: 'SECURITY',
      ipAddress,
    });

    return { success: true, message: 'Password reset successfully. Please log in with your new password.' };
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto, ipAddress?: string) {
    const user = await this.prisma.fernUser.findUnique({
      where: { id: userId },
      include: { credential: true },
    });

    if (!user || !user.credential) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await argon2.verify(user.credential.passwordHash, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Incorrect password. Account deletion aborted.');
    }

    await this.auditService.logEvent({
      userId,
      eventType: 'AUTH_ACCOUNT_DELETED',
      severity: 'SECURITY',
      ipAddress,
      metadata: { username: user.username },
    });

    await this.prisma.fernUser.delete({
      where: { id: userId },
    });

    return { success: true, message: 'Your Fern account has been permanently deleted.' };
  }
}
