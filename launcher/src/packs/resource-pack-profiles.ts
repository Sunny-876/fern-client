import * as fs from 'fs/promises';
import * as path from 'path';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { FernError, FernErrorCode } from '../core/errors';

export interface ResourcePackProfile {
  id: string;
  name: string;
  description: string;
  packNames: string[]; // In active priority order (first is top priority)
  createdAt: number;
  updatedAt: number;
}

export interface ResourcePackMetadataEntry {
  favorite: boolean;
  notes: string;
  tags: string[];
}

export interface PackCompatibilityCheck {
  isCompatible: boolean;
  expectedFormat: number;
  actualFormat?: number;
  message: string;
}

// Minecraft version to expected pack_format mapping
export const MINECRAFT_PACK_FORMAT_MAP: Record<string, number> = {
  '1.21.4': 46,
  '1.21.3': 42,
  '1.21.2': 42,
  '1.21.1': 34,
  '1.21': 34,
  '1.20.4': 22,
  '1.20.2': 18,
  '1.20.1': 15,
  '1.20': 15,
  '1.19.4': 13,
  '1.19.2': 9,
  '1.19': 9,
  '1.18.2': 8,
  '1.17.1': 7,
  '1.16.5': 6,
};

export function checkPackFormatCompatibility(
  actualPackFormat: number | undefined,
  minecraftVersion: string
): PackCompatibilityCheck {
  const cleanVer = minecraftVersion.trim();
  const expected = MINECRAFT_PACK_FORMAT_MAP[cleanVer] || 34;

  if (actualPackFormat === undefined) {
    return {
      isCompatible: false,
      expectedFormat: expected,
      actualFormat: undefined,
      message: 'Unknown format: pack.mcmeta does not specify pack_format.',
    };
  }

  if (actualPackFormat === expected) {
    return {
      isCompatible: true,
      expectedFormat: expected,
      actualFormat: actualPackFormat,
      message: `Directly compatible with Minecraft ${cleanVer} (pack format ${actualPackFormat}).`,
    };
  }

  if (actualPackFormat > expected) {
    return {
      isCompatible: false,
      expectedFormat: expected,
      actualFormat: actualPackFormat,
      message: `Pack designed for a newer Minecraft version (format ${actualPackFormat} vs expected ${expected}). May cause missing textures.`,
    };
  }

  return {
    isCompatible: false,
    expectedFormat: expected,
    actualFormat: actualPackFormat,
    message: `Pack designed for an older Minecraft version (format ${actualPackFormat} vs expected ${expected}). Textures may be outdated.`,
  };
}

