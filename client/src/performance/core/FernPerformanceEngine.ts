import { PerformanceSettings, PerformanceProfileType, FrameMetrics } from '../../../../shared/models/performance';
import { DEFAULT_PERFORMANCE_SETTINGS, getProfilePreset } from '../../../../shared/constants/performance-profiles';
import { SafeModeManager } from './SafeModeManager';
import { RenderingOptimizer } from '../rendering/RenderingOptimizer';
import { MemoryOptimizer } from '../memory/MemoryOptimizer';
import { ChunkOptimizer } from '../chunks/ChunkOptimizer';
import { EntityOptimizer } from '../entities/EntityOptimizer';
import { ParticleOptimizer } from '../particles/ParticleOptimizer';
import { StartupOptimizer } from '../startup/StartupOptimizer';
import { NetworkOptimizer } from '../network/NetworkOptimizer';
import { PerformanceProfiler } from '../profiling/PerformanceProfiler';
import { FrameTimeMonitor } from '../profiling/FrameTimeMonitor';

export class FernPerformanceEngine {
  private currentSettings: PerformanceSettings;
  private safeModeManager: SafeModeManager;

  // Subsystems
  public readonly rendering: RenderingOptimizer;
  public readonly memory: MemoryOptimizer;
  public readonly chunks: ChunkOptimizer;
  public readonly entities: EntityOptimizer;
  public readonly particles: ParticleOptimizer;
  public readonly startup: StartupOptimizer;
  public readonly network: NetworkOptimizer;
  public readonly profiler: PerformanceProfiler;
  public readonly frameMonitor: FrameTimeMonitor;

  // Dynamic optimization state
  private lowFpsStreakCount: number = 0;
  private isDynamicLoadReduced: boolean = false;

  constructor(initialSettings?: Partial<PerformanceSettings>) {
    this.currentSettings = {
      ...DEFAULT_PERFORMANCE_SETTINGS,
      ...initialSettings,
    };

    this.safeModeManager = new SafeModeManager(this.currentSettings.safeMode);

    this.frameMonitor = new FrameTimeMonitor();
    this.profiler = new PerformanceProfiler(this.frameMonitor);
    this.rendering = new RenderingOptimizer(this.currentSettings);
    this.memory = new MemoryOptimizer(this.currentSettings.memoryOptimization);
    this.chunks = new ChunkOptimizer(this.currentSettings);
    this.entities = new EntityOptimizer(this.currentSettings);
    this.particles = new ParticleOptimizer(this.currentSettings);
    this.startup = new StartupOptimizer();
    this.network = new NetworkOptimizer();

    this.applySettings(this.currentSettings);
  }

  public getSettings(): Readonly<PerformanceSettings> {
    return { ...this.currentSettings };
  }

  public applyProfile(profile: PerformanceProfileType): void {
    if (profile === 'custom') {
      this.currentSettings.profile = 'custom';
      return;
    }
    const preset = getProfilePreset(profile);
    this.applySettings(preset);
  }

  public applySettings(settings: Partial<PerformanceSettings>): void {
    const merged: PerformanceSettings = {
      ...this.currentSettings,
      ...settings,
    };

    // Sanitize through SafeModeManager
    const sanitized = this.safeModeManager.sanitizeSettings(merged);
    this.currentSettings = sanitized;

    // Distribute settings to individual subsystems
    this.rendering.applySettings(sanitized);
    this.memory.setOptimizationEnabled(sanitized.memoryOptimization);
    this.chunks.applySettings(sanitized);
    this.entities.applySettings(sanitized);
    this.particles.applySettings(sanitized);
  }

  public enableSafeMode(reason?: string): void {
    this.safeModeManager.enableSafeMode(reason, this.currentSettings.profile);
    this.applySettings({ safeMode: true });
  }

  public disableSafeMode(): void {
    this.safeModeManager.disableSafeMode();
    this.applySettings({ safeMode: false });
  }

  public isSafeModeActive(): boolean {
    return this.safeModeManager.isSafeMode();
  }

  /**
   * Evaluates dynamic performance heuristics:
   * If FPS drops below targetFps consistently (> 3 consecutive checks),
   * non-gameplay visual load is temporarily dialed down.
   */
  public evaluateDynamicOptimizationTick(): { adjusted: boolean; action: string } {
    if (!this.currentSettings.dynamicOptimization || this.isSafeModeActive()) {
      return { adjusted: false, action: 'Dynamic optimization inactive' };
    }

    const metrics = this.frameMonitor.calculateMetrics();
    if (metrics.totalFramesRecorded < 60) {
      return { adjusted: false, action: 'Warmup phase' };
    }

    const target = this.currentSettings.targetFps || 60;
    const currentFps = metrics.avgFps;

    if (currentFps < target * 0.8) {
      this.lowFpsStreakCount++;
      if (this.lowFpsStreakCount >= 3 && !this.isDynamicLoadReduced) {
        this.isDynamicLoadReduced = true;
        // Temporarily reduce particles and distant entity detail without changing gameplay reach
        this.particles.applySettings({ ...this.currentSettings, particles: 'minimal' });
        return {
          adjusted: true,
          action: `Reduced visual load (Average FPS ${currentFps} < Target ${target})`,
        };
      }
    } else if (currentFps >= target) {
      if (this.isDynamicLoadReduced) {
        this.lowFpsStreakCount = 0;
        this.isDynamicLoadReduced = false;
        this.particles.applySettings(this.currentSettings);
        return {
          adjusted: true,
          action: `Restored standard visual settings (FPS recovered to ${currentFps})`,
        };
      }
      this.lowFpsStreakCount = 0;
    }

    return { adjusted: false, action: 'Stable' };
  }

  public getMetrics(): FrameMetrics {
    return this.frameMonitor.calculateMetrics();
  }
}
