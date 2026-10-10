import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileManager } from '../client/src/profiles/ProfileManager';
import { HUDManager } from '../client/src/hud/HUDManager';
import { ModuleManager } from '../client/src/modules/ModuleManager';
import { KeybindManager } from '../client/src/keybinds/KeybindManager';
import { ThemeManager } from '../client/src/theme/ThemeManager';
import { EventBus } from '../client/src/events/EventBus';
import { FpsDisplayModule } from '../client/src/modules/impl/FpsDisplayModule';
import { PingDisplayModule } from '../client/src/modules/impl/PingDisplayModule';
import { KeystrokesModule } from '../client/src/modules/impl/KeystrokesModule';
import { FernPerformanceEngine } from '../client/src/performance/core/FernPerformanceEngine';

describe('ProfileManager - Complete Client Configuration Profiles', () => {
  let eventBus: EventBus;
  let hudManager: HUDManager;
  let moduleManager: ModuleManager;
  let keybindManager: KeybindManager;
  let themeManager: ThemeManager;
  let perfEngine: FernPerformanceEngine;
  let profileManager: ProfileManager;

  beforeEach(() => {
    eventBus = new EventBus();
    hudManager = new HUDManager(eventBus);
    moduleManager = new ModuleManager(eventBus);
    keybindManager = new KeybindManager(eventBus);
    themeManager = new ThemeManager();
    perfEngine = new FernPerformanceEngine();

    moduleManager.registerModule(new FpsDisplayModule(hudManager));
    moduleManager.registerModule(new PingDisplayModule(hudManager));
    moduleManager.registerModule(new KeystrokesModule(hudManager));

    profileManager = new ProfileManager(
      hudManager,
      moduleManager,
      keybindManager,
      themeManager,
      perfEngine
    );
  });

  it('initializes default built-in profiles (Default, PvP, Performance, Recording)', () => {
    const profiles = profileManager.getAllProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(4);

    const ids = profiles.map((p) => p.id);
    expect(ids).toContain('default');
    expect(ids).toContain('pvp');
    expect(ids).toContain('performance');
    expect(ids).toContain('recording');
  });

  it('creates, deletes, and switches profiles synchronizing all subsystems', () => {
    // Create new profile based on Default
    const custom = profileManager.createProfile('My Custom Profile', 'Custom profile for testing');
    expect(custom).toBeDefined();
    expect(profileManager.getAllProfiles().some((p) => p.id === custom.id)).toBe(true);

    // Switch to PvP profile
    const switched = profileManager.switchProfile('pvp');
    expect(switched).toBe(true);
    expect(profileManager.getActiveProfileId()).toBe('pvp');

    // Keystrokes should be enabled in PvP profile
    const keystrokesMod = moduleManager.getModule('keystrokes');
    expect(keystrokesMod?.isEnabled()).toBe(true);

    // Delete custom profile
    expect(profileManager.deleteProfile(custom.id)).toBe(true);
    expect(profileManager.getAllProfiles().some((p) => p.id === custom.id)).toBe(false);

    // Cannot delete built-in profile
    expect(profileManager.deleteProfile('default')).toBe(false);
  });

  it('exports profile safely without sensitive tokens and imports back', () => {
    const json = profileManager.exportProfile('pvp');
    expect(json).toBeDefined();
    expect(json).toContain('"name": "PvP"');

    // Verify no credentials or auth tokens leaked
    expect(json).not.toContain('accessToken');
    expect(json).not.toContain('password');

    // Import into manager
    const res = profileManager.importProfile(json!);
    expect(res.success).toBe(true);
    expect(res.profile?.name).toBe('PvP');
  });

  it('tracks favorites and recently used settings', () => {
    profileManager.addFavorite('fps_display');
    expect(profileManager.getActiveProfile().favorites).toContain('fps_display');

    profileManager.recordRecentlyUsed('fps_limit');
    expect(profileManager.getActiveProfile().recentlyUsed[0]).toBe('fps_limit');

    profileManager.removeFavorite('fps_display');
    expect(profileManager.getActiveProfile().favorites).not.toContain('fps_display');
  });
});
