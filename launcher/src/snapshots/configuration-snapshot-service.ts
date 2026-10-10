import * as fs from 'fs/promises';
import * as path from 'path';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { FernError, FernErrorCode } from '../core/errors';
import { SettingsManager } from '../settings/settings-manager';

export interface ConfigurationSnapshotMetadata {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  type: 'configuration_only';
  summary: {
    theme?: string;
    performanceMode?: string;
    hudElementCount?: number;
    moduleCount?: number;
    settingsKeysCount: number;
  };
}

export interface ConfigurationSnapshotContent {
  metadata: ConfigurationSnapshotMetadata;
  settings: Record<string, any>;
  clientProfile?: {
    id: string;
    themeId: string;
    hudLayout: any[];
    moduleStates: Record<string, any>;
    keybinds: Record<string, string>;
  };
  customModConfigs?: Record<string, string>; // relative filename -> text content
}

export interface SettingsDiffEntry {
  path: string;
  previousValue: any;
  currentValue: any;
  status: 'added' | 'removed' | 'modified';
}

export class ConfigurationSnapshotService {
  private snapshotsDir: string;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger,
    private settingsManager?: SettingsManager
  ) {
    this.snapshotsDir = this.pathManager.getSnapshotsDir();
  }

  public async initialize(): Promise<void> {
    await fs.mkdir(this.snapshotsDir, { recursive: true });
  }

  /**
   * Sanitizes any secret, authentication token, password, or session hash.
   */
  public sanitizeSecrets(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeSecrets(item));
    }

    const clean: Record<string, any> = {};
    const sensitiveKeys = [
      'token',
      'accesstoken',
      'refreshtoken',
      'clienttoken',
      'password',
      'secret',
      'fern_token',
      'auth',
      'credential',
      'cookie',
    ];

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        clean[key] = this.sanitizeSecrets(value);
      } else {
        const lower = key.toLowerCase();
        if (sensitiveKeys.some((s) => lower.includes(s))) {
          clean[key] = '[REDACTED_CREDENTIAL]';
        } else {
          clean[key] = value;
        }
      }
    }

    return clean;
  }

  public async createSnapshot(params: {
    name: string;
    description?: string;
    settingsOverride?: Record<string, any>;
    clientProfile?: any;
    customModConfigs?: Record<string, string>;
  }): Promise<ConfigurationSnapshotMetadata> {
    await this.initialize();

    if (!params.name || !params.name.trim()) {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Snapshot name cannot be empty.');
    }

    const id = `snap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    const rawSettings =
      params.settingsOverride ||
      (this.settingsManager ? this.settingsManager.getSettings() : {});
    const cleanSettings = this.sanitizeSecrets(rawSettings);

    // Sanitize any profile credentials
    const cleanProfile = params.clientProfile
      ? this.sanitizeSecrets(params.clientProfile)
      : undefined;

    // Sanitize any mod configs
    const cleanModConfigs: Record<string, string> = {};
    if (params.customModConfigs) {
      for (const [key, val] of Object.entries(params.customModConfigs)) {
        // Prevent path traversal
        if (key.includes('..') || path.isAbsolute(key)) {
          throw new FernError(FernErrorCode.SECURITY_VIOLATION, `Invalid mod config path: ${key}`);
        }
        cleanModConfigs[key] = val;
      }
    }

    const metadata: ConfigurationSnapshotMetadata = {
      id,
      name: params.name.trim(),
      description: params.description?.trim() || '',
      createdAt: now,
      type: 'configuration_only',
      summary: {
        theme: cleanProfile?.themeId || cleanSettings?.theme,
        performanceMode: cleanSettings?.performance?.mode,
        hudElementCount: cleanProfile?.hudLayout?.length || 0,
        moduleCount: cleanProfile?.moduleStates ? Object.keys(cleanProfile.moduleStates).length : 0,
        settingsKeysCount: Object.keys(cleanSettings).length,
      },
    };

    const snapshotContent: ConfigurationSnapshotContent = {
      metadata,
      settings: cleanSettings,
      clientProfile: cleanProfile,
      customModConfigs: cleanModConfigs,
    };

    const destFile = path.join(this.snapshotsDir, `${id}.json`);
    await fs.writeFile(destFile, JSON.stringify(snapshotContent, null, 2), 'utf-8');

    this.logger.info('ConfigurationSnapshotService', `Created snapshot ${id} (${metadata.name})`);
    return metadata;
  }

  public async listSnapshots(): Promise<ConfigurationSnapshotMetadata[]> {
    await this.initialize();

    try {
      const files = await fs.readdir(this.snapshotsDir);
      const results: ConfigurationSnapshotMetadata[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const filePath = path.join(this.snapshotsDir, file);
        try {
          const raw = await fs.readFile(filePath, 'utf-8');
          const data: ConfigurationSnapshotContent = JSON.parse(raw);
          if (data.metadata && data.metadata.type === 'configuration_only') {
            results.push(data.metadata);
          }
        } catch {
          // ignore corrupted snapshot files
        }
      }

      return results.sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }

  public async getSnapshot(id: string): Promise<ConfigurationSnapshotContent> {
    const cleanId = path.basename(id).replace(/\.json$/, '');
    const filePath = path.join(this.snapshotsDir, `${cleanId}.json`);

    try {
      await fs.access(filePath);
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      throw new FernError(FernErrorCode.RESOURCE_NOT_FOUND, `Snapshot with ID ${id} not found.`);
    }
  }

  public async deleteSnapshot(id: string): Promise<boolean> {
    const cleanId = path.basename(id).replace(/\.json$/, '');
    const filePath = path.join(this.snapshotsDir, `${cleanId}.json`);

    try {
      await fs.unlink(filePath);
      this.logger.info('ConfigurationSnapshotService', `Deleted snapshot ${id}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Compares two snapshots and returns structured differences.
   */
  public async compareSnapshots(
    idA: string,
    idB: string
  ): Promise<{ metadataA: ConfigurationSnapshotMetadata; metadataB: ConfigurationSnapshotMetadata; diffs: SettingsDiffEntry[] }> {
    const snapA = await this.getSnapshot(idA);
    const snapB = await this.getSnapshot(idB);
    const diffs: SettingsDiffEntry[] = [];

    const flatten = (obj: any, prefix = ''): Record<string, any> => {
      let out: Record<string, any> = {};
      if (!obj || typeof obj !== 'object') return out;
      for (const [key, val] of Object.entries(obj)) {
        const full = prefix ? `${prefix}.${key}` : key;
        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
          Object.assign(out, flatten(val, full));
        } else {
          out[full] = val;
        }
      }
      return out;
    };

    const flatA = flatten({ settings: snapA.settings, profile: snapA.clientProfile });
    const flatB = flatten({ settings: snapB.settings, profile: snapB.clientProfile });

    const allKeys = new Set([...Object.keys(flatA), ...Object.keys(flatB)]);

    for (const key of allKeys) {
      const valA = flatA[key];
      const valB = flatB[key];

      if (valA === undefined && valB !== undefined) {
        diffs.push({ path: key, previousValue: undefined, currentValue: valB, status: 'added' });
      } else if (valA !== undefined && valB === undefined) {
        diffs.push({ path: key, previousValue: valA, currentValue: undefined, status: 'removed' });
      } else if (JSON.stringify(valA) !== JSON.stringify(valB)) {
        diffs.push({ path: key, previousValue: valA, currentValue: valB, status: 'modified' });
      }
    }

    return {
      metadataA: snapA.metadata,
      metadataB: snapB.metadata,
      diffs,
    };
  }

  /**
   * Restores a snapshot into the current active settings.
   */
  public async restoreSnapshot(
    id: string,
    options?: { restoreSettings?: boolean; targetInstanceConfigDir?: string }
  ): Promise<{ restoredSettings: boolean; restoredModConfigs: number }> {
    const snapshot = await this.getSnapshot(id);
    let restoredSettings = false;
    let restoredModConfigs = 0;

    if ((options?.restoreSettings ?? true) && this.settingsManager) {
      await this.settingsManager.updateSettings(snapshot.settings as any);
      restoredSettings = true;
    }

    if (options?.targetInstanceConfigDir && snapshot.customModConfigs) {
      const targetDir = path.resolve(options.targetInstanceConfigDir);
      for (const [relPath, content] of Object.entries(snapshot.customModConfigs)) {
        if (relPath.includes('..') || path.isAbsolute(relPath)) continue;
        const dest = path.resolve(targetDir, relPath);
        if (!dest.startsWith(targetDir + path.sep)) continue;

        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.writeFile(dest, content, 'utf-8');
        restoredModConfigs++;
      }
    }

    this.logger.info(
      'ConfigurationSnapshotService',
      `Restored snapshot ${id} (Settings: ${restoredSettings}, ModConfigs: ${restoredModConfigs})`
    );

    return { restoredSettings, restoredModConfigs };
  }
}
