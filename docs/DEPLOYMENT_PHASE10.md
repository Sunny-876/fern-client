# Fern Client — Phase 10 Production Deployment & Operations Guide

## 1. Overview
Fern Client Phase 10 introduces a secure, production-grade cloud backend supporting:
- **Authentication & Security**: Argon2id password hashing, session tokens, brute-force lockout, single-use email verification and password reset tokens, and security audit event logging.
- **Authoritative Cosmetics**: Server-verified cosmetic ownership, catalog management, equipped state, and anti-tamper client injection payloads.
- **Social & Real-Time Presence**: WebSockets (Socket.IO) gateway at `/presence` with authenticated handshakes, heartbeat liveness, disconnect cleanup, and server-enforced privacy filtering (invisible mode, friend-only visibility).
- **Opt-in Cloud Synchronization**: Revision tracking, SHA-256 checksums, conflict detection (409 Conflict), local backups prior to applying remote configs, and strict exclusion of credentials, tokens, or machine paths.
- **Offline-First Resilience**: Desktop client seamlessly operates offline using local cache fallback if the Fern backend is unreachable.

---

## 2. Technology Stack & Directory Structure
- **Backend Framework**: NestJS 11 + Express + WebSockets (Socket.IO) + TypeScript
- **Database ORM**: Prisma 6 + PostgreSQL
- **Password Hashing**: Argon2id (`argon2` package)
- **Token Format**: HMAC-SHA256 JWT with database-backed Session records
- **Desktop Client**: Electron + React 19 + TypeScript + Vite

### Backend Directory Layout:
```
backend/
├── prisma/
│   ├── schema.prisma            # Database schema definitions
│   ├── seed.ts                  # Cosmetic catalog seed script
│   └── migrations/
│       └── 20261010000000_init/
│           └── migration.sql    # PostgreSQL initial migration
├── src/
│   ├── common/                  # Filters, guards, decorators, middleware
│   ├── config/                  # App configuration loader
│   ├── database/                # PrismaService and database module
│   ├── modules/
│   │   ├── audit/               # Security audit logging
│   │   ├── auth/                # Registration, login, sessions, password reset
│   │   ├── cosmetics/           # Authoritative cosmetic catalog & equipping
│   │   ├── email/               # Dev/SMTP verification & reset emails
│   │   ├── friends/             # Social friendship, requests, blocking, discovery
│   │   ├── health/              # Liveness and readiness endpoints
│   │   ├── notifications/       # Social event notifications
│   │   ├── presence/            # Real-time WebSocket gateway and REST endpoints
│   │   ├── profile/             # Profile management & privacy enforcement
│   │   └── sync/                # Cloud configuration sync & conflict handling
│   ├── app.module.ts            # Root NestJS module
│   └── main.ts                  # Application entrypoint & HTTP server
├── .env.example                 # Example environment variables template
├── package.json                 # Backend dependencies & scripts
└── tsconfig.json                # TypeScript compiler configuration
```

---

## 3. Environment Variables

Create `backend/.env` using `backend/.env.example` as a template:

```ini
# Server Port & Environment
PORT=4000
NODE_ENV=production

# PostgreSQL Database Connection URL
DATABASE_URL="postgresql://postgres:YOUR_STRONG_PASSWORD@localhost:5432/fern_client?schema=public"

# JWT Signing Secret (Generate with: openssl rand -base64 48)
JWT_SECRET="YOUR_RANDOM_LONG_SECRET_KEY_AT_LEAST_32_CHARACTERS"
JWT_EXPIRATION="7d"
REFRESH_TOKEN_EXPIRATION="30d"

# Allowed CORS Origins (comma-separated)
CORS_ORIGIN="http://localhost:5173,http://localhost:3000,tauri://localhost,http://localhost:4000"

# Rate Limiting
RATE_LIMIT_TTL_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=100

# Email Delivery (SMTP Settings)
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT=587
SMTP_USER="postmaster@yourdomain.com"
SMTP_PASS="YOUR_SMTP_PASSWORD"
SMTP_FROM="noreply@fernclient.com"
DEV_EMAIL_BYPASS=false

# Cloud Sync Quota Limits
MAX_SYNC_PAYLOAD_BYTES=5242880 # 5 MB max per config payload
PRESENCE_STALE_TIMEOUT_MS=60000 # 60 seconds stale presence timeout
```

