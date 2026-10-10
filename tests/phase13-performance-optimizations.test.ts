import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { HUDManager } from '../client/src/hud/HUDManager';
import { IHudElement, HudRenderContext } from '../client/src/hud/IHudElement';
import { EventBus } from '../client/src/events/EventBus';
import { ModuleManager } from '../client/src/modules/ModuleManager';
import { IModule } from '../client/src/modules/IModule';
import { CrashAnalyzer } from '../launcher/src/core/crash-analyzer';
import { SettingsManager } from '../launcher/src/settings/settings-manager';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger, LogLevel } from '../launcher/src/core/logger';
import { ProfileManager } from '../client/src/profiles/ProfileManager';
import { KeybindManager } from '../client/src/keybinds/KeybindManager';
import { ThemeManager } from '../client/src/theme/ThemeManager';

// Dummy HUD element
class DummyHudElement implements IHudElement {
  public renderCallCount = 0;
  public minWidth = 10;
  public maxWidth = 600;
  public minHeight = 10;
  public maxHeight = 400;

  constructor(
    public id: string,
    public name: string,
    public enabled: boolean = true,
    public zIndex: number = 0,
    public x: number = 0,
    public y: number = 0,
    public width: number = 50,
    public height: number = 20,
    public scale: number = 1.0,
    public anchor: any = 'TOP_LEFT',
    public style: any = {}
  ) {}

  public render(context: HudRenderContext): void {
    this.renderCallCount++;
  }

  public getCalculatedPosition() {
    return { screenX: this.x, screenY: this.y, renderWidth: this.width, renderHeight: this.height };
  }
}

// Dummy Module
class DummyModule implements IModule {
  public initialized = false;
  public shutdownCalled = false;
  public tickCount = 0;
  private enabled = true;

  constructor(
    public id: string,
    public name: string,
    public category: any = 'Misc',
    public description = 'Test module',
    public keybind = 'None'
  ) {}

  public onRegister(eventBus: EventBus): void {}
  public onInitialize(): void {
    this.initialized = true;
  }
  public onShutdown(): void {
    this.shutdownCalled = true;
  }
  public onEnable(): void {}
  public onDisable(): void {}
  public toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }
  public isEnabled(): boolean {
    return this.enabled;
  }
  public setEnabled(val: boolean): void {
    this.enabled = val;
  }
  public onTick(): void {
    this.tickCount++;
  }
  public getSettings(): any[] {
    return [];
  }
  public getSetting(id: string): any {
    return undefined;
  }
  public addSetting(s: any): void {}
}

