import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type AuditSeverity = 'INFO' | 'WARN' | 'SECURITY';

export interface RecordAuditEventParams {
  userId?: string;
  eventType: string;
  severity?: AuditSeverity;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logEvent(params: RecordAuditEventParams): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          userId: params.userId,
          eventType: params.eventType,
          severity: params.severity || 'INFO',
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to persist audit event ${params.eventType}: ${err.message}`);
    }
  }
}
