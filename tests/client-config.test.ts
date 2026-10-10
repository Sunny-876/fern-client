import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager } from '../client/src/config/ConfigManager';
import { ModuleManager } from '../client/src/modules/ModuleManager';
import { HUDManager } from '../client/src/hud/HUDManager';
import { EventBus } from '../client/src/events/EventBus';
import { FpsDisplayModule } from '../client/src/modules/impl/FpsDisplayModule';

describe('Configuration System - Persistence, Backup & Corruption Recovery', () => {
  let tempDir: string;
  let eventBus: EventBus;
  let moduleManager: ModuleManager;
  let hudManager: HUDManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fern-config-test-'));
    eventBus = new EventBus();
    hudManager = new HUDManager(eventBus);
    moduleManager = new ModuleManager(eventBus);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('initializes config directory and saves all configuration files', async () => {
    const config = new ConfigManager(tempDir, moduleManager, hudManager);
    const fpsMod = new FpsDisplayModule(hudManager);
    moduleManager.registerModule(fpsMod);

    fpsMod.prefixSetting.setValue('Frames:');
    moduleManager.setModuleEnabled('fps_display', true);

    await config.initialize();
    await config.saveAll();

    const configDir = path.join(tempDir, 'Fern', 'config');
    expect(fs.existsSync(path.join(configDir, 'client.json'))).toBe(true);
    expect(fs.existsSync(path.join(configDir, 'modules.json'))).toBe(true);
    expect(fs.existsSync(path.join(configDir, 'hud.json'))).toBe(true);

    const clientRaw = fs.readFileSync(path.join(configDir, 'client.json'), 'utf8');
    const clientJson = JSON.parse(clientRaw);
    expect(clientJson.theme).toBe('fern_dark');
    expect(clientJson.menuKeybind).toBe('Right Shift');

    const modulesRaw = fs.readFileSync(path.join(configDir, 'modules.json'), 'utf8');
    const modulesJson = JSON.parse(modulesRaw);
    expect(modulesJson.fps_display.enabled).toBe(true);
    expect(modulesJson.fps_display.settings.prefix).toBe('Frames:');
  });

  it('restores state from saved files upon load', async () => {
    const configDir = path.join(tempDir, 'Fern', 'config');
    fs.mkdirSync(configDir, { recursive: true });

    // Seed saved configuration
    fs.writeFileSync(
      path.join(configDir, 'client.json'),
      JSON.stringify({
        version: 1,
        theme: 'fern_dark',
        debugMode: true,
        menuKeybind: 'F12',
        uiScale: 1.25,
      })
    );

    fs.writeFileSync(
      path.join(configDir, 'modules.json'),
      JSON.stringify({
        fps_display: {
          enabled: true,
          keybind: 'F9',
          settings: {
            prefix: 'FPS_READOUT:',
            show_background: false,
          },
        },
      })
    );

    const fpsMod = new FpsDisplayModule(hudManager);
    moduleManager.registerModule(fpsMod);

    const config = new ConfigManager(tempDir, moduleManager, hudManager);
    const result = await config.loadAll();

    expect(result.success).toBe(true);
    expect(result.recoveredFiles).toHaveLength(0);

    expect(config.getClientConfig().debugMode).toBe(true);
    expect(config.getClientConfig().menuKeybind).toBe('F12');
    expect(fpsMod.isEnabled()).toBe(true);
    expect(fpsMod.keybind).toBe('F9');
    expect(fpsMod.prefixSetting.value).toBe('FPS_READOUT:');
    expect(fpsMod.showBackgroundSetting.value).toBe(false);
  });

  it('recovers gracefully from corrupted JSON and creates backup without crashing', async () => {
    const configDir = path.join(tempDir, 'Fern', 'config');
    fs.mkdirSync(configDir, { recursive: true });

    // Corrupt client.json and modules.json intentionally
    fs.writeFileSync(path.join(configDir, 'client.json'), '{ "theme": "corrupted",, INVALID JSON... }');
    fs.writeFileSync(path.join(configDir, 'modules.json'), 'NOT JSON AT ALL');

    const config = new ConfigManager(tempDir, moduleManager, hudManager);
    const result = await config.loadAll();

    expect(result.success).toBe(true);
    expect(result.recoveredFiles).toContain('client.json');
    expect(result.recoveredFiles).toContain('modules.json');

    // Defaults should be restored
    expect(config.getClientConfig().theme).toBe('fern_dark');

    // .bak backup files should have been generated
    const files = fs.readdirSync(configDir);
    const clientBaks = files.filter((f) => f.startsWith('client.json.corrupt_'));
    const modulesBaks = files.filter((f) => f.startsWith('modules.json.corrupt_'));

    expect(clientBaks.length).toBeGreaterThan(0);
    expect(modulesBaks.length).toBeGreaterThan(0);
  });
});
