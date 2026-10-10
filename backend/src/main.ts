import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { loadConfig } from './config/configuration';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const config = loadConfig();

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Security headers
  app.use(helmet());

  // Request size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // CORS restricted to allowed origins
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || config.corsOrigins.includes(origin) || config.corsOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  });

  // Global filters & validation
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Enable graceful shutdown
  app.enableShutdownHooks();

  await app.listen(config.port);
  logger.log(`Fern Backend server operational on port ${config.port} (${config.nodeEnv})`);
}

bootstrap().catch((err) => {
  console.error('Fatal error during backend startup:', err);
  process.exit(1);
});
