import { PerformanceSettings } from '../../../../shared/models/performance';

export interface EntityOptimizationState {
  cullingEnabled: boolean;
  distanceScaling: number;
  skipDistantAnimationTicks: boolean;
  maxRenderDistanceBlocks: number;
}

export class EntityOptimizer {
  private state: EntityOptimizationState = {
    cullingEnabled: true,
    distanceScaling: 1.0,
    skipDistantAnimationTicks: true,
    maxRenderDistanceBlocks: 64,
  };

  constructor(settings?: PerformanceSettings) {
    if (settings) {
      this.applySettings(settings);
    }
  }

  public applySettings(settings: PerformanceSettings): void {
    const isSafe = settings.safeMode;
    const scaling = isSafe ? Math.max(0.8, settings.entityDistanceScaling) : settings.entityDistanceScaling;

    this.state = {
      cullingEnabled: settings.entityOptimization && settings.entityCulling,
      distanceScaling: Math.max(0.5, Math.min(1.5, scaling)),
      skipDistantAnimationTicks: !isSafe && settings.entityOptimization,
      maxRenderDistanceBlocks: Math.round(64 * scaling),
    };
  }

  public getState(): Readonly<EntityOptimizationState> {
    return { ...this.state };
  }

  /**
   * Safe visibility check: determines whether an entity should be rendered.
   * Entities critical to gameplay (bosses, players, leashed mobs, vehicles) always render.
   */
  public shouldRenderEntity(
    distanceBlocks: number,
    isCrucialGameplayEntity: boolean = false
  ): boolean {
    if (isCrucialGameplayEntity) {
      return true; // Never cull players, bosses, or named/leashed entities
    }
    if (!this.state.cullingEnabled) {
      return true;
    }
    return distanceBlocks <= this.state.maxRenderDistanceBlocks;
  }

  /**
   * Determines whether to throttle secondary bone/animation updates for distant entities.
   */
  public shouldUpdateDetailedAnimations(distanceBlocks: number): boolean {
    if (!this.state.skipDistantAnimationTicks) {
      return true;
    }
    return distanceBlocks <= 24; // Full animation updates for entities within 24 blocks
  }
}
