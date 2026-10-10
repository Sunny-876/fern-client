import * as fs from 'fs/promises';
import { FernSettings } from '../../../shared/models/settings';
import { CURRENT_SETTINGS_VERSION, DEFAULT_SETTINGS } from '../../../shared/config/defaults';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { FernError, FernErrorCode } from '../core/errors';

export type SettingsChangeListener = (newSettings: FernSettings) => void;

export class SettingsManager {
  private currentSettings: FernSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  private listeners: Set<SettingsChangeListener> = new Set();
  private isLoaded = false;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger
  ) {}

  public getSettings(): FernSettings {
    return JSON.parse(JSON.stringify(this.currentSettings));
  }

  public async load(): Promise<FernSettings> {
    const settingsPath = this.pathManager.getSettingsFilePath();

    try {
      await fs.access(settingsPath);
      const raw = await fs.readFile(settingsPath, 'utf-8');
      const parsed = JSON.parse(raw);

      this.currentSettings = this.migrateAndSanitize(parsed);
      this.isLoaded = true;
      this.logger.info('SettingsManager', 'Settings successfully loaded and validated.');
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.info('SettingsManager', 'Settings file not found, creating with defaults.');
        this.currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        await this.save(this.currentSettings);
        this.isLoaded = true;
      } else {
        this.logger.error('SettingsManager', 'Failed to load settings file, backing up and fallback to defaults:', err);
        try {
          const corruptBackupPath = `${settingsPath}.corrupt.${Date.now()}.bak`;
          await fs.copyFile(settingsPath, corruptBackupPath);
          this.logger.info('SettingsManager', `Backed up corrupted settings to ${corruptBackupPath}`);
        } catch (backupErr) {
          this.logger.warn('SettingsManager', `Could not create backup of corrupted settings: ${backupErr}`);
        }
        this.currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      }
    }

    return this.getSettings();
  }

  public async updateSettings(partial: Partial<FernSettings>): Promise<FernSettings> {
    const merged: FernSettings = {
      ...this.currentSettings,
      ...partial,
      general: { ...this.currentSettings.general, ...(partial.general || {}) },
      appearance: { ...this.currentSettings.appearance, ...(partial.appearance || {}) },
      minecraft: { ...this.currentSettings.minecraft, ...(partial.minecraft || {}) },
      java: { ...this.currentSettings.java, ...(partial.java || {}) },
      memory: { ...this.currentSettings.memory, ...(partial.memory || {}) },
      downloads: { ...this.currentSettings.downloads, ...(partial.downloads || {}) },
      updates: { ...this.currentSettings.updates, ...(partial.updates || {}) },
      privacy: { ...this.currentSettings.privacy, ...(partial.privacy || {}) },
      advanced: { ...this.currentSettings.advanced, ...(partial.advanced || {}) },
      performance: { ...this.currentSettings.performance, ...(partial.performance || {}) },
    };

    this.validate(merged);
    this.currentSettings = merged;
    await this.save(this.currentSettings);
    this.notifyListeners();
    return this.getSettings();
  }

  public onSettingsChange(listener: SettingsChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.getSettings());
      } catch (err) {
        this.logger.error('SettingsManager', 'Error in settings change listener:', err);
      }
    }
  }

  public validate(settings: FernSettings): void {
    if (settings.memory.defaultMinMemoryMb > settings.memory.defaultMaxMemoryMb) {
      throw new FernError(
        FernErrorCode.VALIDATION_ERROR,
        'Minimum memory cannot exceed maximum memory.',
        'Adjust the minimum RAM slider so it is less than or equal to the maximum RAM slider.'
      );
    }

    if (settings.appearance.uiScale < 0.5 || settings.appearance.uiScale > 2.5) {
      throw new FernError(
        FernErrorCode.VALIDATION_ERROR,
        'UI scale must be between 0.5 and 2.5.',
        'Reset UI scale to 1.0 in settings.'
      );
    }

    if (settings.downloads.maxConcurrentDownloads < 1 || settings.downloads.maxConcurrentDownloads > 16) {
      throw new FernError(
        FernErrorCode.VALIDATION_ERROR,
        'Concurrent downloads must be between 1 and 16.'
      );
    }
  }

  public migrateAndSanitize(loaded: unknown): FernSettings {
    if (!loaded || typeof loaded !== 'object') {
      return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }

    const data = loaded as Record<string, unknown>;
    const version = typeof data.version === 'number' ? data.version : 0;

    let migrated = { ...data };

    if (version < CURRENT_SETTINGS_VERSION) {
      this.logger.info(
        'SettingsManager',
        `Migrating settings from schema v${version} to v${CURRENT_SETTINGS_VERSION}`
      );
      // Migration logic for future schema increments
      migrated.version = CURRENT_SETTINGS_VERSION;
    }

    // Deep merge with defaults to ensure all required fields are present
    const result: FernSettings = {
      version: CURRENT_SETTINGS_VERSION,
      general: { ...DEFAULT_SETTINGS.general, ...(migrated.general as object || {}) },
      appearance: { ...DEFAULT_SETTINGS.appearance, ...(migrated.appearance as object || {}) },
      minecraft: { ...DEFAULT_SETTINGS.minecraft, ...(migrated.minecraft as object || {}) },
      java: { ...DEFAULT_SETTINGS.java, ...(migrated.java as object || {}) },
      memory: { ...DEFAULT_SETTINGS.memory, ...(migrated.memory as object || {}) },
      downloads: { ...DEFAULT_SETTINGS.downloads, ...(migrated.downloads as object || {}) },
      updates: { ...DEFAULT_SETTINGS.updates, ...(migrated.updates as object || {}) },
      privacy: { ...DEFAULT_SETTINGS.privacy, ...(migrated.privacy as object || {}) },
      advanced: { ...DEFAULT_SETTINGS.advanced, ...(migrated.advanced as object || {}) },
      performance: { ...DEFAULT_SETTINGS.performance, ...(migrated.performance as object || {}) },
    };

    return result;
  }

  private async save(settings: FernSettings): Promise<void> {
    const settingsPath = this.pathManager.getSettingsFilePath();
    await fs.mkdir(this.pathManager.getLauncherDir(), { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    this.logger.debug('SettingsManager', `Settings saved to ${settingsPath}`);
  }
}
