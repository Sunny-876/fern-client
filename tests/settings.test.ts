import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { SettingsManager } from '../launcher/src/settings/settings-manager';
import { DEFAULT_SETTINGS } from '../shared/config/defaults';

describe('SettingsManager', () => {
  let tempDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let settingsManager: SettingsManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-settings-test-'));
    pathManager = new FernPathManager(tempDir);
    logger = new FernLogger(pathManager);
    settingsManager = new SettingsManager(pathManager, logger);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('loads default settings when file does not exist', async () => {
    const loaded = await settingsManager.load();
    expect(loaded.version).toBe(DEFAULT_SETTINGS.version);
    expect(loaded.memory.defaultMaxMemoryMb).toBe(DEFAULT_SETTINGS.memory.defaultMaxMemoryMb);
    expect(loaded.appearance.theme).toBe('dark');
  });

  it('updates partial settings and preserves other categories', async () => {
    await settingsManager.load();
    await settingsManager.updateSettings({
      memory: {
        defaultMinMemoryMb: 3072,
        defaultMaxMemoryMb: 6144,
      },
      appearance: {
        theme: 'oled',
        accentColor: '#10b981',
        reduceMotion: true,
        uiScale: 1.2,
      },
    });

    const current = settingsManager.getSettings();
    expect(current.memory.defaultMaxMemoryMb).toBe(6144);
    expect(current.memory.defaultMinMemoryMb).toBe(3072);
    expect(current.appearance.theme).toBe('oled');
    // General settings should remain defaults
    expect(current.general.keepLauncherOpen).toBe(DEFAULT_SETTINGS.general.keepLauncherOpen);
  });

  it('validates settings and rejects invalid configurations', async () => {
    await settingsManager.load();

    // Invalid memory: min > max
    await expect(
      settingsManager.updateSettings({
        memory: {
          defaultMinMemoryMb: 8192,
          defaultMaxMemoryMb: 4096,
        },
      })
    ).rejects.toThrow();

    // Invalid UI scale
    await expect(
      settingsManager.updateSettings({
        appearance: {
          ...DEFAULT_SETTINGS.appearance,
          uiScale: 5.0,
        },
      })
    ).rejects.toThrow();
  });

  it('migrates legacy schemas gracefully', () => {
    const legacy = {
      version: 0,
      memory: {
        defaultMaxMemoryMb: 2048,
      },
    };

    const migrated = settingsManager.migrateAndSanitize(legacy);
    expect(migrated.version).toBe(DEFAULT_SETTINGS.version);
    expect(migrated.memory.defaultMaxMemoryMb).toBe(2048);
    expect(migrated.general).toBeDefined();
    expect(migrated.appearance).toBeDefined();
  });
});
