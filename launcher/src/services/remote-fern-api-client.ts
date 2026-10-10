import {
  FernApiClient,
  AuthApi,
  ProfileApi,
  FriendsApi,
  PresenceApi,
  CosmeticsApi,
  CloudSyncApi,
  ApiResponse,
} from '../social/api/fern-api-client';
import { FernUserProfile, UpdateUserProfileDTO } from '../../../shared/models/user-profile';
import {
  CosmeticDefinition,
  CosmeticEquippedState,
  CosmeticOwnership,
  InGameCosmeticsPayload,
} from '../../../shared/models/cosmetics';
import {
  Friend,
  FriendRequest,
  UserPresence,
  FriendSearchResult,
  BlockEntry,
} from '../../../shared/models/social';
import { SocialPrivacySettings } from '../../../shared/models/privacy';
import { FernAuthSession, FernAuthUser, SessionInfo } from '../../../shared/models/auth';
import {
  CloudSyncStatus,
  SyncRevisionInfo,
  CloudSyncDownloadResult,
} from '../../../shared/models/cloud-sync';

export interface RemoteClientOptions {
  baseUrl?: string;
  onUnauthorized?: () => void;
  onPresenceUpdate?: (presence: any) => void;
}

export class RemoteFernApiClient implements FernApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private onUnauthorized?: () => void;
  private onPresenceUpdate?: (presence: any) => void;

  public readonly auth: AuthApi;
  public readonly profile: ProfileApi;
  public readonly friends: FriendsApi;
  public readonly presence: PresenceApi;
  public readonly cosmetics: CosmeticsApi;
  public readonly sync: CloudSyncApi;

  constructor(options?: RemoteClientOptions) {
    this.baseUrl = (options?.baseUrl || 'http://localhost:4000').replace(/\/$/, '');
    this.onUnauthorized = options?.onUnauthorized;
    this.onPresenceUpdate = options?.onPresenceUpdate;

    this.auth = this.createAuthApi();
    this.profile = this.createProfileApi();
    this.friends = this.createFriendsApi();
    this.presence = this.createPresenceApi();
    this.cosmetics = this.createCosmeticsApi();
    this.sync = this.createSyncApi();
  }

  public setToken(token: string | null) {
    this.token = token;
  }

  public getToken(): string | null {
    return this.token;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async isOnline(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${this.baseUrl}/api/v1/health`, {
        signal: controller.signal,
      });
      clearTimeout(id);
      return res.ok;
    } catch {
      return false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status === 401) {
        if (this.onUnauthorized) {
          this.onUnauthorized();
        }
      }

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        return {
          success: false,
          error: json?.error || json?.message || `Request failed with status ${res.status}`,
          code: json?.code || `HTTP_${res.status}`,
          data: json?.data,
          timestamp: Date.now(),
        };
      }

      return {
        success: true,
        data: json?.data !== undefined ? json.data : (json as T),
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.name === 'AbortError' ? 'Network request timed out' : err.message || 'Network error',
        code: 'NETWORK_ERROR',
        timestamp: Date.now(),
      };
    }
  }

  // ==========================================
  // AUTH API
  // ==========================================
  private createAuthApi(): AuthApi {
    return {
      register: async (dto) => this.request('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(dto) }),
      login: async (dto) => {
        const res = await this.request<FernAuthSession>('/api/v1/auth/login', {
          method: 'POST',
          body: JSON.stringify(dto),
        });
        if (res.success && res.data?.accessToken) {
          this.setToken(res.data.accessToken);
        }
        return res;
      },
      logout: async () => {
        const res = await this.request<boolean>('/api/v1/auth/logout', { method: 'POST' });
        this.setToken(null);
        return res;
      },
      getMe: async () => this.request<FernAuthUser>('/api/v1/auth/me', { method: 'GET' }),
      listSessions: async () => this.request<SessionInfo[]>('/api/v1/auth/sessions', { method: 'GET' }),
      revokeSession: async (id) => this.request<boolean>(`/api/v1/auth/sessions/${id}`, { method: 'DELETE' }),
      verifyEmail: async (token) => this.request<boolean>('/api/v1/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),
      requestPasswordReset: async (emailOrUsername) =>
        this.request<boolean>('/api/v1/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ emailOrUsername }) }),
      confirmPasswordReset: async (token, newPassword) =>
        this.request<boolean>('/api/v1/auth/password-reset/confirm', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),
      deleteAccount: async (password) => {
        const res = await this.request<boolean>('/api/v1/auth/delete-account', { method: 'POST', body: JSON.stringify({ password }) });
        if (res.success) this.setToken(null);
        return res;
      },
    };
  }

  // ==========================================
  // PROFILE API
  // ==========================================
  private createProfileApi(): ProfileApi {
    return {
      getProfile: async (userId?: string) => {
        if (!userId || userId === 'current' || userId === 'me') {
          return this.request<FernUserProfile>('/api/v1/profile/me', { method: 'GET' });
        }
        return this.request<FernUserProfile>(`/api/v1/profile/${userId}`, { method: 'GET' });
      },
      updateProfile: async (userIdOrDto, maybeDto) => {
        const dto = maybeDto || (userIdOrDto as UpdateUserProfileDTO);
        return this.request<FernUserProfile>('/api/v1/profile/me', {
          method: 'PATCH',
          body: JSON.stringify(dto),
        });
      },
      getPublicProfile: async (target) => this.request<FernUserProfile>(`/api/v1/profile/${target}`, { method: 'GET' }),
      getPrivacySettings: async () => this.request<SocialPrivacySettings>('/api/v1/profile/privacy', { method: 'GET' }),
      updatePrivacySettings: async (settings) =>
        this.request<SocialPrivacySettings>('/api/v1/profile/privacy', {
          method: 'PATCH',
          body: JSON.stringify(settings),
        }),
      searchUsers: async (q, limit = 20) =>
        this.request<FriendSearchResult[]>(`/api/v1/friends/search?q=${encodeURIComponent(q)}&limit=${limit}`, { method: 'GET' }),
    };
  }

  // ==========================================
  // FRIENDS API
  // ==========================================
  private createFriendsApi(): FriendsApi {
    return {
      getFriends: async () => this.request<Friend[]>('/api/v1/friends', { method: 'GET' }),
      getFriendRequests: async () => this.request<FriendRequest[]>('/api/v1/friends/requests', { method: 'GET' }),
      sendFriendRequest: async (target) =>
        this.request<FriendRequest>('/api/v1/friends/requests', {
          method: 'POST',
          body: JSON.stringify({ targetUsernameOrId: target }),
        }),
      acceptFriendRequest: async (id) => this.request<Friend>(`/api/v1/friends/requests/${id}/accept`, { method: 'POST' }),
      declineFriendRequest: async (id) => this.request<boolean>(`/api/v1/friends/requests/${id}/decline`, { method: 'POST' }),
      respondToRequest: async (id, accept) =>
        accept ? (this.friends.acceptFriendRequest(id) as any) : this.friends.declineFriendRequest(id),
      cancelFriendRequest: async (id) => this.request<boolean>(`/api/v1/friends/requests/${id}`, { method: 'DELETE' }),
      removeFriend: async (friendId) => this.request<boolean>(`/api/v1/friends/${friendId}`, { method: 'DELETE' }),
      searchUsers: async (q, limit = 20) =>
        this.request<FriendSearchResult[]>(`/api/v1/friends/search?q=${encodeURIComponent(q)}&limit=${limit}`, { method: 'GET' }),
      getBlockedUsers: async () => this.request<BlockEntry[]>('/api/v1/friends/blocked', { method: 'GET' }),
      blockUser: async (targetUserId, _username, _displayName, reason) =>
        this.request<BlockEntry>(`/api/v1/friends/block/${targetUserId}`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }),
      unblockUser: async (targetUserId) => this.request<boolean>(`/api/v1/friends/block/${targetUserId}`, { method: 'DELETE' }),
    };
  }

  // ==========================================
  // PRESENCE API
  // ==========================================
  private createPresenceApi(): PresenceApi {
    return {
      updatePresence: async (presence) =>
        this.request<UserPresence>('/api/v1/presence/update', {
          method: 'POST',
          body: JSON.stringify(presence),
        }),
      getPresence: async (userId) => this.request<UserPresence>(`/api/v1/presence/${userId}`, { method: 'GET' }),
      getFriendsPresence: async () => this.request<Record<string, UserPresence>>('/api/v1/presence/friends', { method: 'GET' }),
      heartbeat: async () => this.request<boolean>('/api/v1/presence/heartbeat', { method: 'POST' }),
    };
  }

  // ==========================================
  // COSMETICS API
  // ==========================================
  private createCosmeticsApi(): CosmeticsApi {
    return {
      getCosmeticCatalog: async (cat) =>
        this.request<CosmeticDefinition[]>(cat ? `/api/v1/cosmetics/catalog?category=${cat}` : '/api/v1/cosmetics/catalog', { method: 'GET' }),
      getCatalog: async (cat) => this.cosmetics.getCosmeticCatalog(cat),
      getUserOwnership: async () => this.request<CosmeticOwnership>('/api/v1/cosmetics/owned', { method: 'GET' }),
      getOwnedCosmetics: async () => this.cosmetics.getUserOwnership(),
      getEquippedCosmetics: async () => this.request<CosmeticEquippedState>('/api/v1/cosmetics/equipped', { method: 'GET' }),
      equipCosmetic: async (catOrUser, cosmeticOrCat, maybeCosmetic) => {
        const category = maybeCosmetic !== undefined ? cosmeticOrCat : catOrUser;
        const cosmeticId = maybeCosmetic !== undefined ? maybeCosmetic : cosmeticOrCat;
        return this.request<CosmeticEquippedState>('/api/v1/cosmetics/equip', {
          method: 'POST',
          body: JSON.stringify({ category, cosmeticId }),
        });
      },
      unequipCosmetic: async (catOrUser, maybeCat) => {
        const category = maybeCat !== undefined ? maybeCat : catOrUser;
        return this.request<CosmeticEquippedState>('/api/v1/cosmetics/unequip', {
          method: 'POST',
          body: JSON.stringify({ category }),
        });
      },
      toggleFavorite: async (cosmeticId) =>
        this.request<string[]>(`/api/v1/cosmetics/favorite/${cosmeticId}`, { method: 'POST' }),
      getInGamePayload: async (model = 'default') =>
        this.request<InGameCosmeticsPayload>(`/api/v1/cosmetics/ingame-payload?model=${model}`, { method: 'GET' }),
    };
  }

  // ==========================================
  // CLOUD SYNC API
  // ==========================================
  private createSyncApi(): CloudSyncApi {
    return {
      getStatus: async () => this.request<CloudSyncStatus>('/api/v1/sync/status', { method: 'GET' }),
      enable: async () => this.request<boolean>('/api/v1/sync/enable', { method: 'POST' }),
      disable: async () => this.request<boolean>('/api/v1/sync/disable', { method: 'POST' }),
      uploadConfig: async (config, parentRevisionId, force) =>
        this.request<SyncRevisionInfo>('/api/v1/sync/upload', {
          method: 'POST',
          body: JSON.stringify({ config, parentRevisionId, force }),
        }),
      downloadConfig: async (revisionId) =>
        this.request<CloudSyncDownloadResult>(
          revisionId ? `/api/v1/sync/download?revisionId=${revisionId}` : '/api/v1/sync/download',
          { method: 'GET' },
        ),
      listRevisions: async (limit = 20) =>
        this.request<SyncRevisionInfo[]>(`/api/v1/sync/revisions?limit=${limit}`, { method: 'GET' }),
      reset: async () => this.request<boolean>('/api/v1/sync/reset', { method: 'DELETE' }),
    };
  }
}
