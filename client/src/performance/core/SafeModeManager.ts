import { PerformanceSettings } from '../../../../shared/models/performance';
import { BALANCED_PROFILE } from '../../../../shared/constants/performance-profiles';

export interface SafeFallbackEvent {
  reason: string;
  timestamp: number;
  previousProfile: string;
}

export class SafeModeManager {
  private safeModeActive: boolean = false;
  private fallbackHistory: SafeFallbackEvent[] = [];

  constructor(initialSafeMode: boolean = false) {
    this.safeModeActive = initialSafeMode;
  }

  public isSafeMode(): boolean {
    return this.safeModeActive;
  }

  public enableSafeMode(reason: string = 'User requested or stability fallback', previousProfile: string = 'custom'): void {
    this.safeModeActive = true;
    this.fallbackHistory.push({
      reason,
      timestamp: Date.now(),
      previousProfile,
    });
  }

  public disableSafeMode(): void {
    this.safeModeActive = false;
  }

  public getFallbackHistory(): SafeFallbackEvent[] {
    return [...this.fallbackHistory];
  }

  /**
   * Applies safe fallbacks to incoming settings if safe mode is enabled.
   * Disables aggressive fast-math, excessive culling, or unstable chunk concurrency.
   */
  public sanitizeSettings(settings: PerformanceSettings): PerformanceSettings {
    if (!this.safeModeActive && !settings.safeMode) {
      return { ...settings };
    }

    return {
      ...settings,
      safeMode: true,
      fastMath: false, // Turn off fast math approximations
      entityDistanceScaling: Math.max(settings.entityDistanceScaling, 0.8), // Prevent mobs from disappearing too early
      chunkSchedulingMode: 'default', // Fall back to standard synchronous/safe chunk pipeline
      dynamicOptimization: false, // Turn off dynamic scaling to maintain predictable behavior
      clouds: true,
      weatherEffects: true,
      animatedTextures: true,
    };
  }
}