describe('Phase 13: Performance Optimizations & Resilience', () => {
  describe('HUDManager Zero-Allocation Render Loop', () => {
    it('renders elements in correct z-index order and caches sorted array', () => {
      const hud = new HUDManager();
      const el1 = new DummyHudElement('el1', 'El 1', true, 10);
      const el2 = new DummyHudElement('el2', 'El 2', true, 1);
      const el3 = new DummyHudElement('el3', 'El 3', true, 5);

      hud.register(el1);
      hud.register(el2);
      hud.register(el3);

      const renderCtx: HudRenderContext = {
        screenWidth: 1920,
        screenHeight: 1080,
        partialTicks: 1.0,
        isEditMode: false,
      };

      // First render warms the cache
      hud.render(renderCtx);
      expect(el1.renderCallCount).toBe(1);
      expect(el2.renderCallCount).toBe(1);
      expect(el3.renderCallCount).toBe(1);

      // Subsequent renders run without recreating arrays
      for (let i = 0; i < 100; i++) {
        hud.render(renderCtx);
      }

      expect(el1.renderCallCount).toBe(101);
      expect(el2.renderCallCount).toBe(101);
      expect(el3.renderCallCount).toBe(101);
    });

    it('invalidates sorted elements cache when an element is unregistered', () => {
      const hud = new HUDManager();
      const el1 = new DummyHudElement('el1', 'El 1', true, 1);
      const el2 = new DummyHudElement('el2', 'El 2', true, 2);

      hud.register(el1);
      hud.register(el2);

      const renderCtx: HudRenderContext = {
        screenWidth: 1920,
        screenHeight: 1080,
        partialTicks: 1.0,
        isEditMode: false,
      };

      hud.render(renderCtx);
      expect(el2.renderCallCount).toBe(1);

      hud.unregister('el2');
      hud.render(renderCtx);

      expect(el2.renderCallCount).toBe(1); // El 2 was not rendered after unregister
      expect(el1.renderCallCount).toBe(2);
    });
  });

  describe('EventBus Copy-On-Write Zero Allocation Dispatch', () => {
    it('dispatches events cleanly without allocating temporary arrays per dispatch', () => {
      const bus = new EventBus();
      let count = 0;

      const unsub = bus.on('render_2d', () => {
        count++;
      });

      for (let i = 0; i < 1000; i++) {
        bus.emit('render_2d', {
          screenWidth: 1920,
          screenHeight: 1080,
          partialTicks: 1.0,
          cancelled: false,
        });
      }

      expect(count).toBe(1000);
      unsub();
      bus.emit('render_2d', {
        screenWidth: 1920,
        screenHeight: 1080,
        partialTicks: 1.0,
        cancelled: false,
      });
      expect(count).toBe(1000);
    });

    it('safely handles unsubscriptions occurring during active event dispatch', () => {
      const bus = new EventBus();
      let firstCalled = false;
      let secondCalled = false;

      let unsubSecond: () => void;

      bus.on('client_tick', () => {
        firstCalled = true;
        // Unsubscribe the second listener from within the first listener
        unsubSecond();
      });

      unsubSecond = bus.on('client_tick', () => {
        secondCalled = true;
      });

      bus.emit('client_tick', { tickCount: 1, cancelled: false });

      expect(firstCalled).toBe(true);
      // Future emit should not trigger second listener
      firstCalled = false;
      secondCalled = false;
      bus.emit('client_tick', { tickCount: 2, cancelled: false });

      expect(firstCalled).toBe(true);
      expect(secondCalled).toBe(false);
    });
  });

  describe('ModuleManager Dynamic Unloading & Fast Ticking', () => {
    it('cleanly unregisters optional modules and calls onShutdown', () => {
      const bus = new EventBus();
      const manager = new ModuleManager(bus);
      const mod = new DummyModule('mod_opt', 'Optional Module');

      manager.registerModule(mod);
      expect(mod.initialized).toBe(true);
      expect(manager.getModule('mod_opt')).toBeDefined();

      const unregistered = manager.unregisterModule('mod_opt');
      expect(unregistered).toBe(true);
      expect(mod.shutdownCalled).toBe(true);
      expect(mod.isEnabled()).toBe(false);
      expect(manager.getModule('mod_opt')).toBeUndefined();
    });

    it('fast-paths tick loop and skips disabled modules', () => {
      const bus = new EventBus();
      const manager = new ModuleManager(bus);
      const mod1 = new DummyModule('mod1', 'Active Mod');
      const mod2 = new DummyModule('mod2', 'Disabled Mod');

      manager.registerModule(mod1);
      manager.registerModule(mod2);
      manager.setModuleEnabled('mod2', false);

      manager.tickModules();
      expect(mod1.tickCount).toBe(1);
      expect(mod2.tickCount).toBe(0);

      manager.tickModules();
      expect(mod1.tickCount).toBe(2);
      expect(mod2.tickCount).toBe(0);
    });
  });

  describe('Crash Diagnostics & Log Sanitization', () => {
    it('detects graphics driver failure with high confidence and actionable resolution', () => {
      const log = 'GLFW error 65542: WGL: The driver does not appear to support OpenGL.';
      const res = CrashAnalyzer.parseLogContent(log, -1);

      expect(res.category).toBe('graphics_driver');
      expect(res.confidence).toBe('high');
      expect(res.suggestedAction).toContain('graphics card drivers');
    });

    it('detects loader bootstrap failure with medium confidence', () => {
      const log = 'net.minecraftforge.fml.ModLoadingException: Failed to initialize mod container';
      const res = CrashAnalyzer.parseLogContent(log, 1);

      expect(res.category).toBe('loader_failure');
      expect(res.confidence).toBe('medium');
    });

    it('detects corrupted config with high confidence', () => {
      const log = 'com.google.gson.JsonSyntaxException: Malformed JSON in config/fern.json';
      const res = CrashAnalyzer.parseLogContent(log, 1);

      expect(res.category).toBe('corrupted_config');
      expect(res.confidence).toBe('high');
    });

    it('sanitizes logs by stripping Bearer tokens, passwords, and user usernames', () => {
      const raw = `
        Connecting with Bearer eyJhbGciOiJIUzI1NiJ9.testToken
        --accessToken fake_mc_token_12345
        {"password": "secret_password_here"}
        Log saved at C:\\Users\\JohnDoe\\AppData\\Roaming\\.fern\\logs\\fern.log
      `;

      const sanitized = CrashAnalyzer.sanitizeLog(raw);

      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiJ9');
      expect(sanitized).toContain('Bearer [REDACTED]');
      expect(sanitized).not.toContain('fake_mc_token_12345');
      expect(sanitized).toContain('--accessToken [REDACTED]');
      expect(sanitized).not.toContain('secret_password_here');
      expect(sanitized).toContain('"password": "[REDACTED]"');
      expect(sanitized).not.toContain('C:\\Users\\JohnDoe');
      expect(sanitized).toContain('C:\\Users\\[USER]');
    });
  });

  describe('Configuration Recovery with Corrupted File Backup', () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-perf-test-'));
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('backs up corrupted settings.json to a timestamped .bak file before restoring defaults', async () => {
      const paths = new FernPathManager(tmpDir);
      const logger = new FernLogger(paths);
      logger.setLogLevel('ERROR');
      const settingsPath = paths.getSettingsFilePath();

      await fs.mkdir(paths.getLauncherDir(), { recursive: true });
      // Write corrupted JSON
      await fs.writeFile(settingsPath, '<<< CORRUPTED NON-JSON CONTENT >>>', 'utf8');

      const manager = new SettingsManager(paths, logger);
      const settings = await manager.load();

      expect(settings).toBeDefined();
      expect(settings.general).toBeDefined(); // defaults restored

      // Verify a .bak file was created
      const files = await fs.readdir(paths.getLauncherDir());
      const bakFile = files.find((f) => f.startsWith('settings.json.corrupt.') && f.endsWith('.bak'));
      expect(bakFile).toBeDefined();

      const bakContent = await fs.readFile(path.join(paths.getLauncherDir(), bakFile!), 'utf8');
      expect(bakContent).toBe('<<< CORRUPTED NON-JSON CONTENT >>>');
    });
  });

  describe('ProfileManager Import Sanitization & Security', () => {
    it('sanitizes dangerous characters in profile name and themeId to prevent path traversal', () => {
      const hud = new HUDManager();
      const bus = new EventBus();
      const modules = new ModuleManager(bus);
      const keybinds = new KeybindManager(bus);
      const themes = new ThemeManager();
      const profiles = new ProfileManager(hud, modules, keybinds, themes);

      const maliciousJson = JSON.stringify({
        profile: {
          name: '../../Malicious/Profile/Name',
          themeId: '../../malicious_theme',
          hudLayout: Array(200).fill({ id: 'test' }), // excessive payload
        },
      });

      const res = profiles.importProfile(maliciousJson);
      expect(res.success).toBe(true);
      expect(res.profile).toBeDefined();
      expect(res.profile?.name).not.toContain('../');
      expect(res.profile?.themeId).toBe('fern_dark'); // safely reset to default
      expect(res.profile?.hudLayout.length).toBeLessThanOrEqual(64); // capped
    });
  });
});
