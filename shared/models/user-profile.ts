export type ProfileVisibility = 'public' | 'friends_only' | 'private';

export interface FernUserProfile {
  id: string; // Fern Unique User ID (e.g. "fern_usr_...")
  username: string; // Unique username (3-20 chars, alphanumeric + underscores)
  displayName: string; // Display name (1-32 chars)
  avatar: string; // Avatar identifier or image URL / default preset
  bio?: string; // Optional bio (max 160 chars)
  createdAt: number; // Timestamp
  lastActive: number; // Timestamp
  favoriteMinecraftVersion?: string; // e.g. "1.21.4"
  favoriteInstallation?: string; // e.g. "Fern Performance"
  profileVisibility: ProfileVisibility;
  onlineStatusVisibility: ProfileVisibility;
  playingStatusVisibility: ProfileVisibility;
  badges: string[]; // e.g. ["early_supporter", "beta_tester"]
}

export interface UpdateUserProfileDTO {
  displayName?: string;
  avatar?: string;
  bio?: string;
  favoriteMinecraftVersion?: string;
  favoriteInstallation?: string;
  profileVisibility?: ProfileVisibility;
  onlineStatusVisibility?: ProfileVisibility;
  playingStatusVisibility?: ProfileVisibility;
}

export class UserProfileValidator {
  public static readonly USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

  public static validateUsername(username: string): { valid: boolean; error?: string } {
    if (!username || typeof username !== 'string') {
      return { valid: false, error: 'Username is required.' };
    }
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      return { valid: false, error: 'Username must be at least 3 characters.' };
    }
    if (trimmed.length > 20) {
      return { valid: false, error: 'Username must not exceed 20 characters.' };
    }
    if (!this.USERNAME_REGEX.test(trimmed)) {
      return { valid: false, error: 'Username can only contain letters, numbers, and underscores.' };
    }
    return { valid: true };
  }

  public static validateDisplayName(displayName: string): { valid: boolean; error?: string } {
    if (!displayName || typeof displayName !== 'string') {
      return { valid: false, error: 'Display name is required.' };
    }
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      return { valid: false, error: 'Display name must be at least 2 characters.' };
    }
    if (trimmed.length > 32) {
      return { valid: false, error: 'Display name must not exceed 32 characters.' };
    }
    return { valid: true };
  }

  public static validateBio(bio?: string): { valid: boolean; error?: string } {
    if (!bio) return { valid: true };
    if (bio.length > 250) {
      return { valid: false, error: 'Bio must not exceed 250 characters.' };
    }
    return { valid: true };
  }

  public static validateUpdate(dto: UpdateUserProfileDTO): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (dto.displayName !== undefined) {
      const v = this.validateDisplayName(dto.displayName);
      if (!v.valid && v.error) errors.push(v.error);
    }
    if (dto.bio !== undefined) {
      const v = this.validateBio(dto.bio);
      if (!v.valid && v.error) errors.push(v.error);
    }
    return { valid: errors.length === 0, errors };
  }
}
