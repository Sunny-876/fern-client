import { describe, it, expect, beforeEach } from 'vitest';
import { KeybindManager } from '../client/src/keybinds/KeybindManager';
import { EventBus } from '../client/src/events/EventBus';
import { ModuleManager } from '../client/src/modules/ModuleManager';
import { HUDManager } from '../client/src/hud/HUDManager';
import { ModulePresetManager } from '../client/src/modules/ModulePresets';
import { FpsDisplayModule } from '../client/src/modules/impl/FpsDisplayModule';
import { PingDisplayModule } from '../client/src/modules/impl/PingDisplayModule';
import { CoordinatesDisplayModule } from '../client/src/modules/impl/CoordinatesDisplayModule';
import { CpsDisplayModule } from '../client/src/modules/impl/CpsDisplayModule';
import { KeystrokesModule } from '../client/src/modules/impl/KeystrokesModule';
import { ArmorHudModule } from '../client/src/modules/hud/ArmorHudModule';
import { PotionHudModule } from '../client/src/modules/hud/PotionHudModule';

describe('Phase 7 - Keybind Combos, Module Favorites & Presets', () => {
  describe('Keybind Combos & Conflict Detection', () => {
    let eventBus: EventBus;
    let keybindManager: KeybindManager;

    beforeEach(() => {
      eventBus = new EventBus();
      keybindManager = new KeybindManager(eventBus);
    });

    it('normalizes and registers modifier combinations like Ctrl + M', () => {
      let triggered = false;
      keybindManager.registerAction({
        id: 'open_fern_menu',
        name: 'Open Fern Menu',
        description: 'Opens main client menu',
        key: 'ctrl + m',
        defaultKey: 'ctrl + m',
        onTrigger: () => {
          triggered = true;
        },
      });

      const action = keybindManager.getAction('open_fern_menu');
      expect(action?.key).toBe('Ctrl + M');

      // Emulate Ctrl + M keypress
      eventBus.emit('key_press', {
        key: 'm',
        action: 'down',
        modifiers: { ctrl: true, shift: false, alt: false },
      });

      expect(triggered).toBe(true);
    });

    it('detects keybind conflicts and returns descriptive warning text', () => {
      keybindManager.registerAction({
        id: 'zoom_action',
        name: 'Zoom View',
        description: 'Zooms camera',
        key: 'C',
        defaultKey: 'C',
        onTrigger: () => {},
      });

      const conflictInfo = keybindManager.getConflictDetails('C');
      expect(conflictInfo.hasConflict).toBe(true);
      expect(conflictInfo.conflictingActions.length).toBe(1);
      expect(conflictInfo.warningText).toContain('Keybind already used by: Zoom View');

      const noConflict = keybindManager.getConflictDetails('Z');
      expect(noConflict.hasConflict).toBe(false);
      expect(noConflict.warningText).toBeUndefined();
    });

    it('detects conflicts across multiple actions', () => {
      keybindManager.registerAction({
        id: 'action_1',
        name: 'Action 1',
        description: 'First',
        key: 'F8',
        defaultKey: 'F8',
        onTrigger: () => {},
      });
      keybindManager.registerAction({
        id: 'action_2',
        name: 'Action 2',
        description: 'Second',
        key: 'F8',
        defaultKey: 'F8',
        onTrigger: () => {},
      });

      const conflicts = keybindManager.detectConflicts();
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].key).toBe('F8');
      expect(conflicts[0].actionIds).toEqual(['action_1', 'action_2']);
    });
  });

  describe('Module Favorites', () => {
    let eventBus: EventBus;
    let moduleManager: ModuleManager;
    let hudManager: HUDManager;

    beforeEach(() => {
      eventBus = new EventBus();
      moduleManager = new ModuleManager(eventBus);
      hudManager = new HUDManager(eventBus);

      moduleManager.registerModule(new FpsDisplayModule(hudManager));
      moduleManager.registerModule(new PingDisplayModule(hudManager));
    });

    it('manages favorite modules toggle and persistence', () => {
      expect(moduleManager.isFavorite('fps_display')).toBe(true);
      expect(moduleManager.isFavorite('ping_display')).toBe(false);

      const toggled = moduleManager.toggleFavorite('ping_display');
      expect(toggled).toBe(true);
      expect(moduleManager.isFavorite('ping_display')).toBe(true);

      const favorites = moduleManager.getFavoriteModules();
      expect(favorites.some((m) => m.id === 'ping_display')).toBe(true);

      moduleManager.setFavorites(['fps_display']);
      expect(moduleManager.isFavorite('ping_display')).toBe(false);
    });
  });

  describe('Feature Presets', () => {
    let eventBus: EventBus;
    let moduleManager: ModuleManager;
    let hudManager: HUDManager;
    let presetManager: ModulePresetManager;

    beforeEach(() => {
      eventBus = new EventBus();
      moduleManager = new ModuleManager(eventBus);
      hudManager = new HUDManager(eventBus);

      moduleManager.registerModule(new FpsDisplayModule(hudManager));
      moduleManager.registerModule(new PingDisplayModule(hudManager));
      moduleManager.registerModule(new CoordinatesDisplayModule(hudManager));
      moduleManager.registerModule(new CpsDisplayModule(hudManager));
      moduleManager.registerModule(new KeystrokesModule(hudManager));
      moduleManager.registerModule(new ArmorHudModule(hudManager));
      moduleManager.registerModule(new PotionHudModule(hudManager));

      presetManager = new ModulePresetManager(moduleManager, hudManager);
    });

    it('applies Minimal preset activating only core stats', () => {
      presetManager.applyPreset('Minimal');

      expect(moduleManager.getModule('fps_display')?.isEnabled()).toBe(true);
      expect(moduleManager.getModule('ping_display')?.isEnabled()).toBe(true);
      expect(moduleManager.getModule('coordinates_display')?.isEnabled()).toBe(true);
      expect(moduleManager.getModule('cps_display')?.isEnabled()).toBe(false);
      expect(moduleManager.getModule('keystrokes')?.isEnabled()).toBe(false);
    });

    it('applies PvP preset activating combat and utility HUD elements', () => {
      presetManager.applyPreset('PvP');

      expect(moduleManager.getModule('fps_display')?.isEnabled()).toBe(true);
      expect(moduleManager.getModule('keystrokes')?.isEnabled()).toBe(true);
      expect(moduleManager.getModule('cps_display')?.isEnabled()).toBe(true);
      expect(moduleManager.getModule('armor_hud')?.isEnabled()).toBe(true);
      expect(moduleManager.getModule('potion_hud')?.isEnabled()).toBe(true);
    });

    it('applies Streamer preset reducing visual clutter', () => {
      presetManager.applyPreset('Streamer');

      expect(moduleManager.getModule('fps_display')?.isEnabled()).toBe(true);
      expect(moduleManager.getModule('keystrokes')?.isEnabled()).toBe(false);
      expect(moduleManager.getModule('armor_hud')?.isEnabled()).toBe(false);
    });
  });
});
