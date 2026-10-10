import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './modules/audit/audit.module';
import { EmailModule } from './modules/email/email.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { FriendsModule } from './modules/friends/friends.module';
import { PresenceModule } from './modules/presence/presence.module';
import { CosmeticsModule } from './modules/cosmetics/cosmetics.module';
import { SyncModule } from './modules/sync/sync.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { RequestLoggerMiddleware } from './common/middleware/logger.middleware';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    EmailModule,
    AuthModule,
    ProfileModule,
    FriendsModule,
    PresenceModule,
    CosmeticsModule,
    SyncModule,
    NotificationsModule,
    HealthModule,
    FeedbackModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
