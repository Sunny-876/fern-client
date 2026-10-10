import { EventBus } from '../events/EventBus';
import { ModuleManager } from '../modules/ModuleManager';
import { HUDManager } from '../hud/HUDManager';
import { KeybindManager } from '../keybinds/KeybindManager';
import { NotificationManager } from '../notifications/NotificationManager';
import { ThemeManager } from '../theme/ThemeManager';
import { UIManager } from '../ui/UIManager';
import { ConfigManager } from '../config/ConfigManager';
import { FernPerformanceEngine } from '../performance/core/FernPerformanceEngine';
import { HudRenderContext } from '../hud/IHudElement';
import { ProfileManager } from '../profiles/ProfileManager';
import { FontManager } from '../fonts/FontManager';
import { AnimationSystem } from '../animation/AnimationSystem';
import { SettingsSearchEngine } from '../search/SettingsSearchEngine';
import { ModulePresetManager, ResetManager } from '../modules/ModulePresets';

// Module implementations
import { FpsDisplayModule } from '../modules/impl/FpsDisplayModule';
import { PingDisplayModule } from '../modules/impl/PingDisplayModule';
import { CoordinatesDisplayModule } from '../modules/impl/CoordinatesDisplayModule';
import { MemoryDisplayModule } from '../modules/impl/MemoryDisplayModule';
import { SessionTimerModule } from '../modules/impl/SessionTimerModule';
import { KeystrokesModule } from '../modules/impl/KeystrokesModule';
import { CpsDisplayModule } from '../modules/impl/CpsDisplayModule';
import { PerformanceHudModule } from '../modules/impl/PerformanceHudModule';
import { PerformanceControlsModule } from '../modules/impl/PerformanceControlsModule';

// Phase 7 Modules & Subsystems
import { ZoomModule } from '../modules/visual/ZoomModule';
import { FullbrightModule } from '../modules/visual/FullbrightModule';
import { CrosshairModule } from '../modules/visual/CrosshairModule';
import { HitColorModule } from '../modules/visual/HitColorModule';
import { ItemPhysicsModule } from '../modules/visual/ItemPhysicsModule';
import { BetterTooltipsModule } from '../modules/visual/BetterTooltipsModule';
import { ArmorHudModule } from '../modules/hud/ArmorHudModule';
import { PotionHudModule } from '../modules/hud/PotionHudModule';
import { DirectionHudModule } from '../modules/hud/DirectionHudModule';
import { WorldInfoHudModule } from '../modules/hud/WorldInfoHudModule';
import { ServerInfoHudModule } from '../modules/hud/ServerInfoHudModule';
import { WaypointHudModule } from '../modules/hud/WaypointHudModule';
import { ChatCustomizerModule } from '../modules/chat/ChatCustomizerModule';
import { ServerManager } from '../modules/multiplayer/ServerManager';
import { ScreenshotManager } from '../modules/utility/ScreenshotManager';
import { WaypointManager } from '../modules/waypoints/WaypointManager';
import { SessionTracker } from '../modules/utility/SessionTracker';

export interface FernClientOptions {
  mcVersion?: string;
  loader?: string;
  instanceGameDir?: string;
}

export interface FernDebugTelemetry {
  fernVersion: string;
  minecraftVersion: string;
  loader: string;
  loadedModules: number;
  enabledModules: number;
  fps: number;
  avgFps: number;
  onePercentLow: number;
  frameTimeMs: number;
  memoryMb: { used: number; total: number };
  activeTheme: string;
  activeProfile: string;
  reduceMotion: boolean;
  isMenuOpen: boolean;
  isHudEditing: boolean;
}

/**
 * FernClient
 *
 * Central runtime for Fern Client inside Minecraft Java Edition.
 * Coordinates events, modules, settings, keybinds, HUD elements, UI screens,
 * persistent configuration, and performance monitoring.
 */
export class FernClient {
  private static instance: FernClient | null = null;
  public readonly version = '1.0.0-phase7';

