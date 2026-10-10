import { IModule, ModuleCategory } from './IModule';
import { EventBus } from '../events/EventBus';

export type ModuleErrorListener = (module: IModule, error: Error, phase: string) => void;

export class ModuleManager {
  private modules: Map<string, IModule> = new Map();
  private activeTickingModules: IModule[] = [];
  private errorListeners: Set<ModuleErrorListener> = new Set();
  private favoriteModules: Set<string> = new Set(['fps_display', 'zoom', 'fullbright', 'armor_hud']);

  constructor(private eventBus: EventBus) {
    // Listen to client ticks to safely pump module ticks
    this.eventBus.on('client_tick', () => {
      this.tickModules();
    });
  }

  public onError(listener: ModuleErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  private emitError(module: IModule, error: Error, phase: string): void {
    for (const listener of this.errorListeners) {
      try {
        listener(module, error, phase);
      } catch (err) {
        console.error('[ModuleManager] Error in error listener:', err);
      }
    }
  }

  private updateTickingList(): void {
    this.activeTickingModules = Array.from(this.modules.values()).filter(
      (m) => m.isEnabled() && typeof m.onTick === 'function'
    );
  }

  public registerModule(module: IModule): boolean {
    if (this.modules.has(module.id)) {
      console.warn(`[ModuleManager] Module "${module.id}" is already registered.`);
      return false;
    }

    try {
      module.onRegister(this.eventBus);
      module.onInitialize();
      this.modules.set(module.id, module);
      this.updateTickingList();
      return true;
    } catch (err: any) {
      console.error(`[ModuleManager] Error initializing module "${module.id}":`, err);
      this.emitError(module, err, 'initialization');
      return false;
    }
  }

  /**
   * Unregisters and cleanly unloads an optional module, disposing resources.
   */
  public unregisterModule(id: string): boolean {
    const module = this.modules.get(id);
    if (!module) return false;

    try {
      if (module.isEnabled()) {
        module.setEnabled(false);
      }
      module.onShutdown();
    } catch (err: any) {
      console.warn(`[ModuleManager] Error during shutdown of unregistering module "${id}":`, err);
    }

    this.modules.delete(id);
    this.favoriteModules.delete(id);
    this.updateTickingList();
    return true;
  }

  public getModule(id: string): IModule | undefined {
    return this.modules.get(id);
  }

  public getAllModules(): IModule[] {
    return Array.from(this.modules.values());
  }

  public getModulesByCategory(category: ModuleCategory): IModule[] {
    return this.getAllModules().filter((m) => m.category === category);
  }

  public searchModules(query: string): IModule[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.getAllModules();

    return this.getAllModules().filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }

  public toggleFavorite(id: string): boolean {
    if (this.favoriteModules.has(id)) {
      this.favoriteModules.delete(id);
      return false;
    } else {
      this.favoriteModules.add(id);
      return true;
    }
  }

  public isFavorite(id: string): boolean {
    return this.favoriteModules.has(id);
  }

  public getFavoriteModules(): IModule[] {
    return this.getAllModules().filter((m) => this.favoriteModules.has(m.id));
  }

  public getFavorites(): string[] {
    return Array.from(this.favoriteModules);
  }

  public setFavorites(ids: string[]): void {
    this.favoriteModules = new Set(ids);
  }

  public setModuleEnabled(id: string, enabled: boolean): boolean {
    const module = this.modules.get(id);
    if (!module) return false;

    try {
      module.setEnabled(enabled);
      this.updateTickingList();
      return true;
    } catch (err: any) {
      console.error(`[ModuleManager] Error setting module "${id}" state to ${enabled}:`, err);
      // Crash safety: isolate and disable the module
      try {
        module.setEnabled(false);
      } catch {
        // Ignored
      }
      this.updateTickingList();
      this.emitError(module, err, enabled ? 'enable' : 'disable');
      return false;
    }
  }

  public toggleModule(id: string): boolean {
    const module = this.modules.get(id);
    if (!module) return false;
    return this.setModuleEnabled(id, !module.isEnabled());
  }

  /**
   * Fast-path tick dispatch: loops only through actively enabled modules with onTick.
   */
  public tickModules(): void {
    const list = this.activeTickingModules;
    const len = list.length;
    for (let i = 0; i < len; i++) {
      const module = list[i];
      if (!module) continue;

      try {
        module.onTick?.();
      } catch (err: any) {
        console.error(`[ModuleManager] Error during tick in module "${module.id}". Disabling for safety:`, err);
        this.emitError(module, err, 'tick');
        // Isolate failure so Minecraft does not crash
        try {
          module.setEnabled(false);
        } catch {
          // Ignored
        }
        this.updateTickingList();
      }
    }
  }

  public shutdown(): void {
    for (const module of this.modules.values()) {
      try {
        module.setEnabled(false);
        module.onShutdown();
      } catch (err) {
        console.error(`[ModuleManager] Error shutting down module "${module.id}":`, err);
      }
    }
    this.modules.clear();
    this.activeTickingModules = [];
  }
}
