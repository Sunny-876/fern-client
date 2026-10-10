import { Controller, Post, Body, Req, UseGuards, Optional } from '@nestjs/common';
import { Request } from 'express';
import { FeedbackService, FeedbackSubmissionResult } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async submitFeedback(
    @Body() dto: CreateFeedbackDto,
    @Req() req: Request
  ): Promise<FeedbackSubmissionResult> {
    const ip = req.ip || req.socket.remoteAddress;
    const userId = (req as any).user?.userId;
    return this.feedbackService.submitFeedback(dto, userId, ip);
  }
}