> **Security Note**: Never commit actual database passwords or `JWT_SECRET` to version control. In production environments, inject them via container environment variables or secure secret managers.

---

## 4. Local Development & Setup

### Prerequisites:
- Node.js v22 or higher
- PostgreSQL 15+ (or Docker container)

### Setup Steps:
1. **Install backend dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

3. **Run Database Migrations**:
   ```bash
   npx prisma migrate deploy
   ```

4. **Seed Default Cosmetic Catalog**:
   ```bash
   npm run prisma:seed
   ```

5. **Start Backend in Development Mode**:
   ```bash
   npm run start:dev
   # Or from root:
   npm run start:backend
   ```

6. **Start Desktop Client**:
   ```bash
   # From root directory:
   npm run dev
   ```

---

## 5. Production Build & Deployment

### Build Commands:
From the root repository directory:
```bash
# Builds launcher main process, preload script, React UI, and NestJS backend
npm run build
```

### Starting in Production:
```bash
cd backend
npm run start:prod
```

### Docker Deployment Example:
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000
CMD ["npm", "run", "start:prod"]
```

---

## 6. Observability, Health & Readiness

### Health Check (Liveness):
- **Endpoint**: `GET /api/v1/health`
- **Response**:
  ```json
  {
    "status": "ok",
    "service": "fern-backend",
    "version": "1.0.0",
    "uptimeSeconds": 3600,
    "timestamp": 1728518400000
  }
  ```

### Readiness Check:
- **Endpoint**: `GET /api/v1/health/ready`
- **Response (200 OK)**:
  ```json
  {
    "status": "ready",
    "database": "connected",
    "timestamp": 1728518400000
  }
  ```
- **Response (503 Service Unavailable)**:
  ```json
  {
    "status": "degraded",
    "database": "disconnected",
    "timestamp": 1728518400000
  }
  ```

### Request Logging & Telemetry:
All HTTP requests log method, path, response status, duration in milliseconds, and client IP.
Authentication headers, raw passwords, and authorization tokens are redacted.

---

## 7. Database Backups & Recovery

### Automated Backup (pg_dump):
```bash
# Create timestamped SQL dump
pg_dump -U postgres -h localhost -d fern_client -F c -b -v -f "/backups/fern_db_$(date +%Y%m%d_%H%M%S).dump"
```

### Restore Procedure:
```bash
# Restore from backup
pg_restore -U postgres -h localhost -d fern_client -v "/backups/fern_db_20261010_000000.dump"
```

---

## 8. Secret Rotation Strategy

1. **Database Password Rotation**:
   - Update user credentials in PostgreSQL.
   - Update `DATABASE_URL` in environment configuration.
   - Restart backend instances gracefully. Existing active connection pools reconnect automatically.

2. **JWT Secret Rotation**:
   - Update `JWT_SECRET` in environment variables.
   - Any tokens signed with the old secret will fail verification (`TokenExpiredError` or `JsonWebTokenError`), and users will be prompted to re-authenticate cleanly.
   - Session records in `user_sessions` remain intact.

---

## 9. Conflict Resolution in Cloud Sync

When a desktop client uploads settings with a `parentRevisionId` that does not match the server's `currentRevisionId`, the server responds with:
- **Status**: `409 Conflict`
- **Payload**:
  ```json
  {
    "success": false,
    "error": "Sync conflict detected: Remote configuration has been updated by another session.",
    "code": "SYNC_CONFLICT",
    "serverRevisionId": "uuid-here",
    "serverRevisionNumber": 12,
    "serverUpdatedAt": 1728518400000
  }
  ```

### Resolution Options:
- **Keep Local**: Client force-pushes with `force: true`, which overrides the cloud configuration and sets a new revision number.
- **Accept Cloud**: Client pulls the remote configuration. **The launcher automatically creates a local configuration backup before applying the remote configuration**, guaranteeing zero data loss.
