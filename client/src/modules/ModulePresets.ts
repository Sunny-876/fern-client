import { ModuleManager } from './ModuleManager';
import { HUDManager } from '../hud/HUDManager';
import { ThemeManager } from '../theme/ThemeManager';
import { ProfileManager } from '../profiles/ProfileManager';

export type ModulePresetType = 'Minimal' | 'PvP' | 'Performance' | 'Streamer' | 'Default';

export class ModulePresetManager {
  constructor(
    private moduleManager: ModuleManager,
    private hudManager: HUDManager
  ) {}

  public applyPreset(type: ModulePresetType): void {
    let activeIds: string[] = [];

    switch (type) {
      case 'Minimal':
        activeIds = ['fps_display', 'ping_display', 'coordinates_display'];
        break;
      case 'PvP':
        activeIds = [
          'fps_display',
          'ping_display',
          'cps_display',
          'keystrokes',
          'armor_hud',
          'potion_hud',
          'coordinates_display',
        ];
        break;
      case 'Performance':
        activeIds = ['fps_display', 'memory_display', 'performance_hud', 'performance_controls'];
        break;
      case 'Streamer':
        // Minimal HUD with clean layout and reduced visual clutter
        activeIds = ['fps_display', 'ping_display', 'session_timer'];
        break;
      case 'Default':
      default:
        activeIds = ['fps_display', 'ping_display', 'coordinates_display'];
        break;
    }

    for (const mod of this.moduleManager.getAllModules()) {
      this.moduleManager.setModuleEnabled(mod.id, activeIds.includes(mod.id));
    }
  }
}

export class ResetManager {
  constructor(
    private moduleManager: ModuleManager,
    private hudManager: HUDManager,
    private themeManager: ThemeManager,
    private profileManager: ProfileManager
  ) {}

  public resetModule(moduleId: string): boolean {
    const mod = this.moduleManager.getModule(moduleId);
    if (!mod) return false;
    for (const setting of mod.getSettings()) {
      setting.reset();
    }
    return true;
  }

  public resetHudElement(elementId: string): boolean {
    const el = this.hudManager.getElement(elementId);
    if (!el || !el.resetToDefaults) return false;
    el.resetToDefaults();
    return true;
  }

  public resetCategory(category: string): boolean {
    const mods = this.moduleManager.getModulesByCategory(category as any);
    for (const mod of mods) {
      for (const s of mod.getSettings()) {
        s.reset();
      }
    }
    return true;
  }

  public resetTheme(): void {
    this.themeManager.resetThemes();
  }

  public resetProfile(profileId: string): boolean {
    const p = this.profileManager.getAllProfiles().find((prof) => prof.id === profileId);
    if (!p) return false;
    this.profileManager.switchProfile('default');
    return true;
  }

  public resetAll(confirmation: boolean): boolean {
    if (!confirmation) return false;

    // Reset all modules and settings
    for (const mod of this.moduleManager.getAllModules()) {
      for (const s of mod.getSettings()) {
        s.reset();
      }
    }

    // Reset all HUD elements
    for (const el of this.hudManager.getAllElements()) {
      el.resetToDefaults?.();
    }

    // Reset themes
    this.themeManager.resetThemes();

    // Reset to default profile
    this.profileManager.switchProfile('default');

    return true;
  }
}
