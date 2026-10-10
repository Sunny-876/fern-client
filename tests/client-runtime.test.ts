import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FernClient } from '../client/src/core/FernClient';

describe('FernClient Runtime - Complete In-Game Orchestration', () => {
  let tempDir: string;
  let client: FernClient;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fern-runtime-test-'));
    FernClient.resetInstance();
    client = new FernClient();
  });

  afterEach(async () => {
    if (client.isInitialized()) {
      await client.shutdown();
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('initializes runtime, registers 9 builtin modules, and sets up keybinds', async () => {
    expect(client.isInitialized()).toBe(false);

    await client.initialize({
      mcVersion: '1.21.1',
      loader: 'Fabric',
      instanceGameDir: tempDir,
    });

    expect(client.isInitialized()).toBe(true);
    expect(client.getVersion()).toBe('1.0.0-phase7');

    // Verify built-in modules are registered (core + Phase 7 modules)
    const mods = client.moduleManager.getAllModules();
    expect(mods.length).toBe(22);

    const moduleIds = mods.map((m) => m.id);
    expect(moduleIds).toContain('fps_display');
    expect(moduleIds).toContain('ping_display');
    expect(moduleIds).toContain('coordinates_display');
    expect(moduleIds).toContain('memory_display');
    expect(moduleIds).toContain('session_timer');
    expect(moduleIds).toContain('keystrokes');
    expect(moduleIds).toContain('cps_display');
    expect(moduleIds).toContain('performance_hud');
    expect(moduleIds).toContain('performance_controls');
    expect(moduleIds).toContain('zoom');
    expect(moduleIds).toContain('fullbright');
    expect(moduleIds).toContain('custom_crosshair');
    expect(moduleIds).toContain('hit_color');
    expect(moduleIds).toContain('armor_hud');
    expect(moduleIds).toContain('potion_hud');
    expect(moduleIds).toContain('direction_hud');
    expect(moduleIds).toContain('world_info_hud');
    expect(moduleIds).toContain('server_info_hud');
    expect(moduleIds).toContain('waypoints_hud');
    expect(moduleIds).toContain('chat_customizer');

    // Verify keybind actions exist
    const menuAction = client.keybindManager.getAction('open_fern_menu');
    expect(menuAction).toBeDefined();
    expect(menuAction?.key).toBe('Right Shift');
  });

  it('opens and closes Fern Menu and captures input correctly', async () => {
    await client.initialize({ instanceGameDir: tempDir });

    expect(client.uiManager.menu.isMenuOpen()).toBe(false);
    expect(client.uiManager.shouldCaptureInput()).toBe(false);

    // Press Right Shift -> Menu opens
    const capturedDown = client.handleKey('Right Shift', 'down');
    expect(client.uiManager.menu.isMenuOpen()).toBe(true);
    expect(client.uiManager.shouldCaptureInput()).toBe(true);
    expect(capturedDown).toBe(true);

    // Press Escape -> Menu closes
    const capturedEsc = client.handleKey('Escape', 'down');
    expect(client.uiManager.menu.isMenuOpen()).toBe(false);
    expect(client.uiManager.shouldCaptureInput()).toBe(false);
    expect(capturedEsc).toBe(true);
  });

  it('renders 2D HUD elements and overlay contexts without errors', async () => {
    await client.initialize({ instanceGameDir: tempDir });

    // Enable FPS and Coordinates modules
    client.moduleManager.setModuleEnabled('fps_display', true);
    client.moduleManager.setModuleEnabled('coordinates_display', true);

    const drawRectSpy = vi.fn();
    const drawTextSpy = vi.fn();

    // Trigger render2D across 1080p canvas
    expect(() => {
      client.render2D({
        screenWidth: 1920,
        screenHeight: 1080,
        partialTicks: 0.5,
        drawRect: drawRectSpy,
        drawText: drawTextSpy,
      });
    }).not.toThrow();

    expect(drawTextSpy).toHaveBeenCalled();
  });

  it('records mouse and keystrokes in Keystrokes & CPS modules', async () => {
    await client.initialize({ instanceGameDir: tempDir });

    const keystrokesMod = client.moduleManager.getModule('keystrokes') as any;
    const cpsMod = client.moduleManager.getModule('cps_display') as any;

    client.moduleManager.setModuleEnabled('keystrokes', true);
    client.moduleManager.setModuleEnabled('cps_display', true);

    expect(keystrokesMod.hudElement.keyState.w).toBe(false);

    // Send 'w' key down
    client.handleKey('w', 'down');
    expect(keystrokesMod.hudElement.keyState.w).toBe(true);

    // Send 'w' key up
    client.handleKey('w', 'up');
    expect(keystrokesMod.hudElement.keyState.w).toBe(false);

    // Send LMB click
    client.handleMouse(0, 'down');
    const cps = cpsMod.hudElement.getCps();
    expect(cps.left).toBeGreaterThanOrEqual(1);
  });

  it('exposes complete debug telemetry information', async () => {
    await client.initialize({
      mcVersion: '1.21.1',
      loader: 'NeoForge',
      instanceGameDir: tempDir,
    });

    const debug = client.getDebugInfo();
    expect(debug.fernVersion).toBe('1.0.0-phase7');
    expect(debug.minecraftVersion).toBe('1.21.1');
    expect(debug.loader).toBe('NeoForge');
    expect(debug.loadedModules).toBe(22);
    expect(debug.activeTheme).toBe('Fern Dark');
    expect(debug.isMenuOpen).toBe(false);
  });

  it('persists configuration on shutdown and shuts down cleanly', async () => {
    await client.initialize({ instanceGameDir: tempDir });

    client.moduleManager.setModuleEnabled('ping_display', true);
    const pingMod = client.moduleManager.getModule('ping_display') as any;
    pingMod.prefixSetting.setValue('Latency:');

    await client.shutdown();
    expect(client.isInitialized()).toBe(false);

    // Check modules.json was persisted
    const modulesFile = path.join(tempDir, 'Fern', 'config', 'modules.json');
    expect(fs.existsSync(modulesFile)).toBe(true);

    const saved = JSON.parse(fs.readFileSync(modulesFile, 'utf8'));
    expect(saved.ping_display.enabled).toBe(true);
    expect(saved.ping_display.settings.prefix).toBe('Latency:');
  });
});
