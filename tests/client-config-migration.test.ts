import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager, CURRENT_CONFIG_VERSION } from '../client/src/config/ConfigManager';
import { ModuleManager } from '../client/src/modules/ModuleManager';
import { HUDManager } from '../client/src/hud/HUDManager';
import { EventBus } from '../client/src/events/EventBus';

describe('Configuration Migration & Versioning - Schema Upgrades & Recovery', () => {
  let tempDir: string;
  let eventBus: EventBus;
  let moduleManager: ModuleManager;
  let hudManager: HUDManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fern-migration-test-'));
    eventBus = new EventBus();
    hudManager = new HUDManager(eventBus);
    moduleManager = new ModuleManager(eventBus);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('migrates legacy v1 client.json to v2 schema without losing user settings', async () => {
    const configDir = path.join(tempDir, 'Fern', 'config');
    fs.mkdirSync(configDir, { recursive: true });

    // Seed v1 client configuration
    const legacyConfigV1 = {
      version: 1,
      theme: 'fern_dark',
      debugMode: true,
      menuKeybind: 'F12',
      uiScale: 1.5,
    };

    fs.writeFileSync(path.join(configDir, 'client.json'), JSON.stringify(legacyConfigV1, null, 2));

    const config = new ConfigManager(tempDir, moduleManager, hudManager);
    const res = await config.loadAll();

    expect(res.success).toBe(true);
    expect(res.migratedFrom).toBe(1);

    const migrated = config.getClientConfig();
    expect(migrated.version).toBe(CURRENT_CONFIG_VERSION);
    // Preserved old user preferences
    expect(migrated.theme).toBe('fern_dark');
    expect(migrated.debugMode).toBe(true);
    expect(migrated.menuKeybind).toBe('F12');
    expect(migrated.uiScale).toBe(1.5);
    // Added new v2 properties
    expect(migrated.reduceMotion).toBe(false);
    expect(migrated.activeProfile).toBe('default');

    // Verify disk copy was upgraded
    const rawDisk = JSON.parse(fs.readFileSync(path.join(configDir, 'client.json'), 'utf8'));
    expect(rawDisk.version).toBe(CURRENT_CONFIG_VERSION);
  });

  it('backs up corrupted JSON configuration and recovers defaults cleanly', async () => {
    const configDir = path.join(tempDir, 'Fern', 'config');
    fs.mkdirSync(configDir, { recursive: true });

    // Seed malformed JSON
    fs.writeFileSync(path.join(configDir, 'client.json'), '<<< CORRUPTED NON-JSON CONTENT >>>');

    const config = new ConfigManager(tempDir, moduleManager, hudManager);
    const res = await config.loadAll();

    expect(res.success).toBe(true);
    expect(res.recoveredFiles).toContain('client.json');
    expect(config.getClientConfig().version).toBe(CURRENT_CONFIG_VERSION);

    // Verify .bak file created
    const files = fs.readdirSync(configDir);
    const backupFile = files.find((f) => f.startsWith('client.json.corrupt_'));
    expect(backupFile).toBeDefined();
  });
});
