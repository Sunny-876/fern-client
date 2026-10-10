import { ModuleManager } from '../modules/ModuleManager';
import { IModule, ModuleCategory } from '../modules/IModule';
import { KeybindManager } from '../keybinds/KeybindManager';
import { HUDManager } from '../hud/HUDManager';
import { ThemeManager } from '../theme/ThemeManager';
import { ProfileManager } from '../profiles/ProfileManager';
import { SettingsSearchEngine, SearchResultItem } from '../search/SettingsSearchEngine';

export type MenuCategoryTab = 'ALL' | ModuleCategory | 'PROFILES' | 'THEMES' | 'FAVORITES';

export class FernMenu {
  private isOpen = false;
  private activeCategory: MenuCategoryTab = 'ALL';
  private searchQuery = '';
  private selectedModuleId: string | null = null;
  private rebindingModuleId: string | null = null;
  private animationProgress = 0; // 0.0 to 1.0
  public readonly searchEngine?: SettingsSearchEngine;

  constructor(
    private moduleManager: ModuleManager,
    private keybindManager: KeybindManager,
    private hudManager: HUDManager,
    private themeManager: ThemeManager,
    private profileManager?: ProfileManager
  ) {
    if (this.profileManager) {
      this.searchEngine = new SettingsSearchEngine(
        this.moduleManager,
        this.hudManager,
        this.themeManager,
        this.profileManager
      );
    }
  }

  public isMenuOpen(): boolean {
    return this.isOpen;
  }

  public open(): void {
    this.isOpen = true;
    this.animationProgress = 1.0;
  }

  public close(): void {
    this.isOpen = false;
    this.rebindingModuleId = null;
    this.animationProgress = 0;
  }

  public toggle(): boolean {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
    return this.isOpen;
  }

  public setActiveCategory(category: MenuCategoryTab): void {
    this.activeCategory = category;
  }

  public getActiveCategory(): MenuCategoryTab {
    return this.activeCategory;
  }

  public setSearchQuery(query: string): void {
    this.searchQuery = query;
  }

  public getSearchQuery(): string {
    return this.searchQuery;
  }

  public selectModule(moduleId: string | null): void {
    this.selectedModuleId = moduleId;
    this.rebindingModuleId = null;
    if (moduleId && this.profileManager) {
      this.profileManager.recordRecentlyUsed(moduleId);
    }
  }

  public getSelectedModule(): IModule | null {
    if (!this.selectedModuleId) return null;
    return this.moduleManager.getModule(this.selectedModuleId) || null;
  }

  public startRebinding(moduleId: string): void {
    this.rebindingModuleId = moduleId;
  }

  public finishRebinding(key: string): boolean {
    if (!this.rebindingModuleId) return false;
    const mod = this.moduleManager.getModule(this.rebindingModuleId);
    if (mod) {
      mod.keybind = this.keybindManager.normalizeKey(key);
      this.keybindManager.setKeybind(`mod_${mod.id}`, mod.keybind);
    }
    this.rebindingModuleId = null;
    return true;
  }

  public cancelRebinding(): void {
    this.rebindingModuleId = null;
  }

  public isRebinding(): boolean {
    return this.rebindingModuleId !== null;
  }

  public getFilteredModules(): IModule[] {
    let list = this.moduleManager.getAllModules();

    if (this.activeCategory === 'FAVORITES' && this.profileManager) {
      const favs = this.profileManager.getActiveProfile().favorites;
      list = list.filter((m) => favs.includes(m.id));
    } else if (this.activeCategory !== 'ALL' && this.activeCategory !== 'PROFILES' && this.activeCategory !== 'THEMES') {
      list = list.filter((m) => m.category === this.activeCategory);
    }

    if (this.searchQuery.trim().length > 0) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
      );
    }

    return list;
  }

  public executeDeepSearch(query: string): SearchResultItem[] {
    if (!this.searchEngine) return [];
    return this.searchEngine.search(query);
  }

  /**
   * Enters the HUD position / edit mode.
   */
  public enterHudEditMode(): void {
    this.close();
    this.hudManager.setEditMode(true);
  }

  public exitHudEditMode(): void {
    this.hudManager.setEditMode(false);
  }
}
