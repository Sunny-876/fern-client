import { ModuleManager } from '../modules/ModuleManager';
import { HUDManager } from '../hud/HUDManager';
import { ThemeManager } from '../theme/ThemeManager';
import { ProfileManager } from '../profiles/ProfileManager';

export interface SearchResultItem {
  type: 'module' | 'setting' | 'hud' | 'theme' | 'profile';
  id: string;
  title: string;
  breadcrumb: string;
  description: string;
  category?: string;
  actionTarget?: any;
}

export class SettingsSearchEngine {
  constructor(
    private moduleManager: ModuleManager,
    private hudManager: HUDManager,
    private themeManager: ThemeManager,
    private profileManager: ProfileManager
  ) {}

  public search(query: string): SearchResultItem[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: SearchResultItem[] = [];

    // 1. Search Modules
    for (const mod of this.moduleManager.getAllModules()) {
      if (
        mod.name.toLowerCase().includes(q) ||
        mod.description.toLowerCase().includes(q) ||
        mod.category.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'module',
          id: mod.id,
          title: mod.name,
          breadcrumb: `Modules > ${mod.category} > ${mod.name}`,
          description: mod.description,
          category: mod.category,
        });
      }

      // 2. Search Settings inside each module
      for (const setting of mod.getSettings()) {
        if (
          setting.name.toLowerCase().includes(q) ||
          setting.description.toLowerCase().includes(q) ||
          setting.id.toLowerCase().includes(q)
        ) {
          results.push({
            type: 'setting',
            id: `${mod.id}:${setting.id}`,
            title: `${mod.name} → ${setting.name}`,
            breadcrumb: `Modules > ${mod.name} > ${setting.name}`,
            description: setting.description,
            category: mod.category,
          });
        }
      }
    }

    // 3. Search HUD Elements
    for (const el of this.hudManager.getAllElements()) {
      if (
        el.name.toLowerCase().includes(q) ||
        el.id.toLowerCase().includes(q) ||
        el.anchor.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'hud',
          id: el.id,
          title: `HUD: ${el.name}`,
          breadcrumb: `HUD Editor > ${el.name}`,
          description: `Anchor: ${el.anchor}, Scale: ${el.scale.toFixed(2)}, Layer: ${el.zIndex}`,
        });
      }
    }

    // 4. Search Themes
    for (const theme of this.themeManager.getAllThemes()) {
      if (theme.name.toLowerCase().includes(q) || theme.id.toLowerCase().includes(q)) {
        results.push({
          type: 'theme',
          id: theme.id,
          title: `Theme: ${theme.name}`,
          breadcrumb: `Themes > ${theme.name}`,
          description: `Accent: ${theme.accent}, Surface: ${theme.surface}`,
        });
      }
    }

    // 5. Search Profiles
    for (const profile of this.profileManager.getAllProfiles()) {
      if (
        profile.name.toLowerCase().includes(q) ||
        profile.description.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'profile',
          id: profile.id,
          title: `Profile: ${profile.name}`,
          breadcrumb: `Profiles > ${profile.name}`,
          description: profile.description,
        });
      }
    }

    return results;
  }
}
