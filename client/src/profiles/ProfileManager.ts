import { SerializedHudElementConfig } from '../hud/IHudElement';
import { HUDManager } from '../hud/HUDManager';
import { ModuleManager } from '../modules/ModuleManager';
import { KeybindManager } from '../keybinds/KeybindManager';
import { ThemeManager } from '../theme/ThemeManager';
import { FernPerformanceEngine } from '../performance/core/FernPerformanceEngine';
import { PerformanceProfileType } from '../../../shared/models/performance';

export interface ClientProfile {
  id: string;
  name: string;
  description: string;
  isBuiltin?: boolean;
  created: number;
  updated: number;
  themeId: string;
  hudLayout: SerializedHudElementConfig[];
  moduleStates: Record<
    string,
    {
      enabled: boolean;
      keybind: string;
      settings: Record<string, any>;
    }
  >;
  keybinds: Record<string, string>;
  performanceProfile: PerformanceProfileType;
  favorites: string[];
  recentlyUsed: string[];
}

export class ProfileManager {
  private profiles: Map<string, ClientProfile> = new Map();
  private activeProfileId = 'default';

  constructor(
    private hudManager: HUDManager,
    private moduleManager: ModuleManager,
    private keybindManager: KeybindManager,
    private themeManager: ThemeManager,
    private performanceEngine?: FernPerformanceEngine
  ) {
    this.initBuiltinProfiles();
  }

