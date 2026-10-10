import {
  FernApiClient,
  AuthApi,
  ProfileApi,
  FriendsApi,
  PresenceApi,
  CosmeticsApi,
  CloudSyncApi,
  ApiResponse,
} from './fern-api-client';
import { LocalSocialProvider } from './local-social-provider';
import { RemoteFernApiClient } from '../../services/remote-fern-api-client';
import { FernLogger } from '../../core/logger';
import { FernUserProfile, UpdateUserProfileDTO } from '../../../../shared/models/user-profile';
import {
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
import { FernAuthSession, FernAuthUser, SessionInfo } from '../../../../shared/models/auth';
import {
  CloudSyncStatus,
  SyncRevisionInfo,
  CloudSyncDownloadResult,
} from '../../../../shared/models/cloud-sync';

export class HybridSocialProvider implements FernApiClient {
  public readonly auth: AuthApi;
  public readonly profile: ProfileApi;
  public readonly friends: FriendsApi;
  public readonly presence: PresenceApi;
  public readonly cosmetics: CosmeticsApi;
  public readonly sync: CloudSyncApi;

  constructor(
    private readonly localProvider: LocalSocialProvider,
    private readonly remoteClient: RemoteFernApiClient,
    private readonly logger: FernLogger,
  ) {
    this.auth = this.remoteClient.auth;
    this.sync = this.remoteClient.sync;
    this.profile = this.createProfileProxy();
    this.friends = this.createFriendsProxy();
    this.presence = this.createPresenceProxy();
    this.cosmetics = this.createCosmeticsProxy();
  }

  public async isOnline(): Promise<boolean> {
    return this.remoteClient.isOnline();
  }

  public shouldUseRemote(): boolean {
    return Boolean(this.remoteClient.getToken());
  }

  // ==========================================
  // PROFILE PROXY
  // ==========================================
  private createProfileProxy(): ProfileApi {
    return {
      getProfile: async (userId) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.profile.getProfile(userId);
          if (res.success) return res;
        }
        return this.localProvider.profile.getProfile(userId);
      },
      updateProfile: async (userIdOrDto, maybeDto) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.profile.updateProfile(userIdOrDto, maybeDto);
          if (res.success) return res;
        }
        return this.localProvider.profile.updateProfile(userIdOrDto, maybeDto);
      },
      getPublicProfile: async (userId) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.profile.getPublicProfile(userId);
          if (res.success) return res;
        }
        return this.localProvider.profile.getProfile(userId);
      },
      getPrivacySettings: async () => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.profile.getPrivacySettings();
          if (res.success) return res;
        }
        return {
          success: true,
          data: {
            allowFriendRequests: true,
            allowProfileDiscovery: true,
            showOnlineStatus: true,
            showPlayingStatus: true,
            showMinecraftVersion: true,
            showInstallationName: false,
            allowProfileViewing: 'friends_only',
            invisibleMode: false,
          },
          timestamp: Date.now(),
        };
      },
      updatePrivacySettings: async (settings) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.profile.updatePrivacySettings(settings);
          if (res.success) return res;
        }
        return { success: true, data: settings as any, timestamp: Date.now() };
      },
      searchUsers: async (q, limit) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.profile.searchUsers(q, limit);
          if (res.success) return res;
        }
        return this.localProvider.profile.searchUsers(q, limit);
      },
    };
  }

  // ==========================================
  // FRIENDS PROXY
  // ==========================================
  private createFriendsProxy(): FriendsApi {
    return {
      getFriends: async (userId) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.friends.getFriends(userId);
          if (res.success) return res;
        }
        return this.localProvider.friends.getFriends(userId);
      },
      getFriendRequests: async (userId) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.friends.getFriendRequests(userId);
          if (res.success) return res;
        }
        return this.localProvider.friends.getFriendRequests(userId);
      },
      sendFriendRequest: async (target, maybeTarget) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.friends.sendFriendRequest(target, maybeTarget);
          if (res.success) return res;
        }
        return this.localProvider.friends.sendFriendRequest(target, maybeTarget);
      },
      acceptFriendRequest: async (id) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.friends.acceptFriendRequest(id);
          if (res.success) return res;
        }
        return this.localProvider.friends.acceptFriendRequest(id);
      },
      declineFriendRequest: async (id) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.friends.declineFriendRequest(id);
          if (res.success) return res;
        }
        return this.localProvider.friends.declineFriendRequest(id);
      },
      respondToRequest: async (id, accept) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.friends.respondToRequest(id, accept);
          if (res.success) return res;
        }
        return this.localProvider.friends.respondToRequest(id, accept);
      },
      cancelFriendRequest: async (id) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.friends.cancelFriendRequest(id);
          if (res.success) return res;
        }
        return this.localProvider.friends.cancelFriendRequest(id);
      },
      removeFriend: async (friendId, maybeFriendId) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.friends.removeFriend(friendId, maybeFriendId);
          if (res.success) return res;
        }
        return this.localProvider.friends.removeFriend(friendId, maybeFriendId);
      },
      searchUsers: async (q, limit) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.friends.searchUsers(q, limit);
          if (res.success) return res;
        }
        return this.localProvider.friends.searchUsers(q, limit);
      },
      getBlockedUsers: async () => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.friends.getBlockedUsers();
          if (res.success) return res;
        }
        return {
          success: true,
          data: this.localProvider.getBlockList(),
          timestamp: Date.now(),
        };
      },
      blockUser: async (targetUserId, username, display, reason) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.friends.blockUser(targetUserId, username, display, reason);
          if (res.success) return res;
        }
        await this.localProvider.blockUser(targetUserId, username || 'user', display || username || 'user', reason);
        return {
          success: true,
          data: {
            blockedUserId: targetUserId,
            username: username || 'user',
            displayName: display || username || 'user',
            blockedAt: Date.now(),
            reason,
          },
          timestamp: Date.now(),
        };
      },
      unblockUser: async (targetUserId) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.friends.unblockUser(targetUserId);
          if (res.success) return res;
        }
        await this.localProvider.unblockUser(targetUserId);
        return { success: true, timestamp: Date.now() };
      },
    };
  }

  // ==========================================
  // PRESENCE PROXY
  // ==========================================
  private createPresenceProxy(): PresenceApi {
    return {
      updatePresence: async (presence) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.presence.updatePresence(presence);
          if (res.success) return res;
        }
        return this.localProvider.presence.updatePresence(presence);
      },
      getPresence: async (userId) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.presence.getPresence(userId);
          if (res.success) return res;
        }
        return this.localProvider.presence.getPresence(userId);
      },
      getFriendsPresence: async (friendIds) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.presence.getFriendsPresence(friendIds);
          if (res.success) return res;
        }
        return this.localProvider.presence.getFriendsPresence(friendIds || []);
      },
      heartbeat: async () => {
        if (this.shouldUseRemote()) {
          return this.remoteClient.presence.heartbeat();
        }
        return { success: true, timestamp: Date.now() };
      },
    };
  }

  // ==========================================
  // COSMETICS PROXY
  // ==========================================
  private createCosmeticsProxy(): CosmeticsApi {
    return {
      getCosmeticCatalog: async (cat) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.cosmetics.getCosmeticCatalog(cat);
          if (res.success) return res;
        }
        return this.localProvider.cosmetics.getCosmeticCatalog(cat);
      },
      getCatalog: async (cat) => this.cosmetics.getCosmeticCatalog(cat),
      getUserOwnership: async (userId) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.cosmetics.getUserOwnership(userId);
          if (res.success) return res;
        }
        return this.localProvider.cosmetics.getUserOwnership(userId);
      },
      getOwnedCosmetics: async (userId) => this.cosmetics.getUserOwnership(userId),
      getEquippedCosmetics: async (userId) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.cosmetics.getEquippedCosmetics(userId);
          if (res.success) return res;
        }
        return this.localProvider.cosmetics.getEquippedCosmetics(userId);
      },
      equipCosmetic: async (cat, id, maybeId) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.cosmetics.equipCosmetic(cat, id, maybeId);
          if (res.success) return res;
        }
        return this.localProvider.cosmetics.equipCosmetic(cat, id, maybeId);
      },
      unequipCosmetic: async (cat, maybeCat) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.cosmetics.unequipCosmetic(cat, maybeCat);
          if (res.success) return res;
        }
        return this.localProvider.cosmetics.unequipCosmetic(cat, maybeCat);
      },
      toggleFavorite: async (id, maybeId) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.cosmetics.toggleFavorite(id, maybeId);
          if (res.success) return res;
        }
        return this.localProvider.cosmetics.toggleFavorite(id, maybeId);
      },
      getInGamePayload: async (model) => {
        if (this.shouldUseRemote()) {
          const res = await this.remoteClient.cosmetics.getInGamePayload(model);
          if (res.success) return res;
        }
        return {
          success: true,
          data: {
            userId: 'local_usr',
            playerUuid: 'local_uuid',
            playerModel: model || 'default',
            equipped: {},
            cosmeticsEnabled: true,
          },
          timestamp: Date.now(),
        };
      },
    };
  }
}
