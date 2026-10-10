-- CreateTable
CREATE TABLE "fern_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fern_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordAlgo" TEXT NOT NULL DEFAULT 'argon2id',
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastPasswordChange" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "refreshTokenHash" TEXT,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT 'avatar_fern_emerald',
    "bio" TEXT,
    "favoriteMinecraftVersion" TEXT,
    "favoriteInstallation" TEXT,
    "badgesJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privacy_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "allowFriendRequests" BOOLEAN NOT NULL DEFAULT true,
    "allowProfileDiscovery" BOOLEAN NOT NULL DEFAULT true,
    "showOnlineStatus" BOOLEAN NOT NULL DEFAULT true,
    "showPlayingStatus" BOOLEAN NOT NULL DEFAULT true,
    "showMinecraftVersion" BOOLEAN NOT NULL DEFAULT true,
    "showInstallationName" BOOLEAN NOT NULL DEFAULT false,
    "allowProfileViewing" TEXT NOT NULL DEFAULT 'friends_only',
    "invisibleMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "privacy_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friends" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "friendUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'accepted',
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friend_requests" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friend_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_entries" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "block_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_presences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'offline',
    "minecraftVersion" TEXT,
    "installationName" TEXT,
    "sessionStartTime" TIMESTAMP(3),
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "socketId" TEXT,

    CONSTRAINT "user_presences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cosmetic_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assetPath" TEXT NOT NULL,
    "previewUrl" TEXT NOT NULL,
    "modelType" TEXT NOT NULL DEFAULT 'both',
    "animated" BOOLEAN NOT NULL DEFAULT false,
    "isStarter" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cosmetic_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cosmetic_ownerships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cosmeticId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "cosmetic_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipped_cosmetics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "cosmeticId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipped_cosmetics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_cloud_configurations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "currentRevisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_cloud_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_revisions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "parentRevisionId" TEXT,
    "configPayload" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "clientVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fern_users_email_key" ON "fern_users"("email");
CREATE UNIQUE INDEX "fern_users_username_key" ON "fern_users"("username");
CREATE UNIQUE INDEX "user_credentials_userId_key" ON "user_credentials"("userId");
CREATE UNIQUE INDEX "user_sessions_sessionTokenHash_key" ON "user_sessions"("sessionTokenHash");
CREATE UNIQUE INDEX "user_sessions_refreshTokenHash_key" ON "user_sessions"("refreshTokenHash");
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");
CREATE UNIQUE INDEX "email_verification_tokens_tokenHash_key" ON "email_verification_tokens"("tokenHash");
CREATE INDEX "email_verification_tokens_userId_idx" ON "email_verification_tokens"("userId");
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");
CREATE UNIQUE INDEX "privacy_settings_userId_key" ON "privacy_settings"("userId");
CREATE INDEX "friends_userId_idx" ON "friends"("userId");
CREATE INDEX "friends_friendUserId_idx" ON "friends"("friendUserId");
CREATE UNIQUE INDEX "friends_userId_friendUserId_key" ON "friends"("userId", "friendUserId");
CREATE INDEX "friend_requests_fromUserId_idx" ON "friend_requests"("fromUserId");
CREATE INDEX "friend_requests_toUserId_idx" ON "friend_requests"("toUserId");
CREATE INDEX "block_entries_blockerId_idx" ON "block_entries"("blockerId");
CREATE INDEX "block_entries_blockedId_idx" ON "block_entries"("blockedId");
CREATE UNIQUE INDEX "block_entries_blockerId_blockedId_key" ON "block_entries"("blockerId", "blockedId");
CREATE UNIQUE INDEX "user_presences_userId_key" ON "user_presences"("userId");
CREATE INDEX "cosmetic_ownerships_userId_idx" ON "cosmetic_ownerships"("userId");
CREATE UNIQUE INDEX "cosmetic_ownerships_userId_cosmeticId_key" ON "cosmetic_ownerships"("userId", "cosmeticId");
CREATE INDEX "equipped_cosmetics_userId_idx" ON "equipped_cosmetics"("userId");
CREATE UNIQUE INDEX "equipped_cosmetics_userId_category_key" ON "equipped_cosmetics"("userId", "category");
CREATE UNIQUE INDEX "user_cloud_configurations_userId_key" ON "user_cloud_configurations"("userId");
CREATE INDEX "sync_revisions_userId_idx" ON "sync_revisions"("userId");
CREATE INDEX "audit_events_userId_idx" ON "audit_events"("userId");
CREATE INDEX "audit_events_eventType_idx" ON "audit_events"("eventType");
CREATE INDEX "user_notifications_userId_idx" ON "user_notifications"("userId");

-- AddForeignKey
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fern_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fern_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fern_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fern_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fern_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "privacy_settings" ADD CONSTRAINT "privacy_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fern_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "friends" ADD CONSTRAINT "friends_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fern_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "friends" ADD CONSTRAINT "friends_friendUserId_fkey" FOREIGN KEY ("friendUserId") REFERENCES "fern_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "fern_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "fern_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "block_entries" ADD CONSTRAINT "block_entries_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "fern_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "block_entries" ADD CONSTRAINT "block_entries_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "fern_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_presences" ADD CONSTRAINT "user_presences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fern_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cosmetic_ownerships" ADD CONSTRAINT "cosmetic_ownerships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fern_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cosmetic_ownerships" ADD CONSTRAINT "cosmetic_ownerships_cosmeticId_fkey" FOREIGN KEY ("cosmeticId") REFERENCES "cosmetic_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "equipped_cosmetics" ADD CONSTRAINT "equipped_cosmetics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fern_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_cloud_configurations" ADD CONSTRAINT "user_cloud_configurations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fern_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sync_revisions" ADD CONSTRAINT "sync_revisions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fern_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fern_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fern_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
