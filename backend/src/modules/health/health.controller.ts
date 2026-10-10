import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';

@Controller('api/v1/health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getLiveness() {
    return {
      status: 'ok',
      service: 'fern-backend',
      version: '1.0.0',
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: Date.now(),
    };
  }

  @Get('ready')
  async getReadiness(@Res() res: Response) {
    const isDbConnected = await this.prisma.isHealthy();
    const status = isDbConnected ? 'ready' : 'degraded';
    const httpStatus = isDbConnected ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(httpStatus).json({
      status,
      database: isDbConnected ? 'connected' : 'disconnected',
      timestamp: Date.now(),
    });
  }

  @Get('metrics')
  async getMetrics() {
    const isDbConnected = await this.prisma.isHealthy();
    const mem = process.memoryUsage();
    return {
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      memory: {
        rssMb: Math.round(mem.rss / (1024 * 1024)),
        heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024)),
      },
      database: {
        healthy: isDbConnected,
      },
      timestamp: Date.now(),
    };
  }
}
