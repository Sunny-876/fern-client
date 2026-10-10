export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiration: string;
  refreshTokenExpiration: string;
  corsOrigins: string[];
  rateLimitTtl: number;
  rateLimitMax: number;
  devEmailBypass: boolean;
  maxSyncPayloadBytes: number;
  presenceStaleTimeoutMs: number;
}

export const loadConfig = (): AppConfig => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/fern_client?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'fern_client_jwt_super_secret_signing_key_at_least_32_chars_long',
  jwtExpiration: process.env.JWT_EXPIRATION || '7d',
  refreshTokenExpiration: process.env.REFRESH_TOKEN_EXPIRATION || '30d',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000,tauri://localhost,http://localhost:4000').split(',').map((s) => s.trim()),
  rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL_SECONDS || '60', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  devEmailBypass: process.env.DEV_EMAIL_BYPASS !== 'false',
  maxSyncPayloadBytes: parseInt(process.env.MAX_SYNC_PAYLOAD_BYTES || '5242880', 10),
  presenceStaleTimeoutMs: parseInt(process.env.PRESENCE_STALE_TIMEOUT_MS || '60000', 10),
});
