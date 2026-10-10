import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface FeedbackSubmissionResult {
  success: boolean;
  referenceId: string;
  message: string;
  createdAt: string;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  public async submitFeedback(
    dto: CreateFeedbackDto,
    userId?: string,
    ipAddress?: string
  ): Promise<FeedbackSubmissionResult> {
    const referenceId = `FB-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const timestamp = new Date().toISOString();

    this.logger.log(
      `Received feedback [${referenceId}] category=${dto.category} title="${dto.title}" user=${userId || 'anonymous'}`
    );

    // Record audit event for diagnostic tracking
    try {
      await this.auditService.logEvent({
        userId: userId || undefined,
        eventType: 'FEEDBACK_SUBMITTED',
        severity: 'INFO',
        ipAddress: ipAddress || '127.0.0.1',
        metadata: {
          referenceId,
          category: dto.category,
          title: dto.title,
          clientVersion: dto.clientVersion,
          channel: dto.channel || 'stable',
          hasDiagnostics: Boolean(dto.diagnosticReport),
        },
      });
    } catch (err) {
      this.logger.warn(`Could not log feedback audit event: ${err}`);
    }

    return {
      success: true,
      referenceId,
      message: 'Feedback submitted successfully. Thank you for helping improve Fern Client!',
      createdAt: timestamp,
    };
  }
}
