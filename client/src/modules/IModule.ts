import { Setting } from '../settings/Setting';
import { EventBus } from '../events/EventBus';
import { EventName, FernEventMap } from '../events/ClientEvents';

export type ModuleCategory =
  | 'Combat'
  | 'Movement'
  | 'Player'
  | 'World'
  | 'Visual'
  | 'HUD'
  | 'Performance'
  | 'Misc';

export interface IModule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: ModuleCategory;
  readonly defaultKeybind?: string;
  keybind: string;
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
  toggle(): boolean;

  // Settings
  getSettings(): Setting<any>[];
  getSetting<T>(id: string): Setting<T> | undefined;
  addSetting(setting: Setting<any>): void;

  // Lifecycle
  onRegister(eventBus: EventBus): void;
  onInitialize(): void;
  onEnable(): void;
  onDisable(): void;
  onShutdown(): void;
  onTick?(): void;
}

export abstract class BaseModule implements IModule {
  private enabled = false;
  private settingsMap: Map<string, Setting<any>> = new Map();
  private unregisterCallbacks: Array<() => void> = [];
  protected eventBus: EventBus | null = null;
  public keybind: string;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly category: ModuleCategory,
    public readonly defaultKeybind: string = 'None'
  ) {
    this.keybind = defaultKeybind;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    if (this.enabled !== enabled) {
      this.enabled = enabled;
      if (enabled) {
        this.onEnable();
      } else {
        this.cleanupSubscriptions();
        this.onDisable();
      }
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  public getSettings(): Setting<any>[] {
    return Array.from(this.settingsMap.values());
  }

  public getSetting<T>(id: string): Setting<T> | undefined {
    return this.settingsMap.get(id) as Setting<T> | undefined;
  }

  public addSetting(setting: Setting<any>): void {
    this.settingsMap.set(setting.id, setting);
  }

  public onRegister(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  public onInitialize(): void {}
  public onEnable(): void {}
  public onDisable(): void {}
  public onShutdown(): void {
    this.cleanupSubscriptions();
  }

  /**
   * Helper to subscribe to eventBus. Automatically tracks listener
   * and unregisters it when this module is disabled or shut down.
   */
  protected listen<K extends EventName>(
    eventName: K,
    listener: (event: FernEventMap[K]) => void
  ): void {
    if (!this.eventBus) return;
    const unsub = this.eventBus.on(eventName, listener);
    this.unregisterCallbacks.push(unsub);
  }

  private cleanupSubscriptions(): void {
    for (const unsub of this.unregisterCallbacks) {
      try {
        unsub();
      } catch (err) {
        console.error(`[Module:${this.id}] Error unsubscribing listener:`, err);
      }
    }
    this.unregisterCallbacks = [];
  }
}
