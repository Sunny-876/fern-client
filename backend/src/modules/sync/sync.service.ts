import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { loadConfig } from '../../config/configuration';
import { UploadConfigDto } from './dto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly config = loadConfig();

  // Disallowed sensitive keys
  private readonly SENSITIVE_KEYS = [
    'accesstoken',
    'refreshtoken',
    'password',
    'secret',
    'msa',
    'microsoft',
    'credential',
    'privatekey',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private sanitizeConfig(input: any): any {
    if (input === null || input === undefined) return input;
    if (typeof input !== 'object') {
      if (typeof input === 'string') {
        // Redact local system drive paths or sensitive strings
        if (/^[a-zA-Z]:\\(?:users|windows|appdata)/i.test(input) || /^\/(?:home|etc|var|root)/i.test(input)) {
          return '[REDACTED_LOCAL_PATH]';
        }
      }
      return input;
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizeConfig(item));
    }

    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      const lower = key.toLowerCase();
      if (this.SENSITIVE_KEYS.some((s) => lower.includes(s))) {
        continue; // Drop sensitive keys completely
      }
      clean[key] = this.sanitizeConfig(value);
    }
    return clean;
  }

  async getStatus(userId: string) {
    let cloudConfig = await this.prisma.userCloudConfiguration.findUnique({
      where: { userId },
    });

    if (!cloudConfig) {
      cloudConfig = await this.prisma.userCloudConfiguration.create({
        data: { userId, isEnabled: false },
      });
    }

    let currentRevision = null;
    if (cloudConfig.currentRevisionId) {
      currentRevision = await this.prisma.syncRevision.findUnique({
        where: { id: cloudConfig.currentRevisionId },
        select: {
          id: true,
          revisionNumber: true,
          checksum: true,
          sizeBytes: true,
          clientVersion: true,
          description: true,
          createdAt: true,
        },
      });
    }

    const totalRevisions = await this.prisma.syncRevision.count({
      where: { userId },
    });

    return {
      isEnabled: cloudConfig.isEnabled,
      currentRevisionId: cloudConfig.currentRevisionId,
      currentRevision,
      totalRevisions,
      lastSyncedAt: cloudConfig.updatedAt.getTime(),
    };
  }

  async setEnabled(userId: string, isEnabled: boolean) {
    const updated = await this.prisma.userCloudConfiguration.upsert({
      where: { userId },
      update: { isEnabled },
      create: { userId, isEnabled },
    });

    await this.auditService.logEvent({
      userId,
      eventType: isEnabled ? 'SYNC_ENABLED' : 'SYNC_DISABLED',
      severity: 'INFO',
    });

    return { isEnabled: updated.isEnabled };
  }

  async uploadConfig(userId: string, dto: UploadConfigDto, ipAddress?: string) {
    // Verify cloud sync is enabled for user
    const cloudConfig = await this.prisma.userCloudConfiguration.findUnique({
      where: { userId },
    });

    if (!cloudConfig || !cloudConfig.isEnabled) {
      throw new BadRequestException('Cloud sync is not enabled for this account. Please enable it first.');
    }

    // Sanitize payload
    const sanitized = this.sanitizeConfig(dto.config);
    const serialized = JSON.stringify(sanitized);
    const sizeBytes = Buffer.byteLength(serialized, 'utf8');

    if (sizeBytes > this.config.maxSyncPayloadBytes) {
      throw new BadRequestException(
        `Configuration payload exceeds maximum allowed size (${sizeBytes} bytes > ${this.config.maxSyncPayloadBytes} bytes)`,
      );
    }

    // Conflict detection: if parentRevisionId provided and doesn't match currentRevisionId
    if (
      !dto.force &&
      cloudConfig.currentRevisionId &&
      dto.parentRevisionId &&
      dto.parentRevisionId !== cloudConfig.currentRevisionId
    ) {
      const serverRev = await this.prisma.syncRevision.findUnique({
        where: { id: cloudConfig.currentRevisionId },
      });

      throw new ConflictException({
        message: 'Sync conflict detected: Remote configuration has been updated by another session.',
        code: 'SYNC_CONFLICT',
        serverRevisionId: cloudConfig.currentRevisionId,
        serverRevisionNumber: serverRev?.revisionNumber,
        serverUpdatedAt: serverRev?.createdAt.getTime(),
      });
    }

    // Compute checksum
    const checksum = crypto.createHash('sha256').update(serialized).digest('hex');

    // Get next revision number
    const lastRev = await this.prisma.syncRevision.findFirst({
      where: { userId },
      orderBy: { revisionNumber: 'desc' },
    });
    const nextRevNumber = (lastRev?.revisionNumber || 0) + 1;

    // Create new revision in transaction
    const newRevision = await this.prisma.$transaction(async (tx) => {
      const rev = await tx.syncRevision.create({
        data: {
          userId,
          revisionNumber: nextRevNumber,
          parentRevisionId: cloudConfig.currentRevisionId || null,
          configPayload: serialized,
          checksum,
          sizeBytes,
          clientVersion: dto.clientVersion || '1.0.0',
          description: dto.description || `Revision ${nextRevNumber}`,
        },
      });

      await tx.userCloudConfiguration.update({
        where: { userId },
        data: {
          currentRevisionId: rev.id,
        },
      });

      return rev;
    });

    await this.auditService.logEvent({
      userId,
      eventType: 'SYNC_UPLOAD_SUCCESS',
      severity: 'INFO',
      ipAddress,
      metadata: { revisionId: newRevision.id, revisionNumber: newRevision.revisionNumber, sizeBytes },
    });

    return {
      revisionId: newRevision.id,
      revisionNumber: newRevision.revisionNumber,
      checksum: newRevision.checksum,
      sizeBytes: newRevision.sizeBytes,
      createdAt: newRevision.createdAt.getTime(),
    };
  }

  async downloadConfig(userId: string, revisionId?: string) {
    const cloudConfig = await this.prisma.userCloudConfiguration.findUnique({
      where: { userId },
    });

    if (!cloudConfig || !cloudConfig.isEnabled) {
      throw new BadRequestException('Cloud sync is not enabled for this account.');
    }

    const targetRevId = revisionId || cloudConfig.currentRevisionId;
    if (!targetRevId) {
      throw new NotFoundException('No cloud configuration revisions found.');
    }

    const revision = await this.prisma.syncRevision.findFirst({
      where: { id: targetRevId, userId },
    });

    if (!revision) {
      throw new NotFoundException('Requested configuration revision not found.');
    }

    let parsedConfig = {};
    try {
      parsedConfig = JSON.parse(revision.configPayload);
    } catch {
      parsedConfig = {};
    }

    return {
      revisionId: revision.id,
      revisionNumber: revision.revisionNumber,
      parentRevisionId: revision.parentRevisionId,
      checksum: revision.checksum,
      sizeBytes: revision.sizeBytes,
      clientVersion: revision.clientVersion,
      createdAt: revision.createdAt.getTime(),
      config: parsedConfig,
    };
  }

  async listRevisions(userId: string, limit = 20) {
    const revisions = await this.prisma.syncRevision.findMany({
      where: { userId },
      orderBy: { revisionNumber: 'desc' },
      take: limit,
      select: {
        id: true,
        revisionNumber: true,
        parentRevisionId: true,
        checksum: true,
        sizeBytes: true,
        clientVersion: true,
        description: true,
        createdAt: true,
      },
    });

    return revisions.map((r) => ({
      ...r,
      createdAt: r.createdAt.getTime(),
    }));
  }

  async resetSync(userId: string) {
    await this.prisma.$transaction([
      this.prisma.syncRevision.deleteMany({
        where: { userId },
      }),
      this.prisma.userCloudConfiguration.update({
        where: { userId },
        data: {
          currentRevisionId: null,
          isEnabled: false,
        },
      }),
    ]);

    await this.auditService.logEvent({
      userId,
      eventType: 'SYNC_RESET',
      severity: 'WARN',
    });

    return { success: true, message: 'Cloud configuration reset and disabled.' };
  }
}
