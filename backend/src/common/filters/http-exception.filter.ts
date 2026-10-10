import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error occurred';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const anyRes = res as any;
        message = Array.isArray(anyRes.message) ? anyRes.message.join('; ') : anyRes.message || message;
        code = anyRes.error || code;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error at ${request.method} ${request.url}:`, exception.stack);
      // In production, mask raw database or node errors
      if (process.env.NODE_ENV !== 'production') {
        message = exception.message;
      }
    }

    response.status(status).json({
      success: false,
      error: message,
      code,
      statusCode: status,
      timestamp: Date.now(),
      path: request.url,
    });
  }
}