  // Core Subsystems
  public readonly eventBus: EventBus;
  public readonly themeManager: ThemeManager;
  public readonly notificationManager: NotificationManager;
  public readonly hudManager: HUDManager;
  public readonly keybindManager: KeybindManager;
  public readonly moduleManager: ModuleManager;
  public readonly performanceEngine: FernPerformanceEngine;
  public readonly profileManager: ProfileManager;
  public readonly fontManager: FontManager;
  public readonly animationSystem: AnimationSystem;
  public readonly searchEngine: SettingsSearchEngine;
  public readonly presetManager: ModulePresetManager;
  public readonly resetManager: ResetManager;
  public readonly uiManager: UIManager;
  public readonly serverManager: ServerManager;
  public screenshotManager: ScreenshotManager;
  public readonly waypointManager: WaypointManager;
  public readonly sessionTracker: SessionTracker;
  public configManager!: ConfigManager;

  // Runtime State
  private initialized = false;
  private minecraftVersion = '1.21.1';
  private loaderName = 'Fabric';
  private instanceGameDir: string = process.cwd();

  constructor() {
    this.eventBus = new EventBus();
    this.themeManager = new ThemeManager();
    this.notificationManager = new NotificationManager();
    this.hudManager = new HUDManager(this.eventBus);
    this.keybindManager = new KeybindManager(this.eventBus);
    this.moduleManager = new ModuleManager(this.eventBus);
    this.performanceEngine = new FernPerformanceEngine();
    this.fontManager = new FontManager();
    this.animationSystem = new AnimationSystem();
    this.serverManager = new ServerManager();
    this.waypointManager = new WaypointManager();
    this.sessionTracker = new SessionTracker();
    this.screenshotManager = new ScreenshotManager(
      this.instanceGameDir,
      this.notificationManager,
      this.eventBus
    );

    // Wire session tracker to world / server lifecycle events
    this.eventBus.on('world_load', (evt) => {
      this.sessionTracker.startSession({ worldName: evt.worldName });
    });
    this.eventBus.on('player_join', (evt) => {
      this.sessionTracker.startSession({ serverAddress: evt.serverAddress });
    });
    this.eventBus.on('world_unload', () => {
      this.sessionTracker.endSession();
    });
    this.eventBus.on('player_leave', () => {
      this.sessionTracker.endSession();
    });

    this.profileManager = new ProfileManager(
      this.hudManager,
      this.moduleManager,
      this.keybindManager,
      this.themeManager,
      this.performanceEngine
    );

    this.searchEngine = new SettingsSearchEngine(
      this.moduleManager,
      this.hudManager,
      this.themeManager,
      this.profileManager
    );

    this.presetManager = new ModulePresetManager(this.moduleManager, this.hudManager);
    this.resetManager = new ResetManager(
      this.moduleManager,
      this.hudManager,
      this.themeManager,
      this.profileManager
    );

    this.uiManager = new UIManager(
      this.moduleManager,
      this.keybindManager,
      this.hudManager,
      this.notificationManager,
      this.themeManager,
      this.eventBus,
      this.profileManager
    );
  }

  public static getInstance(): FernClient {
    if (!FernClient.instance) {
      FernClient.instance = new FernClient();
    }
    return FernClient.instance;
  }

  /**
   * Resets singleton instance (useful for clean test boundaries).
   */
  public static resetInstance(): void {
    if (FernClient.instance) {
      FernClient.instance.shutdown().catch(() => {});
    }
    FernClient.instance = null;
  }

