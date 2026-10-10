import * as fs from 'fs/promises';
import * as path from 'path';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import {
  SocialPrivacySettings,
  DEFAULT_SOCIAL_PRIVACY,
} from '../../../shared/models/privacy';
import { UserPresence } from '../../../shared/models/social';

/**
 * Service managing social privacy controls, invisible mode, and presence redaction.
 * Ensures zero sensitive machine information, IP addresses, or file paths leak.
 */
export class PrivacyService {
  private privacyFile: string;
  private settings: SocialPrivacySettings = { ...DEFAULT_SOCIAL_PRIVACY };
  private initialized = false;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger
  ) {
    this.privacyFile = path.join(this.pathManager.getSocialDir(), 'privacy.json');
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.pathManager.getSocialDir(), { recursive: true });
      const raw = await fs.readFile(this.privacyFile, 'utf-8');
      const loaded = JSON.parse(raw);
      this.settings = {
        ...DEFAULT_SOCIAL_PRIVACY,
        ...loaded,
      };
      this.initialized = true;
      this.logger.info('PrivacyService', 'Loaded social privacy settings.');
    } catch {
      this.settings = { ...DEFAULT_SOCIAL_PRIVACY };
      await this.save();
      this.initialized = true;
    }
  }

  private async save(): Promise<void> {
    try {
      await fs.writeFile(this.privacyFile, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (err) {
      this.logger.error('PrivacyService', 'Failed to save privacy settings:', err);
    }
  }

  public async getSettings(): Promise<SocialPrivacySettings> {
    if (!this.initialized) await this.initialize();
    return { ...this.settings };
  }

  public async updateSettings(updates: Partial<SocialPrivacySettings>): Promise<SocialPrivacySettings> {
    if (!this.initialized) await this.initialize();
    this.settings = {
      ...this.settings,
      ...updates,
    };
    await this.save();
    this.logger.info('PrivacyService', 'Updated social privacy settings.');
    return { ...this.settings };
  }

  public isInvisible(): boolean {
    return this.settings.invisibleMode;
  }

  /**
   * Sanitizes a presence object according to current privacy rules before publishing.
   * Completely redacts any sensitive state if invisible mode or specific hides are enabled.
   */
  public sanitizePresence(presence: UserPresence): UserPresence {
    const copy: UserPresence = { ...presence };

    // 1. Invisible Mode or Online Status hidden: broadcast as offline
    if (this.settings.invisibleMode || !this.settings.showOnlineStatus) {
      return {
        userId: copy.userId,
        state: 'offline',
        lastSeen: Date.now(),
      };
    }

    // 2. Playing Status hidden: if in game, degrade to in_launcher or online
    if (!this.settings.showPlayingStatus && copy.state === 'playing_minecraft') {
      copy.state = 'in_launcher';
      delete copy.minecraftVersion;
      delete copy.installationName;
      delete copy.sessionStartTime;
    }

    // 3. Minecraft Version hidden
    if (!this.settings.showMinecraftVersion) {
      delete copy.minecraftVersion;
    }

    // 4. Installation Name hidden
    if (!this.settings.showInstallationName) {
      delete copy.installationName;
    }

    return copy;
  }
}