  private initBuiltinProfiles(): void {
    // 1. Default Profile
    this.profiles.set('default', {
      id: 'default',
      name: 'Default',
      description: 'Standard Fern Client configuration with essential HUD and balanced performance.',
      isBuiltin: true,
      created: Date.now(),
      updated: Date.now(),
      themeId: 'fern_dark',
      hudLayout: [
        { id: 'hud_fps', enabled: true, x: 10, y: 10, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
        { id: 'hud_ping', enabled: true, x: 10, y: 30, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
        { id: 'hud_coords', enabled: true, x: 10, y: 50, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
        { id: 'hud_memory', enabled: false, x: 10, y: 70, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
        { id: 'hud_session', enabled: false, x: 10, y: 90, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
        { id: 'hud_keystrokes', enabled: false, x: 10, y: 120, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
        { id: 'hud_cps', enabled: false, x: 10, y: 200, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
        { id: 'hud_perf_telemetry', enabled: false, x: 10, y: 10, scale: 1.0, anchor: 'TOP_RIGHT', zIndex: 1 },
      ],
      moduleStates: {
        fps_display: { enabled: true, keybind: 'None', settings: { show_background: true, prefix: 'FPS:' } },
        ping_display: { enabled: true, keybind: 'None', settings: { show_background: true, prefix: 'Ping:' } },
        coordinates_display: { enabled: true, keybind: 'None', settings: { show_background: true, show_nether: false } },
        memory_display: { enabled: false, keybind: 'None', settings: {} },
        session_timer: { enabled: false, keybind: 'None', settings: {} },
        keystrokes: { enabled: false, keybind: 'None', settings: {} },
        cps_display: { enabled: false, keybind: 'None', settings: {} },
        performance_hud: { enabled: false, keybind: 'None', settings: {} },
        performance_controls: { enabled: false, keybind: 'None', settings: {} },
      },
      keybinds: {
        open_fern_menu: 'Right Shift',
        toggle_hud_edit: 'None',
      },
      performanceProfile: 'balanced',
      favorites: ['fps_display', 'coordinates_display'],
      recentlyUsed: ['fps_display'],
    });

    // 2. PvP Profile
    this.profiles.set('pvp', {
      id: 'pvp',
      name: 'PvP',
      description: 'Optimized for combat awareness with Keystrokes, CPS, Ping, and high FPS.',
      isBuiltin: true,
      created: Date.now(),
      updated: Date.now(),
      themeId: 'fern_dark',
      hudLayout: [
        { id: 'hud_fps', enabled: true, x: 10, y: 10, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
        { id: 'hud_ping', enabled: true, x: 10, y: 28, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
        { id: 'hud_coords', enabled: true, x: 10, y: 46, scale: 0.95, anchor: 'TOP_LEFT', zIndex: 1 },
        { id: 'hud_cps', enabled: true, x: 10, y: 110, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 2 },
        { id: 'hud_keystrokes', enabled: true, x: 10, y: 135, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 2 },
      ],
      moduleStates: {
        fps_display: { enabled: true, keybind: 'None', settings: {} },
        ping_display: { enabled: true, keybind: 'None', settings: {} },
        coordinates_display: { enabled: true, keybind: 'None', settings: {} },
        keystrokes: { enabled: true, keybind: 'None', settings: {} },
        cps_display: { enabled: true, keybind: 'None', settings: {} },
      },
      keybinds: {
        open_fern_menu: 'Right Shift',
      },
      performanceProfile: 'potato',
      favorites: ['keystrokes', 'cps_display', 'fps_display'],
      recentlyUsed: ['keystrokes', 'cps_display'],
    });

    // 3. Performance Profile
    this.profiles.set('performance', {
      id: 'performance',
      name: 'Performance',
      description: 'Maximum frame rate profile with comprehensive telemetry and minimal background loads.',
      isBuiltin: true,
      created: Date.now(),
      updated: Date.now(),
      themeId: 'oled_midnight',
      hudLayout: [
        { id: 'hud_perf_telemetry', enabled: true, x: 10, y: 10, scale: 1.0, anchor: 'TOP_RIGHT', zIndex: 2 },
        { id: 'hud_memory', enabled: true, x: 10, y: 35, scale: 1.0, anchor: 'TOP_RIGHT', zIndex: 2 },
        { id: 'hud_fps', enabled: true, x: 10, y: 10, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      ],
      moduleStates: {
        fps_display: { enabled: true, keybind: 'None', settings: {} },
        memory_display: { enabled: true, keybind: 'None', settings: {} },
        performance_hud: { enabled: true, keybind: 'None', settings: {} },
        performance_controls: { enabled: true, keybind: 'None', settings: {} },
      },
      keybinds: {
        open_fern_menu: 'Right Shift',
      },
      performanceProfile: 'potato',
      favorites: ['performance_hud', 'fps_display'],
      recentlyUsed: ['performance_hud'],
    });

    // 4. Minimal Profile
    this.profiles.set('minimal', {
      id: 'minimal',
      name: 'Minimal',
      description: 'Ultra-clean HUD with minimal overlays, zero distractions, and balanced latency.',
      isBuiltin: true,
      created: Date.now(),
      updated: Date.now(),
      themeId: 'fern_dark',
      hudLayout: [
        { id: 'hud_fps', enabled: true, x: 10, y: 10, scale: 0.9, anchor: 'TOP_LEFT', zIndex: 1 },
      ],
      moduleStates: {
        fps_display: { enabled: true, keybind: 'None', settings: { show_background: false } },
        coordinates_display: { enabled: false, keybind: 'None', settings: {} },
        ping_display: { enabled: false, keybind: 'None', settings: {} },
      },
      keybinds: {
        open_fern_menu: 'Right Shift',
      },
      performanceProfile: 'balanced',
      favorites: ['fps_display'],
      recentlyUsed: ['fps_display'],
    });

    // 5. Survival Profile
    this.profiles.set('survival', {
      id: 'survival',
      name: 'Survival',
      description: 'Essential exploration HUD with Coordinates, Session Timer, and balanced graphics.',
      isBuiltin: true,
      created: Date.now(),
      updated: Date.now(),
      themeId: 'fern_dark',
      hudLayout: [
        { id: 'hud_fps', enabled: true, x: 10, y: 10, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
        { id: 'hud_coords', enabled: true, x: 10, y: 30, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
        { id: 'hud_session', enabled: true, x: 10, y: 55, scale: 0.95, anchor: 'TOP_LEFT', zIndex: 1 },
      ],
      moduleStates: {
        fps_display: { enabled: true, keybind: 'None', settings: {} },
        coordinates_display: { enabled: true, keybind: 'None', settings: { show_nether: true } },
        session_timer: { enabled: true, keybind: 'None', settings: {} },
      },
      keybinds: {
        open_fern_menu: 'Right Shift',
      },
      performanceProfile: 'balanced',
      favorites: ['coordinates_display', 'session_timer'],
      recentlyUsed: ['coordinates_display'],
    });

    // 6. Building Profile
    this.profiles.set('building', {
      id: 'building',
      name: 'Building',
      description: 'High-fidelity graphics with coordinates and unhindered center-screen visibility.',
      isBuiltin: true,
      created: Date.now(),
      updated: Date.now(),
      themeId: 'fern_dark',
      hudLayout: [
        { id: 'hud_fps', enabled: true, x: 10, y: 10, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
        { id: 'hud_coords', enabled: true, x: 10, y: 30, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      ],
      moduleStates: {
        fps_display: { enabled: true, keybind: 'None', settings: {} },
        coordinates_display: { enabled: true, keybind: 'None', settings: {} },
      },
      keybinds: {
        open_fern_menu: 'Right Shift',
      },
      performanceProfile: 'quality',
      favorites: ['coordinates_display', 'fps_display'],
      recentlyUsed: ['coordinates_display'],
    });

    // 7. Streaming Profile
    this.profiles.set('streaming', {
      id: 'streaming',
      name: 'Streaming',
      description: 'Privacy-oriented streaming profile: coordinates hidden, clean HUD, high visual fidelity.',
      isBuiltin: true,
      created: Date.now(),
      updated: Date.now(),
      themeId: 'fern_dark',
      hudLayout: [
        { id: 'hud_fps', enabled: true, x: 15, y: 15, scale: 1.0, anchor: 'TOP_RIGHT', zIndex: 1 },
        { id: 'hud_session', enabled: true, x: 15, y: 35, scale: 1.0, anchor: 'TOP_RIGHT', zIndex: 1 },
        { id: 'hud_coords', enabled: false, x: 10, y: 50, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      ],
      moduleStates: {
        fps_display: { enabled: true, keybind: 'None', settings: {} },
        session_timer: { enabled: true, keybind: 'None', settings: {} },
        coordinates_display: { enabled: false, keybind: 'None', settings: {} },
      },
      keybinds: {
        open_fern_menu: 'Right Shift',
      },
      performanceProfile: 'quality',
      favorites: ['fps_display', 'session_timer'],
      recentlyUsed: ['session_timer'],
    });

    // 8. Recording Profile (alias)
    this.profiles.set('recording', {
      ...this.profiles.get('streaming')!,
      id: 'recording',
      name: 'Recording',
    });
  }

  private previousProfileState: ClientProfile | null = null;

  public getActiveProfile(): ClientProfile {
    return this.profiles.get(this.activeProfileId) || this.profiles.get('default')!;
  }

  public getActiveProfileId(): string {
    return this.activeProfileId;
  }

  public getAllProfiles(): ClientProfile[] {
    return Array.from(this.profiles.values());
  }

  public createProfile(name: string, description: string, copyFromId?: string): ClientProfile {
    const id = `profile_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const base = copyFromId ? this.profiles.get(copyFromId) : this.getActiveProfile();

    const newProfile: ClientProfile = {
      id,
      name,
      description,
      isBuiltin: false,
      created: Date.now(),
      updated: Date.now(),
      themeId: base?.themeId || 'fern_dark',
      hudLayout: base?.hudLayout ? JSON.parse(JSON.stringify(base.hudLayout)) : [],
      moduleStates: base?.moduleStates ? JSON.parse(JSON.stringify(base.moduleStates)) : {},
      keybinds: base?.keybinds ? JSON.parse(JSON.stringify(base.keybinds)) : {},
      performanceProfile: base?.performanceProfile || 'balanced',
      favorites: base?.favorites ? [...base.favorites] : [],
      recentlyUsed: [],
    };

    this.profiles.set(id, newProfile);
    return newProfile;
  }

  public deleteProfile(id: string): boolean {
    const profile = this.profiles.get(id);
    if (!profile || profile.isBuiltin) return false;

    if (this.activeProfileId === id) {
      this.switchProfile('default');
    }
    return this.profiles.delete(id);
  }

  /**
   * Switches active profile and applies all associated subsystems:
   * HUD, Modules, Keybinds, Theme, Performance Engine.
   */
  public switchProfile(id: string, savePrevious = true): boolean {
    const profile = this.profiles.get(id);
    if (!profile) return false;

    // 1. Capture current profile state before switching
    this.captureActiveState();

    if (savePrevious) {
      const current = this.getActiveProfile();
      this.previousProfileState = JSON.parse(JSON.stringify(current));
    }

    this.activeProfileId = id;

    // 2. Apply Theme
    if (profile.themeId) {
      this.themeManager.setTheme(profile.themeId);
    }

    // 3. Apply HUD Layout
    if (profile.hudLayout && Array.isArray(profile.hudLayout)) {
      this.hudManager.deserialize(profile.hudLayout);
    }

    // 4. Apply Modules and Settings
    if (profile.moduleStates) {
      for (const [modId, state] of Object.entries(profile.moduleStates)) {
        const mod = this.moduleManager.getModule(modId);
        if (mod) {
          if (typeof state.enabled === 'boolean') {
            this.moduleManager.setModuleEnabled(modId, state.enabled);
          }
          if (state.keybind) {
            mod.keybind = state.keybind;
          }
          if (state.settings) {
            for (const [settingId, val] of Object.entries(state.settings)) {
              const setting = mod.getSetting(settingId);
              if (setting) setting.deserialize(val);
            }
          }
        }
      }
    }

    // 5. Apply Keybinds
    if (profile.keybinds) {
      for (const [actionId, key] of Object.entries(profile.keybinds)) {
        this.keybindManager.setKeybind(actionId, key);
      }
    }

    // 6. Apply Performance Profile
    if (profile.performanceProfile && this.performanceEngine) {
      this.performanceEngine.applyProfile(profile.performanceProfile);
    }

    return true;
  }

  public getPreviousProfile(): ClientProfile | null {
    return this.previousProfileState;
  }

  public restorePreviousProfile(): boolean {
    if (!this.previousProfileState) return false;
    const prev = this.previousProfileState;
    this.profiles.set(prev.id, prev);
    return this.switchProfile(prev.id, false);
  }

  public previewProfile(targetId: string): {
    currentProfileId: string;
    targetProfileId: string;
    themeDiff: { from: string; to: string };
    performanceDiff: { from: string; to: string };
    hudDiff: {
      newElements: string[];
      removedElements: string[];
    };
    moduleDiff: {
      enabled: string[];
      disabled: string[];
    };
  } | null {
    const current = this.getActiveProfile();
    const target = this.profiles.get(targetId);
    if (!target) return null;

    const currentHud = new Set((current.hudLayout || []).filter((h) => h.enabled).map((h) => h.id));
    const targetHud = new Set((target.hudLayout || []).filter((h) => h.enabled).map((h) => h.id));

    const currentMods = new Set(
      Object.entries(current.moduleStates || {})
        .filter(([_, s]) => s.enabled)
        .map(([id]) => id)
    );
    const targetMods = new Set(
      Object.entries(target.moduleStates || {})
        .filter(([_, s]) => s.enabled)
        .map(([id]) => id)
    );

    return {
      currentProfileId: current.id,
      targetProfileId: target.id,
      themeDiff: { from: current.themeId, to: target.themeId },
      performanceDiff: { from: current.performanceProfile, to: target.performanceProfile },
      hudDiff: {
        newElements: Array.from(targetHud).filter((id) => !currentHud.has(id)),
        removedElements: Array.from(currentHud).filter((id) => !targetHud.has(id)),
      },
      moduleDiff: {
        enabled: Array.from(targetMods).filter((id) => !currentMods.has(id)),
        disabled: Array.from(currentMods).filter((id) => !targetMods.has(id)),
      },
    };
  }

  /**
   * Captures runtime subsystem state into the active profile.
   */
  public captureActiveState(): void {
    const active = this.getActiveProfile();
    active.updated = Date.now();
    active.themeId = this.themeManager.getActiveThemeId();
    active.hudLayout = this.hudManager.serialize();

    const states: ClientProfile['moduleStates'] = {};
    for (const mod of this.moduleManager.getAllModules()) {
      const settingsObj: Record<string, any> = {};
      for (const s of mod.getSettings()) {
        settingsObj[s.id] = s.serialize();
      }
      states[mod.id] = {
        enabled: mod.isEnabled(),
        keybind: mod.keybind,
        settings: settingsObj,
      };
    }
    active.moduleStates = states;

    const keybinds: Record<string, string> = {};
    for (const action of this.keybindManager.getAllActions()) {
      keybinds[action.id] = action.key;
    }
    active.keybinds = keybinds;

    if (this.performanceEngine) {
      active.performanceProfile = this.performanceEngine.getSettings().profile;
    }
  }

  /**
   * Exports profile to JSON string with strict sanitization of credentials.
   */
  public exportProfile(id: string): string | null {
    const profile = this.profiles.get(id);
    if (!profile) return null;

    // Strict sanitization: ensure no auth tokens, passwords, or personal keys can ever leak
    const sanitized = {
      version: 1,
      exportedAt: Date.now(),
      profile: {
        id: profile.id,
        name: profile.name,
        description: profile.description,
        themeId: profile.themeId,
        hudLayout: profile.hudLayout,
        moduleStates: profile.moduleStates,
        keybinds: profile.keybinds,
        performanceProfile: profile.performanceProfile,
        favorites: profile.favorites,
      },
    };

    return JSON.stringify(sanitized, null, 2);
  }

  /**
   * Imports a profile from a JSON string with schema validation.
   */
  public importProfile(jsonStr: string): { success: boolean; profile?: ClientProfile; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      const data = parsed.profile || parsed;

      if (!data || typeof data !== 'object' || !data.name) {
        return { success: false, error: 'Invalid profile format: missing profile name' };
      }

      const cleanName = String(data.name).replace(/[\\/\0]/g, '').trim().slice(0, 64);
      if (!cleanName) {
        return { success: false, error: 'Invalid profile format: invalid or empty profile name' };
      }

      // Sanitize theme ID to prevent path traversal
      const rawThemeId = typeof data.themeId === 'string' ? data.themeId : 'fern_dark';
      const cleanThemeId = /^[a-zA-Z0-9_-]+$/.test(rawThemeId) ? rawThemeId : 'fern_dark';

      // Cap array sizes to prevent memory exhaustion
      const hudLayout = Array.isArray(data.hudLayout) ? data.hudLayout.slice(0, 64) : [];
      const favorites = Array.isArray(data.favorites)
        ? data.favorites.filter((f: any) => typeof f === 'string').slice(0, 50)
        : [];

      const importedId = `profile_import_${Date.now()}`;
      const imported: ClientProfile = {
        id: importedId,
        name: cleanName,
        description: typeof data.description === 'string' ? data.description.slice(0, 256) : 'Imported profile',
        isBuiltin: false,
        created: Date.now(),
        updated: Date.now(),
        themeId: cleanThemeId,
        hudLayout,
        moduleStates: data.moduleStates && typeof data.moduleStates === 'object' ? data.moduleStates : {},
        keybinds: data.keybinds && typeof data.keybinds === 'object' ? data.keybinds : {},
        performanceProfile: ['potato', 'balanced', 'quality', 'custom'].includes(data.performanceProfile)
          ? data.performanceProfile
          : 'balanced',
        favorites,
        recentlyUsed: [],
      };

      this.profiles.set(importedId, imported);
      return { success: true, profile: imported };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public addFavorite(moduleId: string): void {
    const active = this.getActiveProfile();
    if (!active.favorites.includes(moduleId)) {
      active.favorites.push(moduleId);
    }
  }

  public removeFavorite(moduleId: string): void {
    const active = this.getActiveProfile();
    active.favorites = active.favorites.filter((id) => id !== moduleId);
  }

  public recordRecentlyUsed(settingOrModuleId: string): void {
    const active = this.getActiveProfile();
    active.recentlyUsed = [
      settingOrModuleId,
      ...active.recentlyUsed.filter((id) => id !== settingOrModuleId),
    ].slice(0, 10);
  }
}
