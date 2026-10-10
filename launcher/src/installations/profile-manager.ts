import * as fs from 'fs/promises';
import { FernProfile, CreateProfileDTO } from '../../../shared/models/profile';
import { DEFAULT_PROFILE } from '../../../shared/config/defaults';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { FernError, FernErrorCode } from '../core/errors';

interface StoredProfilesData {
  version: number;
  activeProfileId: string | null;
  profiles: FernProfile[];
}

export class ProfileManager {
  private profiles: Map<string, FernProfile> = new Map();
  private activeProfileId: string | null = null;
  private isLoaded = false;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger
  ) {}

  public async load(): Promise<void> {
    const filePath = this.pathManager.getProfilesFilePath();

    try {
      await fs.access(filePath);
      const raw = await fs.readFile(filePath, 'utf-8');
      const data: StoredProfilesData = JSON.parse(raw);

      this.profiles.clear();
      if (Array.isArray(data.profiles)) {
        for (const p of data.profiles) {
          this.profiles.set(p.id, p);
        }
      }

      this.activeProfileId = data.activeProfileId || null;

      if (!this.activeProfileId || !this.profiles.has(this.activeProfileId)) {
        const first = this.profiles.keys().next().value;
        this.activeProfileId = first || null;
      }

      this.isLoaded = true;
      this.logger.info('ProfileManager', `Loaded ${this.profiles.size} profile(s).`);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.info('ProfileManager', 'Profiles file not found, creating default profile.');
        this.profiles.clear();
        this.profiles.set(DEFAULT_PROFILE.id, { ...DEFAULT_PROFILE });
        this.activeProfileId = DEFAULT_PROFILE.id;
        await this.save();
        this.isLoaded = true;
      } else {
        this.logger.error('ProfileManager', 'Failed to load profiles file, backing up and fallback to defaults:', err);
        try {
          const corruptBackupPath = `${filePath}.corrupt.${Date.now()}.bak`;
          await fs.copyFile(filePath, corruptBackupPath);
          this.logger.info('ProfileManager', `Backed up corrupted profiles to ${corruptBackupPath}`);
        } catch (backupErr) {
          this.logger.warn('ProfileManager', `Could not create backup of corrupted profiles: ${backupErr}`);
        }
        this.profiles.clear();
        this.profiles.set(DEFAULT_PROFILE.id, { ...DEFAULT_PROFILE });
        this.activeProfileId = DEFAULT_PROFILE.id;
        this.isLoaded = true;
      }
    }
  }

  public getProfiles(): FernProfile[] {
    return Array.from(this.profiles.values());
  }

  public getProfile(id: string): FernProfile | undefined {
    return this.profiles.get(id);
  }

  public getActiveProfile(): FernProfile | null {
    if (!this.activeProfileId) return null;
    return this.profiles.get(this.activeProfileId) || null;
  }

  public async selectProfile(id: string): Promise<FernProfile> {
    const profile = this.profiles.get(id);
    if (!profile) {
      throw new FernError(FernErrorCode.PROFILE_NOT_FOUND, `Profile with ID ${id} not found.`);
    }

    this.activeProfileId = id;
    await this.save();
    this.logger.info('ProfileManager', `Active profile switched to: ${profile.name}`);
    return profile;
  }

  public async createProfile(dto: CreateProfileDTO): Promise<FernProfile> {
    if (!dto.name || !dto.name.trim()) {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Profile name is required.');
    }

    const now = Date.now();
    const id = `profile-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const profile: FernProfile = {
      id,
      name: dto.name.trim(),
      accountId: dto.accountId,
      installationId: dto.installationId,
      minecraftVersion: dto.minecraftVersion,
      javaPath: dto.javaPath,
      ramMb: dto.ramMb ?? 4096,
      mods: dto.mods || [],
      resourcePacks: dto.resourcePacks || [],
      shaderPacks: dto.shaderPacks || [],
      settings: dto.settings || {},
      launchArguments: dto.launchArguments || [],
      createdAt: now,
      updatedAt: now,
    };

    this.profiles.set(profile.id, profile);
    if (!this.activeProfileId) {
      this.activeProfileId = profile.id;
    }

    await this.save();
    this.logger.info('ProfileManager', `Created profile: ${profile.name}`);
    return profile;
  }

  public async updateProfile(id: string, partial: Partial<FernProfile>): Promise<FernProfile> {
    const existing = this.profiles.get(id);
    if (!existing) {
      throw new FernError(FernErrorCode.PROFILE_NOT_FOUND, `Profile ${id} not found.`);
    }

    const updated: FernProfile = {
      ...existing,
      ...partial,
      id: existing.id,
      updatedAt: Date.now(),
    };

    this.profiles.set(id, updated);
    await this.save();
    return updated;
  }

  public async deleteProfile(id: string): Promise<void> {
    if (!this.profiles.has(id)) {
      throw new FernError(FernErrorCode.PROFILE_NOT_FOUND, `Profile ${id} not found.`);
    }

    this.profiles.delete(id);
    if (this.activeProfileId === id) {
      const remaining = this.profiles.keys().next().value;
      this.activeProfileId = remaining || null;
    }

    await this.save();
    this.logger.info('ProfileManager', `Deleted profile: ${id}`);
  }

  private async save(): Promise<void> {
    const data: StoredProfilesData = {
      version: 1,
      activeProfileId: this.activeProfileId,
      profiles: Array.from(this.profiles.values()),
    };

    const filePath = this.pathManager.getProfilesFilePath();
    await fs.mkdir(this.pathManager.getLauncherDir(), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}
