import { FernUserProfile, UpdateUserProfileDTO } from '../../../../shared/models/user-profile';
import {
  CosmeticCategory,
  CosmeticDefinition,
  CosmeticEquippedState,
  CosmeticOwnership,
  InGameCosmeticsPayload,
} from '../../../../shared/models/cosmetics';
import {
  Friend,
  FriendRequest,
  UserPresence,
  FriendSearchResult,
  BlockEntry,
} from '../../../../shared/models/social';
import { SocialPrivacySettings } from '../../../../shared/models/privacy';
import {
  FernAuthSession,
  FernAuthUser,
  SessionInfo,
} from '../../../../shared/models/auth';
import {
  CloudSyncStatus,
  SyncRevisionInfo,
  CloudSyncDownloadResult,
} from '../../../../shared/models/cloud-sync';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: number;
}

/**
 * /api/v1/auth contracts
 */
export interface AuthApi {
  register(dto: { email: string; username: string; password: string; displayName?: string }): Promise<ApiResponse<any>>;
  login(dto: { loginIdentifier: string; password: string; deviceInfo?: string }): Promise<ApiResponse<FernAuthSession>>;
  logout(): Promise<ApiResponse<boolean>>;
  getMe(): Promise<ApiResponse<FernAuthUser>>;
  listSessions(): Promise<ApiResponse<SessionInfo[]>>;
  revokeSession(sessionId: string): Promise<ApiResponse<boolean>>;
  verifyEmail(token: string): Promise<ApiResponse<boolean>>;
  requestPasswordReset(emailOrUsername: string): Promise<ApiResponse<boolean>>;
  confirmPasswordReset(token: string, newPassword: string): Promise<ApiResponse<boolean>>;
  deleteAccount(password: string): Promise<ApiResponse<boolean>>;
}

/**
 * /api/v1/profile contracts
 */
export interface ProfileApi {
  getProfile(userId?: string): Promise<ApiResponse<FernUserProfile>>;
  updateProfile(userIdOrDto: string | UpdateUserProfileDTO, maybeDto?: UpdateUserProfileDTO): Promise<ApiResponse<FernUserProfile>>;
  getPublicProfile(userIdOrUsername: string): Promise<ApiResponse<FernUserProfile>>;
  getPrivacySettings(): Promise<ApiResponse<SocialPrivacySettings>>;
  updatePrivacySettings(settings: Partial<SocialPrivacySettings>): Promise<ApiResponse<SocialPrivacySettings>>;
  searchUsers(query: string, limit?: number): Promise<ApiResponse<FriendSearchResult[]>>;
}

/**
 * /api/v1/friends contracts
 */
export interface FriendsApi {
  getFriends(userId?: string): Promise<ApiResponse<Friend[]>>;
  getFriendRequests(userId?: string): Promise<ApiResponse<FriendRequest[]>>;
  sendFriendRequest(targetUsernameOrFromId: string, maybeTargetUsername?: string): Promise<ApiResponse<FriendRequest>>;
  acceptFriendRequest(requestId: string): Promise<ApiResponse<Friend>>;
  declineFriendRequest(requestId: string): Promise<ApiResponse<boolean>>;
  respondToRequest(requestId: string, accept: boolean): Promise<ApiResponse<boolean>>;
  cancelFriendRequest(requestId: string): Promise<ApiResponse<boolean>>;
  removeFriend(friendUserIdOrUserId: string, maybeFriendUserId?: string): Promise<ApiResponse<boolean>>;
  searchUsers(query: string, limit?: number): Promise<ApiResponse<FriendSearchResult[]>>;
  getBlockedUsers(): Promise<ApiResponse<BlockEntry[]>>;
  blockUser(userId: string, username?: string, displayName?: string, reason?: string): Promise<ApiResponse<BlockEntry>>;
  unblockUser(userId: string): Promise<ApiResponse<boolean>>;
}

/**
 * /api/v1/presence contracts
 */
export interface PresenceApi {
  updatePresence(presence: UserPresence): Promise<ApiResponse<UserPresence>>;
  getPresence(userId: string): Promise<ApiResponse<UserPresence>>;
  getFriendsPresence(friendUserIds?: string[]): Promise<ApiResponse<Record<string, UserPresence>>>;
  heartbeat(): Promise<ApiResponse<boolean>>;
}

/**
 * /api/v1/cosmetics contracts
 */
export interface CosmeticsApi {
  getCosmeticCatalog(category?: string): Promise<ApiResponse<CosmeticDefinition[]>>;
  getCatalog(category?: string): Promise<ApiResponse<CosmeticDefinition[]>>;
  getUserOwnership(userId?: string): Promise<ApiResponse<CosmeticOwnership>>;
  getOwnedCosmetics(userId?: string): Promise<ApiResponse<CosmeticOwnership>>;
  getEquippedCosmetics(userId?: string): Promise<ApiResponse<CosmeticEquippedState>>;
  equipCosmetic(categoryOrUserId: string, cosmeticIdOrCategory: string, maybeCosmeticId?: string): Promise<ApiResponse<CosmeticEquippedState>>;
  unequipCosmetic(categoryOrUserId: string, maybeCategory?: string): Promise<ApiResponse<CosmeticEquippedState>>;
  toggleFavorite(cosmeticIdOrUserId: string, maybeCosmeticId?: string): Promise<ApiResponse<string[]>>;
  getInGamePayload(model?: 'default' | 'slim'): Promise<ApiResponse<InGameCosmeticsPayload>>;
}

/**
 * /api/v1/sync contracts
 */
export interface CloudSyncApi {
  getStatus(): Promise<ApiResponse<CloudSyncStatus>>;
  enable(): Promise<ApiResponse<boolean>>;
  disable(): Promise<ApiResponse<boolean>>;
  uploadConfig(config: Record<string, any>, parentRevisionId?: string, force?: boolean): Promise<ApiResponse<SyncRevisionInfo>>;
  downloadConfig(revisionId?: string): Promise<ApiResponse<CloudSyncDownloadResult>>;
  listRevisions(limit?: number): Promise<ApiResponse<SyncRevisionInfo[]>>;
  reset(): Promise<ApiResponse<boolean>>;
}

/**
 * Consolidated FernApiClient abstraction.
 */
export interface FernApiClient {
  readonly auth: AuthApi;
  readonly profile: ProfileApi;
  readonly friends: FriendsApi;
  readonly presence: PresenceApi;
  readonly cosmetics: CosmeticsApi;
  readonly sync: CloudSyncApi;
  isOnline(): Promise<boolean>;
}