  /**
   * Initializes Fern Client runtime:
   * 1. Sets up crash safety listeners.
   * 2. Registers all built-in modules.
   * 3. Wires module toggle keybind actions.
   * 4. Loads and validates persistent configuration.
   */
  public async initialize(options?: FernClientOptions): Promise<void> {
    if (this.initialized) return;

    if (options?.mcVersion) this.minecraftVersion = options.mcVersion;
    if (options?.loader) this.loaderName = options.loader;
    if (options?.instanceGameDir) {
      this.instanceGameDir = options.instanceGameDir;
      this.screenshotManager = new ScreenshotManager(
        this.instanceGameDir,
        this.notificationManager,
        this.eventBus
      );
    }

    // Crash Safety: Isolate failures from any individual module
    this.moduleManager.onError((failedModule, error, phase) => {
      console.error(`[FernClient] Module "${failedModule.name}" failed during ${phase}:`, error);
      this.notificationManager.notify(
        `Module "${failedModule.name}" encountered an error during ${phase} and was disabled.`,
        'error',
        4500
      );
    });

    // Register built-in legitimate modules
    this.registerBuiltinModules();

    // Wire up keybind toggle actions for all registered modules
    this.registerModuleKeybindActions();

    // Initialize configuration manager and load saved state
    this.configManager = new ConfigManager(
      this.instanceGameDir,
      this.moduleManager,
      this.hudManager,
      this.profileManager,
      this.themeManager
    );
    await this.configManager.initialize();

    // Sync reduceMotion setting
    this.animationSystem.reduceMotion = this.configManager.getClientConfig().reduceMotion;

    this.initialized = true;
    this.notificationManager.notify(
      `Fern Client v${this.version} loaded successfully. Press Right Shift for menu.`,
      'success',
      3500
    );
  }

  private registerBuiltinModules(): void {
    // HUD & Performance Core
    this.moduleManager.registerModule(new FpsDisplayModule(this.hudManager));
    this.moduleManager.registerModule(new PingDisplayModule(this.hudManager));
    this.moduleManager.registerModule(new CoordinatesDisplayModule(this.hudManager));
    this.moduleManager.registerModule(new MemoryDisplayModule(this.hudManager));
    this.moduleManager.registerModule(new SessionTimerModule(this.hudManager));
    this.moduleManager.registerModule(new KeystrokesModule(this.hudManager));
    this.moduleManager.registerModule(new CpsDisplayModule(this.hudManager));
    this.moduleManager.registerModule(new PerformanceHudModule(this.hudManager, this.performanceEngine));
    this.moduleManager.registerModule(new PerformanceControlsModule(this.performanceEngine));

    // Phase 7 Visual Modules
    this.moduleManager.registerModule(new ZoomModule());
    this.moduleManager.registerModule(new FullbrightModule());
    this.moduleManager.registerModule(new CrosshairModule());
    this.moduleManager.registerModule(new HitColorModule());
    this.moduleManager.registerModule(new ItemPhysicsModule());
    this.moduleManager.registerModule(new BetterTooltipsModule());

    // Phase 7 HUD Modules
    this.moduleManager.registerModule(new ArmorHudModule(this.hudManager));
    this.moduleManager.registerModule(new PotionHudModule(this.hudManager));
    this.moduleManager.registerModule(new DirectionHudModule(this.hudManager));
    this.moduleManager.registerModule(new WorldInfoHudModule(this.hudManager));
    this.moduleManager.registerModule(new ServerInfoHudModule(this.hudManager));
    this.moduleManager.registerModule(new WaypointHudModule(this.waypointManager, this.hudManager));

    // Phase 7 Chat & UI
    this.moduleManager.registerModule(new ChatCustomizerModule());
  }

  private registerModuleKeybindActions(): void {
    for (const mod of this.moduleManager.getAllModules()) {
      this.keybindManager.registerAction({
        id: `toggle_${mod.id}`,
        name: `Toggle ${mod.name}`,
        description: `Toggles the ${mod.name} module on or off.`,
        key: mod.keybind,
        defaultKey: mod.keybind,
        onTrigger: () => {
          const nextState = !mod.isEnabled();
          this.moduleManager.setModuleEnabled(mod.id, nextState);
          this.notificationManager.notify(
            `${mod.name} ${nextState ? 'enabled' : 'disabled'}`,
            nextState ? 'success' : 'info',
            2000
          );
        },
      });
    }
  }