export class ResourcePackProfileService {
  private profiles: Map<string, ResourcePackProfile> = new Map();
  private packMetadata: Map<string, ResourcePackMetadataEntry> = new Map();
  private filePath: string;
  private metaPath: string;
  private isLoaded = false;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger
  ) {
    this.filePath = path.join(this.pathManager.getLauncherDir(), 'resource-pack-profiles.json');
    this.metaPath = path.join(this.pathManager.getLauncherDir(), 'resource-pack-metadata.json');
  }

  public async load(): Promise<void> {
    try {
      await fs.access(this.filePath);
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const data = JSON.parse(raw);
      this.profiles.clear();
      if (Array.isArray(data.profiles)) {
        for (const p of data.profiles) {
          this.profiles.set(p.id, p);
        }
      }
    } catch {
      this.profiles.clear();
      // Setup default profile
      this.profiles.set('profile-vanilla-default', {
        id: 'profile-vanilla-default',
        name: 'Default Loadout',
        description: 'Standard order using vanilla assets without override packs.',
        packNames: ['vanilla'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    try {
      await fs.access(this.metaPath);
      const rawMeta = await fs.readFile(this.metaPath, 'utf-8');
      const metaData = JSON.parse(rawMeta);
      this.packMetadata.clear();
      if (metaData && typeof metaData === 'object') {
        for (const [key, val] of Object.entries(metaData)) {
          this.packMetadata.set(key, val as ResourcePackMetadataEntry);
        }
      }
    } catch {
      this.packMetadata.clear();
    }

    this.isLoaded = true;
    this.logger.info('ResourcePackProfileService', `Loaded ${this.profiles.size} pack profile(s).`);
  }

  public getProfiles(): ResourcePackProfile[] {
    return Array.from(this.profiles.values());
  }

  public getProfile(id: string): ResourcePackProfile | undefined {
    return this.profiles.get(id);
  }

  public async createProfile(
    name: string,
    description: string,
    packNames: string[] = []
  ): Promise<ResourcePackProfile> {
    if (!name || !name.trim()) {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Profile name cannot be empty.');
    }

    const id = `rp-profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const profile: ResourcePackProfile = {
      id,
      name: name.trim(),
      description: description.trim(),
      packNames: [...packNames],
      createdAt: now,
      updatedAt: now,
    };

    this.profiles.set(id, profile);
    await this.save();
    return profile;
  }

  public async updateProfile(
    id: string,
    updates: Partial<Omit<ResourcePackProfile, 'id' | 'createdAt'>>
  ): Promise<ResourcePackProfile> {
    const existing = this.profiles.get(id);
    if (!existing) {
      throw new FernError(FernErrorCode.RESOURCE_NOT_FOUND, `Pack profile ${id} not found.`);
    }

    const updated: ResourcePackProfile = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    };

    this.profiles.set(id, updated);
    await this.save();
    return updated;
  }

  public async deleteProfile(id: string): Promise<boolean> {
    const removed = this.profiles.delete(id);
    if (removed) {
      await this.save();
    }
    return removed;
  }

  public async toggleFavorite(packId: string): Promise<boolean> {
    const existing = this.packMetadata.get(packId) || {
      favorite: false,
      notes: '',
      tags: [],
    };
    existing.favorite = !existing.favorite;
    this.packMetadata.set(packId, existing);
    await this.saveMeta();
    return existing.favorite;
  }

  public isFavorite(packId: string): boolean {
    return this.packMetadata.get(packId)?.favorite ?? false;
  }

  public async setNote(packId: string, notes: string): Promise<void> {
    const existing = this.packMetadata.get(packId) || {
      favorite: false,
      notes: '',
      tags: [],
    };
    existing.notes = notes;
    this.packMetadata.set(packId, existing);
    await this.saveMeta();
  }

  public getNote(packId: string): string {
    return this.packMetadata.get(packId)?.notes ?? '';
  }

  public async setTags(packId: string, tags: string[]): Promise<void> {
    const existing = this.packMetadata.get(packId) || {
      favorite: false,
      notes: '',
      tags: [],
    };
    existing.tags = [...tags];
    this.packMetadata.set(packId, existing);
    await this.saveMeta();
  }

  public getTags(packId: string): string[] {
    return this.packMetadata.get(packId)?.tags ?? [];
  }

  /**
   * Applies the pack ordering to options.txt in the instance directory.
   */
  public async applyProfileToInstance(instanceGameDir: string, profileId: string): Promise<void> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new FernError(FernErrorCode.RESOURCE_NOT_FOUND, `Pack profile ${profileId} not found.`);
    }

    const optionsPath = path.join(instanceGameDir, 'options.txt');
    let content = '';
    try {
      content = await fs.readFile(optionsPath, 'utf-8');
    } catch {
      content = '';
    }

    // Minecraft options.txt resourcePacks format: resourcePacks:[file/pack.zip,vanilla]
    const formattedPacks = JSON.stringify(profile.packNames.map((p) => (p === 'vanilla' ? 'vanilla' : `file/${p}`)));
    const newLine = `resourcePacks:${formattedPacks}`;

    const lines = content.split(/\r?\n/);
    let replaced = false;
    const newLines = lines.map((line) => {
      if (line.startsWith('resourcePacks:')) {
        replaced = true;
        return newLine;
      }
      return line;
    });

    if (!replaced) {
      newLines.push(newLine);
    }

    await fs.mkdir(path.dirname(optionsPath), { recursive: true });
    await fs.writeFile(optionsPath, newLines.join('\n'), 'utf-8');
    this.logger.info(
      'ResourcePackProfileService',
      `Applied profile "${profile.name}" (${profile.packNames.length} packs) to ${optionsPath}`
    );
  }

  public exportProfile(profileId: string): string {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new FernError(FernErrorCode.RESOURCE_NOT_FOUND, `Pack profile ${profileId} not found.`);
    }
    return JSON.stringify(profile, null, 2);
  }

  public async importProfile(jsonStr: string): Promise<ResourcePackProfile> {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Invalid JSON for pack profile.');
    }

    if (!parsed.name || !Array.isArray(parsed.packNames)) {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Invalid pack profile structure.');
    }

    return this.createProfile(parsed.name, parsed.description || '', parsed.packNames);
  }

  private async save(): Promise<void> {
    const data = {
      version: 1,
      profiles: Array.from(this.profiles.values()),
    };
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  private async saveMeta(): Promise<void> {
    const obj: Record<string, ResourcePackMetadataEntry> = {};
    for (const [k, v] of this.packMetadata.entries()) {
      obj[k] = v;
    }
    await fs.mkdir(path.dirname(this.metaPath), { recursive: true });
    await fs.writeFile(this.metaPath, JSON.stringify(obj, null, 2), 'utf-8');
  }
}
