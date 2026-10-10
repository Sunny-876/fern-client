import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleManager } from '../client/src/modules/ModuleManager';
import { HUDManager } from '../client/src/hud/HUDManager';
import { ThemeManager } from '../client/src/theme/ThemeManager';
import { ProfileManager } from '../client/src/profiles/ProfileManager';
import { KeybindManager } from '../client/src/keybinds/KeybindManager';
import { EventBus } from '../client/src/events/EventBus';
import { SettingsSearchEngine } from '../client/src/search/SettingsSearchEngine';
import { ModulePresetManager, ResetManager } from '../client/src/modules/ModulePresets';
import { FpsDisplayModule } from '../client/src/modules/impl/FpsDisplayModule';
import { KeystrokesModule } from '../client/src/modules/impl/KeystrokesModule';
import { CoordinatesDisplayModule } from '../client/src/modules/impl/CoordinatesDisplayModule';

describe('Deep Search, Presets & Reset System', () => {
  let eventBus: EventBus;
  let hudManager: HUDManager;
  let moduleManager: ModuleManager;
  let keybindManager: KeybindManager;
  let themeManager: ThemeManager;
  let profileManager: ProfileManager;

  beforeEach(() => {
    eventBus = new EventBus();
    hudManager = new HUDManager(eventBus);
    moduleManager = new ModuleManager(eventBus);
    keybindManager = new KeybindManager(eventBus);
    themeManager = new ThemeManager();

    moduleManager.registerModule(new FpsDisplayModule(hudManager));
    moduleManager.registerModule(new KeystrokesModule(hudManager));
    moduleManager.registerModule(new CoordinatesDisplayModule(hudManager));

    profileManager = new ProfileManager(
      hudManager,
      moduleManager,
      keybindManager,
      themeManager
    );
  });

  it('searches across modules, settings, HUD, themes, and profiles with breadcrumbs', () => {
    const searchEngine = new SettingsSearchEngine(
      moduleManager,
      hudManager,
      themeManager,
      profileManager
    );

    // Search for a module
    const modResults = searchEngine.search('fps');
    expect(modResults.length).toBeGreaterThan(0);
    expect(modResults.some((r) => r.type === 'module' && r.id === 'fps_display')).toBe(true);

    // Search for a setting
    const settingResults = searchEngine.search('prefix');
    expect(settingResults.some((r) => r.type === 'setting' && r.breadcrumb.includes('FPS Display'))).toBe(true);

    // Search for a theme
    const themeResults = searchEngine.search('contrast');
    expect(themeResults.some((r) => r.type === 'theme' && r.id === 'high_contrast')).toBe(true);

    // Search for a profile
    const profileResults = searchEngine.search('pvp');
    expect(profileResults.some((r) => r.type === 'profile' && r.id === 'pvp')).toBe(true);
  });

  it('applies module presets (PvP and Performance)', () => {
    const presetManager = new ModulePresetManager(moduleManager, hudManager);

    // Apply PvP preset
    presetManager.applyPreset('PvP');
    expect(moduleManager.getModule('keystrokes')?.isEnabled()).toBe(true);
    expect(moduleManager.getModule('fps_display')?.isEnabled()).toBe(true);

    // Apply Performance preset
    presetManager.applyPreset('Performance');
    expect(moduleManager.getModule('keystrokes')?.isEnabled()).toBe(false);
    expect(moduleManager.getModule('fps_display')?.isEnabled()).toBe(true);
  });

  it('resets modules, HUD elements, and performs full reset with confirmation', () => {
    const resetManager = new ResetManager(
      moduleManager,
      hudManager,
      themeManager,
      profileManager
    );

    const fpsMod = moduleManager.getModule('fps_display') as FpsDisplayModule;
    fpsMod.prefixSetting.setValue('CustomFrames:');
    expect(fpsMod.prefixSetting.value).toBe('CustomFrames:');

    // Reset single module
    expect(resetManager.resetModule('fps_display')).toBe(true);
    expect(fpsMod.prefixSetting.value).toBe('FPS:'); // Reverted to default

    // Reset without confirmation fails
    expect(resetManager.resetAll(false)).toBe(false);

    // Reset with confirmation succeeds
    expect(resetManager.resetAll(true)).toBe(true);
  });
});