  /**
   * Safely shuts down the client and persists configuration.
   */
  public async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      if (this.configManager) {
        await this.configManager.saveAll();
      }
    } catch (err) {
      console.error('[FernClient] Error saving configuration on shutdown:', err);
    }

    this.moduleManager.shutdown();
    this.eventBus.emit('game_shutdown', {});
    this.initialized = false;
  }

  private clientTicks = 0;

  /**
   * Main client game-tick hook.
   */
  public tick(): void {
    if (!this.initialized) return;
    this.clientTicks++;
    this.eventBus.emit('client_tick', { tickCount: this.clientTicks });
    this.animationSystem.tick();
    this.performanceEngine.evaluateDynamicOptimizationTick();
  }

  /**
   * Main 2D overlay rendering hook.
   */
  public render2D(context: HudRenderContext): void {
    if (!this.initialized) return;
    this.eventBus.emit('render_2d', {
      screenWidth: context.screenWidth,
      screenHeight: context.screenHeight,
      partialTicks: context.partialTicks ?? 0,
      drawRect: context.drawRect,
      drawText: context.drawText,
    });
  }

  /**
   * Ingests keyboard inputs and routes to active screens / keybinds.
   * Returns true if input was consumed and should not pass to Minecraft.
   */
  public handleKey(
    key: string,
    action: 'down' | 'up' | 'repeat' = 'down',
    modifiers: { ctrl: boolean; shift: boolean; alt: boolean } = { ctrl: false, shift: false, alt: false }
  ): boolean {
    if (!this.initialized) return false;
    const evt = this.eventBus.emit('key_press', {
      key,
      action,
      modifiers,
      cancelled: false,
    });
    return evt.cancelled || this.uiManager.shouldCaptureInput();
  }

  /**
   * Ingests mouse inputs and routes to active screens / keybinds.
   * Returns true if input was consumed and should not pass to Minecraft.
   */
  public handleMouse(
    button: number,
    action: 'down' | 'up' = 'down',
    x: number = 0,
    y: number = 0
  ): boolean {
    if (!this.initialized) return false;
    const evt = this.eventBus.emit('mouse_input', {
      button,
      action,
      x,
      y,
      cancelled: false,
    });
    return evt.cancelled || this.uiManager.shouldCaptureInput();
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getVersion(): string {
    return this.version;
  }

  /**
   * Returns diagnostic debug information as specified in Section 28.
   */
  public getDebugInfo(): FernDebugTelemetry {
    const metrics = this.performanceEngine.getMetrics();
    const allMods = this.moduleManager.getAllModules();
    const enabledMods = allMods.filter((m) => m.isEnabled());

    return {
      fernVersion: this.version,
      minecraftVersion: this.minecraftVersion,
      loader: this.loaderName,
      loadedModules: allMods.length,
      enabledModules: enabledMods.length,
      fps: metrics.fps,
      avgFps: metrics.avgFps,
      onePercentLow: metrics.onePercentLow,
      frameTimeMs: metrics.avgFrameTimeMs,
      memoryMb: {
        used: Math.round(process.memoryUsage?.()?.heapUsed ? process.memoryUsage().heapUsed / 1024 / 1024 : 3200),
        total: Math.round(process.memoryUsage?.()?.heapTotal ? process.memoryUsage().heapTotal / 1024 / 1024 : 8192),
      },
      activeTheme: this.themeManager.getActiveTheme().name,
      activeProfile: this.profileManager.getActiveProfile().name,
      reduceMotion: this.animationSystem.reduceMotion,
      isMenuOpen: this.uiManager.menu.isMenuOpen(),
      isHudEditing: this.hudManager.isEditing(),
    };
  }
}

// Backwards-compatible alias for existing imports
export const FernClientRuntime = FernClient;
