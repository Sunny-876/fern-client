import * as fs from 'fs/promises';
import * as path from 'path';
import { FernPathManager } from '../../core/paths';
import { FernLogger } from '../../core/logger';
import {
  FernApiClient,
  ProfileApi,
  FriendsApi,
  PresenceApi,
  CosmeticsApi,
  ApiResponse,
} from './fern-api-client';
import { FernUserProfile, UpdateUserProfileDTO, UserProfileValidator } from '../../../../shared/models/user-profile';
import {
  CosmeticDefinition,
  CosmeticEquippedState,
  CosmeticOwnership,
  CosmeticCategory,
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
import { DEFAULT_COSMETICS_CATALOG } from '../../../../shared/constants/cosmetics-catalog';

export class LocalSocialProvider {
  private socialDir: string;
  private isLoaded = false;

  // In-memory caches persisted to disk
  private userProfile: FernUserProfile;
  private friendsList: Friend[] = [];
  private requestsList: FriendRequest[] = [];
  private blockedUsers: BlockEntry[] = [];
  private presences: Map<string, UserPresence> = new Map();
  private ownership: CosmeticOwnership;
  private equippedState: CosmeticEquippedState;

  public readonly profile: ProfileApi;
  public readonly friendsApi: FriendsApi;
  public readonly presence: PresenceApi;
  public readonly cosmetics: CosmeticsApi;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger
  ) {
    this.socialDir = this.pathManager.getSocialDir();

    // Default primary profile
    this.userProfile = {
      id: 'fern_usr_default',
      username: 'FernPlayer',
      displayName: 'Fern Player',
      avatar: 'avatar_fern_emerald',
      bio: 'Exploring Minecraft with Fern Client. High FPS, clean HUD.',
      createdAt: Date.now() - 30 * 86400000,
      lastActive: Date.now(),
      favoriteMinecraftVersion: '1.21.4',
      favoriteInstallation: 'Fern Performance',
      profileVisibility: 'public',
      onlineStatusVisibility: 'public',
      playingStatusVisibility: 'public',
      badges: ['early_supporter', 'beta_tester'],
    };

    // Default initial ownership: unlocked first 6 items
    this.ownership = {
      userId: this.userProfile.id,
      ownedCosmeticIds: [
        'cape_fern_emerald',
        'cape_sunset_gradient',
        'cape_founder_gold',
        'hat_fern_beret',
        'hat_tactical_beanie',
        'acc_shoulder_sprout',
        'emote_fern_wave',
      ],
      favorites: ['cape_fern_emerald', 'acc_shoulder_sprout'],
      unlockedAt: {
        cape_fern_emerald: Date.now() - 100000,
        cape_sunset_gradient: Date.now() - 80000,
        cape_founder_gold: Date.now() - 60000,
        hat_fern_beret: Date.now() - 50000,
        hat_tactical_beanie: Date.now() - 40000,
        acc_shoulder_sprout: Date.now() - 30000,
        emote_fern_wave: Date.now() - 20000,
      },
    };

    // Default equipped: emerald cape & sprout
    this.equippedState = {
      userId: this.userProfile.id,
      equipped: {
        cape: 'cape_fern_emerald',
        accessory: 'acc_shoulder_sprout',
      },
      lastUpdated: Date.now(),
    };

    // Initialize Sub-APIs
    this.profile = this.createProfileApi();
    this.friendsApi = this.createFriendsApi();
    this.presence = this.createPresenceApi();
    this.cosmetics = this.createCosmeticsApi();
  }

  public get friends(): FriendsApi {
    return this.friendsApi;
  }

  public async isOnline(): Promise<boolean> {
    return true; // Local provider is always available
  }

  public async initialize(): Promise<void> {
    if (this.isLoaded) return;
    try {
      await fs.mkdir(this.socialDir, { recursive: true });
      await this.loadAll();
      this.isLoaded = true;
      this.logger.info('LocalSocialProvider', 'Initialized local social repository.');
    } catch (err) {
      this.logger.error('LocalSocialProvider', 'Error initializing social directory:', err);
    }
  }

  private async loadAll(): Promise<void> {
    // 1. Profile
    try {
      const pRaw = await fs.readFile(path.join(this.socialDir, 'profile.json'), 'utf-8');
      this.userProfile = { ...this.userProfile, ...JSON.parse(pRaw) };
    } catch {
      await this.saveProfile();
    }

    // 2. Friends
    try {
      const fRaw = await fs.readFile(path.join(this.socialDir, 'friends.json'), 'utf-8');
      this.friendsList = JSON.parse(fRaw);
    } catch {
      // Seed initial friends for realistic demonstration
      this.friendsList = [
        {
          id: 'rel_alex',
          friendUserId: 'fern_usr_alex',
          username: 'AlexBuilder',
          displayName: 'Alex B.',
          avatar: 'avatar_stone',
          status: 'accepted',
          since: Date.now() - 14 * 86400000,
          presence: {
            userId: 'fern_usr_alex',
            state: 'playing_minecraft',
            minecraftVersion: '1.21.4',
            installationName: 'Fern Survival',
            sessionStartTime: Date.now() - 3600000,
            lastSeen: Date.now(),
          },
        },
        {
          id: 'rel_steve',
          friendUserId: 'fern_usr_steve',
          username: 'StevePvP',
          displayName: 'Steve Warrior',
          avatar: 'avatar_diamond',
          status: 'accepted',
          since: Date.now() - 25 * 86400000,
          presence: {
            userId: 'fern_usr_steve',
            state: 'in_launcher',
            lastSeen: Date.now() - 600000,
          },
        },
        {
          id: 'rel_clover',
          friendUserId: 'fern_usr_clover',
          username: 'CloverMiner',
          displayName: 'Clover',
          avatar: 'avatar_wood',
          status: 'accepted',
          since: Date.now() - 2 * 86400000,
          presence: {
            userId: 'fern_usr_clover',
            state: 'offline',
            lastSeen: Date.now() - 86400000,
          },
        },
      ];
      await this.saveFriends();
    }

    // 3. Requests
    try {
      const reqRaw = await fs.readFile(path.join(this.socialDir, 'requests.json'), 'utf-8');
      this.requestsList = JSON.parse(reqRaw);
    } catch {
      this.requestsList = [
        {
          id: 'req_ender',
          fromUserId: 'fern_usr_ender',
          toUserId: this.userProfile.id,
          fromUsername: 'EnderKnight',
          fromDisplayName: 'Ender Knight',
          fromAvatar: 'avatar_nether',
          toUsername: this.userProfile.username,
          timestamp: Date.now() - 7200000,
          direction: 'incoming',
          status: 'pending',
        },
      ];
      await this.saveRequests();
    }

    // 4. Blocks
    try {
      const bRaw = await fs.readFile(path.join(this.socialDir, 'blocks.json'), 'utf-8');
      this.blockedUsers = JSON.parse(bRaw);
    } catch {
      this.blockedUsers = [];
      await this.saveBlocks();
    }

    // 5. Cosmetics Ownership
    try {
      const oRaw = await fs.readFile(path.join(this.socialDir, 'cosmetics_owned.json'), 'utf-8');
      this.ownership = JSON.parse(oRaw);
    } catch {
      await this.saveOwnership();
    }

    // 6. Equipped Cosmetics
    try {
      const eqRaw = await fs.readFile(path.join(this.socialDir, 'cosmetics_equipped.json'), 'utf-8');
      this.equippedState = JSON.parse(eqRaw);
    } catch {
      await this.saveEquipped();
    }
  }

  private async saveProfile(): Promise<void> {
    await fs.writeFile(
      path.join(this.socialDir, 'profile.json'),
      JSON.stringify(this.userProfile, null, 2),
      'utf-8'
    );
  }

  private async saveFriends(): Promise<void> {
    await fs.writeFile(
      path.join(this.socialDir, 'friends.json'),
      JSON.stringify(this.friendsList, null, 2),
      'utf-8'
    );
  }

  private async saveRequests(): Promise<void> {
    await fs.writeFile(
      path.join(this.socialDir, 'requests.json'),
      JSON.stringify(this.requestsList, null, 2),
      'utf-8'
    );
  }

  private async saveBlocks(): Promise<void> {
    await fs.writeFile(
      path.join(this.socialDir, 'blocks.json'),
      JSON.stringify(this.blockedUsers, null, 2),
      'utf-8'
    );
  }

  private async saveOwnership(): Promise<void> {
    await fs.writeFile(
      path.join(this.socialDir, 'cosmetics_owned.json'),
      JSON.stringify(this.ownership, null, 2),
      'utf-8'
    );
  }

  private async saveEquipped(): Promise<void> {
    await fs.writeFile(
      path.join(this.socialDir, 'cosmetics_equipped.json'),
      JSON.stringify(this.equippedState, null, 2),
      'utf-8'
    );
  }

  public getBlockList(): BlockEntry[] {
    return [...this.blockedUsers];
  }

  public async blockUser(userId: string, username: string, displayName: string, reason?: string): Promise<boolean> {
    await this.initialize();
    if (this.blockedUsers.some((b) => b.blockedUserId === userId)) return false;

    this.blockedUsers.push({
      blockedUserId: userId,
      username,
      displayName,
      blockedAt: Date.now(),
      reason,
    });

    // Remove from friends list if currently friends
    this.friendsList = this.friendsList.filter((f) => f.friendUserId !== userId);
    // Remove any pending requests
    this.requestsList = this.requestsList.filter(
      (r) => r.fromUserId !== userId && r.toUserId !== userId
    );

    await Promise.all([this.saveBlocks(), this.saveFriends(), this.saveRequests()]);
    this.logger.info('LocalSocialProvider', `Blocked user: @${username} (${userId})`);
    return true;
  }

  public async unblockUser(userId: string): Promise<boolean> {
    await this.initialize();
    const len = this.blockedUsers.length;
    this.blockedUsers = this.blockedUsers.filter((b) => b.blockedUserId !== userId);
    if (this.blockedUsers.length < len) {
      await this.saveBlocks();
      this.logger.info('LocalSocialProvider', `Unblocked user: ${userId}`);
      return true;
    }
    return false;
  }

  // ==========================================
  // PROFILE API
  // ==========================================
  private createProfileApi(): ProfileApi {
    return {
      getProfile: async (userId?: string): Promise<ApiResponse<FernUserProfile>> => {
        await this.initialize();
        if (!userId || userId === this.userProfile.id || userId === 'current') {
          return { success: true, data: { ...this.userProfile }, timestamp: Date.now() };
        }
        // Check friends
        const friend = this.friendsList.find((f) => f.friendUserId === userId);
        if (friend) {
          const profile: FernUserProfile = {
            id: friend.friendUserId,
            username: friend.username,
            displayName: friend.displayName,
            avatar: friend.avatar,
            createdAt: friend.since,
            lastActive: friend.presence?.lastSeen || Date.now(),
            favoriteMinecraftVersion: friend.presence?.minecraftVersion || '1.21.4',
            profileVisibility: 'friends_only',
            onlineStatusVisibility: 'friends_only',
            playingStatusVisibility: 'friends_only',
            badges: [],
          };
          return { success: true, data: profile, timestamp: Date.now() };
        }
        return { success: false, error: 'User profile not found', timestamp: Date.now() };
      },

      updateProfile: async (
        userIdOrDto: string | UpdateUserProfileDTO,
        maybeDto?: UpdateUserProfileDTO
      ): Promise<ApiResponse<FernUserProfile>> => {
        await this.initialize();
        const dto = (typeof userIdOrDto === 'object' ? userIdOrDto : maybeDto) || {};
        if (dto.displayName !== undefined) {
          const v = UserProfileValidator.validateDisplayName(dto.displayName);
          if (!v.valid) return { success: false, error: v.error, timestamp: Date.now() };
          this.userProfile.displayName = dto.displayName.trim();
        }
        if (dto.bio !== undefined) {
          const v = UserProfileValidator.validateBio(dto.bio);
          if (!v.valid) return { success: false, error: v.error, timestamp: Date.now() };
          this.userProfile.bio = dto.bio.trim();
        }
        if (dto.avatar !== undefined) this.userProfile.avatar = dto.avatar;
        if (dto.favoriteMinecraftVersion !== undefined)
          this.userProfile.favoriteMinecraftVersion = dto.favoriteMinecraftVersion;
        if (dto.favoriteInstallation !== undefined)
          this.userProfile.favoriteInstallation = dto.favoriteInstallation;
        if (dto.profileVisibility !== undefined) this.userProfile.profileVisibility = dto.profileVisibility;
        if (dto.onlineStatusVisibility !== undefined)
          this.userProfile.onlineStatusVisibility = dto.onlineStatusVisibility;
        if (dto.playingStatusVisibility !== undefined)
          this.userProfile.playingStatusVisibility = dto.playingStatusVisibility;

        this.userProfile.lastActive = Date.now();
        await this.saveProfile();
        return { success: true, data: { ...this.userProfile }, timestamp: Date.now() };
      },

      searchUsers: async (query: string): Promise<ApiResponse<FriendSearchResult[]>> => {
        await this.initialize();
        const q = query.trim().toLowerCase();
        if (!q) return { success: true, data: [], timestamp: Date.now() };

        // Catalog of discoverable mock users
        const mockDatabase: Array<{ userId: string; username: string; displayName: string; avatar: string }> = [
          { userId: 'fern_usr_alex', username: 'AlexBuilder', displayName: 'Alex B.', avatar: 'avatar_stone' },
          { userId: 'fern_usr_steve', username: 'StevePvP', displayName: 'Steve Warrior', avatar: 'avatar_diamond' },
          { userId: 'fern_usr_clover', username: 'CloverMiner', displayName: 'Clover', avatar: 'avatar_wood' },
          { userId: 'fern_usr_ender', username: 'EnderKnight', displayName: 'Ender Knight', avatar: 'avatar_nether' },
          { userId: 'fern_usr_aurora', username: 'AuroraSky', displayName: 'Aurora', avatar: 'avatar_ice' },
          { userId: 'fern_usr_shadow', username: 'ShadowNinja', displayName: 'Shadow', avatar: 'avatar_obsidian' },
        ];

        const results: FriendSearchResult[] = [];
        for (const user of mockDatabase) {
          if (user.userId === this.userProfile.id) continue;
          if (this.blockedUsers.some((b) => b.blockedUserId === user.userId)) continue;

          if (user.username.toLowerCase().includes(q) || user.displayName.toLowerCase().includes(q)) {
            let status: FriendSearchResult['relationshipStatus'] = 'none';
            if (this.friendsList.some((f) => f.friendUserId === user.userId)) {
              status = 'friend';
            } else if (
              this.requestsList.some((r) => r.toUserId === user.userId && r.status === 'pending')
            ) {
              status = 'outgoing_request';
            } else if (
              this.requestsList.some((r) => r.fromUserId === user.userId && r.status === 'pending')
            ) {
              status = 'incoming_request';
            }

            results.push({
              userId: user.userId,
              username: user.username,
              displayName: user.displayName,
              avatar: user.avatar,
              relationshipStatus: status,
            });
          }
        }

        return { success: true, data: results, timestamp: Date.now() };
      },

      getPublicProfile: async (userIdOrUsername: string): Promise<ApiResponse<FernUserProfile>> => {
        return this.profile.getProfile(userIdOrUsername);
      },

      getPrivacySettings: async (): Promise<ApiResponse<SocialPrivacySettings>> => {
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

      updatePrivacySettings: async (settings: Partial<SocialPrivacySettings>): Promise<ApiResponse<SocialPrivacySettings>> => {
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
            ...settings,
          },
          timestamp: Date.now(),
        };
      },
    };
  }

  // ==========================================
  // FRIENDS API
  // ==========================================
  private createFriendsApi(): FriendsApi {
    return {
      getFriends: async (): Promise<ApiResponse<Friend[]>> => {
        await this.initialize();
        return { success: true, data: [...this.friendsList], timestamp: Date.now() };
      },

      getFriendRequests: async (): Promise<ApiResponse<FriendRequest[]>> => {
        await this.initialize();
        return {
          success: true,
          data: this.requestsList.filter((r) => r.status === 'pending'),
          timestamp: Date.now(),
        };
      },

      sendFriendRequest: async (
        targetOrFrom: string,
        maybeTarget?: string
      ): Promise<ApiResponse<FriendRequest>> => {
        await this.initialize();
        const targetUsername = maybeTarget !== undefined ? maybeTarget : targetOrFrom;
        const fromUserId = maybeTarget !== undefined ? targetOrFrom : this.userProfile.id;

        const trimmed = targetUsername.trim().replace(/^@/, '');
        if (trimmed.toLowerCase() === this.userProfile.username.toLowerCase()) {
          return { success: false, error: 'Cannot send a friend request to yourself.', timestamp: Date.now() };
        }

        // Check if already friends
        if (this.friendsList.some((f) => f.username.toLowerCase() === trimmed.toLowerCase())) {
          return { success: false, error: `@${trimmed} is already in your friends list.`, timestamp: Date.now() };
        }

        // Check if target is blocked
        if (this.blockedUsers.some((b) => b.username.toLowerCase() === trimmed.toLowerCase())) {
          return { success: false, error: 'Cannot send a request to a blocked user.', timestamp: Date.now() };
        }

        // Check for existing pending request
        const existing = this.requestsList.find(
          (r) => r.toUsername.toLowerCase() === trimmed.toLowerCase() && r.status === 'pending'
        );
        if (existing) {
          return { success: false, error: 'A pending request already exists for this user.', timestamp: Date.now() };
        }

        const newReq: FriendRequest = {
          id: `req_${Date.now()}`,
          fromUserId,
          toUserId: `fern_usr_${trimmed.toLowerCase()}`,
          fromUsername: this.userProfile.username,
          fromDisplayName: this.userProfile.displayName,
          fromAvatar: this.userProfile.avatar,
          toUsername: trimmed,
          timestamp: Date.now(),
          direction: 'outgoing',
          status: 'pending',
        };

        this.requestsList.push(newReq);
        await this.saveRequests();
        return { success: true, data: newReq, timestamp: Date.now() };
      },

      acceptFriendRequest: async (requestId: string): Promise<ApiResponse<Friend>> => {
        await this.initialize();
        const req = this.requestsList.find((r) => r.id === requestId);
        if (!req) return { success: false, error: 'Request not found.', timestamp: Date.now() };

        req.status = 'accepted';

        const newFriend: Friend = {
          id: `rel_${Date.now()}`,
          friendUserId: req.fromUserId,
          username: req.fromUsername,
          displayName: req.fromDisplayName,
          avatar: req.fromAvatar,
          status: 'accepted',
          since: Date.now(),
          presence: {
            userId: req.fromUserId,
            state: 'online',
            lastSeen: Date.now(),
          },
        };

        this.friendsList.push(newFriend);
        this.requestsList = this.requestsList.filter((r) => r.id !== requestId);

        await Promise.all([this.saveFriends(), this.saveRequests()]);
        return { success: true, data: newFriend, timestamp: Date.now() };
      },

      declineFriendRequest: async (requestId: string): Promise<ApiResponse<boolean>> => {
        await this.initialize();
        const req = this.requestsList.find((r) => r.id === requestId);
        if (!req) return { success: false, error: 'Request not found.', timestamp: Date.now() };

        req.status = 'declined';
        this.requestsList = this.requestsList.filter((r) => r.id !== requestId);
        await this.saveRequests();
        return { success: true, data: true, timestamp: Date.now() };
      },

      respondToRequest: async (requestId: string, accept: boolean): Promise<ApiResponse<boolean>> => {
        if (accept) {
          const res = await this.friendsApi.acceptFriendRequest(requestId);
          return { success: res.success, data: res.success, error: res.error, timestamp: Date.now() };
        } else {
          return this.friendsApi.declineFriendRequest(requestId);
        }
      },

      cancelFriendRequest: async (requestId: string): Promise<ApiResponse<boolean>> => {
        await this.initialize();
        this.requestsList = this.requestsList.filter((r) => r.id !== requestId);
        await this.saveRequests();
        return { success: true, data: true, timestamp: Date.now() };
      },

      removeFriend: async (
        targetOrUser: string,
        maybeTarget?: string
      ): Promise<ApiResponse<boolean>> => {
        await this.initialize();
        const targetId = maybeTarget !== undefined ? maybeTarget : targetOrUser;
        const prevLen = this.friendsList.length;
        this.friendsList = this.friendsList.filter(
          (f) => f.friendUserId !== targetId && f.id !== targetId
        );
        if (this.friendsList.length < prevLen) {
          await this.saveFriends();
          return { success: true, data: true, timestamp: Date.now() };
        }
        return { success: false, error: 'Friend not found.', timestamp: Date.now() };
      },

      searchUsers: async (query: string, limit?: number): Promise<ApiResponse<FriendSearchResult[]>> => {
        return this.profile.searchUsers(query, limit);
      },

      getBlockedUsers: async (): Promise<ApiResponse<BlockEntry[]>> => {
        await this.initialize();
        return { success: true, data: this.getBlockList(), timestamp: Date.now() };
      },

      blockUser: async (userId: string, username?: string, displayName?: string, reason?: string): Promise<ApiResponse<BlockEntry>> => {
        await this.blockUser(userId, username || 'User', displayName || username || 'User', reason);
        const entry = this.blockedUsers.find((b) => b.blockedUserId === userId)!;
        return { success: true, data: entry, timestamp: Date.now() };
      },

      unblockUser: async (userId: string): Promise<ApiResponse<boolean>> => {
        const res = await this.unblockUser(userId);
        return { success: res, data: res, timestamp: Date.now() };
      },
    };
  }

  // ==========================================
  // PRESENCE API
  // ==========================================
  private createPresenceApi(): PresenceApi {
    return {
      updatePresence: async (presence: UserPresence): Promise<ApiResponse<UserPresence>> => {
        await this.initialize();
        this.presences.set(presence.userId, { ...presence, lastSeen: Date.now() });
        return { success: true, data: presence, timestamp: Date.now() };
      },

      getPresence: async (userId: string): Promise<ApiResponse<UserPresence>> => {
        await this.initialize();
        const p = this.presences.get(userId) || {
          userId,
          state: 'offline',
          lastSeen: Date.now() - 3600000,
        };
        return { success: true, data: p, timestamp: Date.now() };
      },

      getFriendsPresence: async (friendUserIds: string[]): Promise<ApiResponse<Record<string, UserPresence>>> => {
        await this.initialize();
        const map: Record<string, UserPresence> = {};
        for (const id of friendUserIds) {
          const f = this.friendsList.find((fr) => fr.friendUserId === id);
          if (f && f.presence) {
            map[id] = f.presence;
          } else {
            map[id] = { userId: id, state: 'offline', lastSeen: Date.now() - 86400000 };
          }
        }
        return { success: true, data: map, timestamp: Date.now() };
      },

      heartbeat: async (): Promise<ApiResponse<boolean>> => {
        return { success: true, data: true, timestamp: Date.now() };
      },
    };
  }

  // ==========================================
  // COSMETICS API
  // ==========================================
  private createCosmeticsApi(): CosmeticsApi {
    const getCatalog = async (category?: string): Promise<ApiResponse<CosmeticDefinition[]>> => {
      let list = [...DEFAULT_COSMETICS_CATALOG];
      if (category && category !== 'all') {
        list = list.filter((c) => c.category === category);
      }
      return { success: true, data: list, timestamp: Date.now() };
    };

    const getOwned = async (userId?: string): Promise<ApiResponse<CosmeticOwnership>> => {
      await this.initialize();
      if (!userId || userId === this.userProfile.id || userId === 'current') {
        return { success: true, data: { ...this.ownership }, timestamp: Date.now() };
      }
      return {
        success: true,
        data: { userId, ownedCosmeticIds: [], favorites: [], unlockedAt: {} },
        timestamp: Date.now(),
      };
    };

    const getEquipped = async (userId?: string): Promise<ApiResponse<CosmeticEquippedState>> => {
      await this.initialize();
      if (!userId || userId === this.userProfile.id || userId === 'current') {
        return { success: true, data: { ...this.equippedState }, timestamp: Date.now() };
      }
      return { success: true, data: { userId, equipped: {}, lastUpdated: Date.now() }, timestamp: Date.now() };
    };

    const equip = async (
      categoryOrUserId: string,
      cosmeticIdOrCategory: string,
      maybeCosmeticId?: string
    ): Promise<ApiResponse<CosmeticEquippedState>> => {
      await this.initialize();
      const category = (maybeCosmeticId !== undefined ? cosmeticIdOrCategory : categoryOrUserId) as CosmeticCategory;
      const cosmeticId = maybeCosmeticId !== undefined ? maybeCosmeticId : cosmeticIdOrCategory;

      if (cosmeticId) {
        if (!this.ownership.ownedCosmeticIds.includes(cosmeticId)) {
          return { success: false, error: 'You do not own this cosmetic.', timestamp: Date.now() };
        }
        this.equippedState.equipped[category] = cosmeticId;
      } else {
        delete this.equippedState.equipped[category];
      }

      this.equippedState.lastUpdated = Date.now();
      await this.saveEquipped();
      return { success: true, data: { ...this.equippedState }, timestamp: Date.now() };
    };

    const unequip = async (
      categoryOrUserId: string,
      maybeCategory?: string
    ): Promise<ApiResponse<CosmeticEquippedState>> => {
      await this.initialize();
      const category = (maybeCategory !== undefined ? maybeCategory : categoryOrUserId) as CosmeticCategory;
      delete this.equippedState.equipped[category];
      this.equippedState.lastUpdated = Date.now();
      await this.saveEquipped();
      return { success: true, data: { ...this.equippedState }, timestamp: Date.now() };
    };

    const toggleFav = async (
      cosmeticIdOrUserId: string,
      maybeCosmeticId?: string
    ): Promise<ApiResponse<string[]>> => {
      await this.initialize();
      const cosmeticId = maybeCosmeticId !== undefined ? maybeCosmeticId : cosmeticIdOrUserId;
      const idx = this.ownership.favorites.indexOf(cosmeticId);
      if (idx >= 0) {
        this.ownership.favorites.splice(idx, 1);
      } else {
        this.ownership.favorites.push(cosmeticId);
      }
      await this.saveOwnership();
      return { success: true, data: [...this.ownership.favorites], timestamp: Date.now() };
    };

    return {
      getCosmeticCatalog: getCatalog,
      getCatalog: getCatalog,
      getUserOwnership: getOwned,
      getOwnedCosmetics: getOwned,
      getEquippedCosmetics: getEquipped,
      equipCosmetic: equip,
      unequipCosmetic: unequip,
      toggleFavorite: toggleFav,
      getInGamePayload: async (playerModel?: 'default' | 'slim'): Promise<ApiResponse<InGameCosmeticsPayload>> => {
        const equipped = await getEquipped();
        return {
          success: true,
          data: {
            userId: this.userProfile.id,
            playerUuid: this.userProfile.id || '85e40702-8a90-3ce4-bf3e-86e5792c3a3b',
            cosmeticsEnabled: true,
            playerModel: playerModel || 'default',
            equipped: equipped.data ? (equipped.data as any).equipped || {} : {},
          },
          timestamp: Date.now(),
        };
      },
    };
  }
}
