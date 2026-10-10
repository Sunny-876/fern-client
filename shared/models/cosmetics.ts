export type CosmeticCategory = 'cape' | 'cloak' | 'hat' | 'accessory' | 'emote';

export type CosmeticRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type PlayerModelType = 'default' | 'slim' | 'both';

/**
 * Immutable definition of a cosmetic item.
 */
export interface CosmeticDefinition {
  id: string; // e.g. "cape_fern_emerald"
  name: string; // e.g. "Fern Emerald Cape"
  category: CosmeticCategory;
  rarity: CosmeticRarity;
  description: string;
  assetPath: string; // Relative asset path or URI (e.g. "assets/cosmetics/capes/emerald.png")
  previewUrl: string; // Preview thumbnail or SVG icon
  modelType: PlayerModelType; // Applies to standard (Steve) or slim (Alex) or both
  animated?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Tracks cosmetics owned by a specific Fern user.
 */
export interface CosmeticOwnership {
  userId: string;
  ownedCosmeticIds: string[];
  favorites: string[];
  unlockedAt: Record<string, number>; // cosmeticId -> timestamp
}

/**
 * Tracks currently equipped cosmetics per category for a user.
 */
export interface CosmeticEquippedState {
  userId: string;
  equipped: Partial<Record<CosmeticCategory, string>>; // category -> cosmeticId
  lastUpdated: number;
}

/**
 * Combined model for UI views that merges definition with ownership and equipped state.
 */
export interface UserCosmeticItem extends CosmeticDefinition {
  isOwned: boolean;
  isEquipped: boolean;
  isFavorite: boolean;
}

/**
 * Payload sent to Minecraft client runtime to render equipped cosmetics.
 */
export interface InGameCosmeticsPayload {
  userId: string;
  playerUuid: string;
  playerModel: 'default' | 'slim';
  equipped: Partial<Record<CosmeticCategory, CosmeticDefinition>>;
  cosmeticsEnabled: boolean;
}
