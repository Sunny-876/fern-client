import { ParticleLevel, PerformanceSettings } from '../../../../shared/models/performance';

export class ParticleOptimizer {
  private level: ParticleLevel = 'decreased';
  private optimizationEnabled: boolean = true;
  private maxParticleDistanceBlocks: number = 32;

  constructor(settings?: PerformanceSettings) {
    if (settings) {
      this.applySettings(settings);
    }
  }

  public applySettings(settings: PerformanceSettings): void {
    this.optimizationEnabled = settings.particleOptimization;
    this.level = settings.particles;
    this.maxParticleDistanceBlocks = settings.profile === 'potato' ? 16 : settings.profile === 'balanced' ? 32 : 64;
  }

  public getParticleLevel(): ParticleLevel {
    return this.level;
  }

  public getDensityMultiplier(): number {
    if (!this.optimizationEnabled) return 1.0;
    switch (this.level) {
      case 'minimal':
        return 0.15;
      case 'decreased':
        return 0.5;
      case 'all':
      default:
        return 1.0;
    }
  }

  /**
   * Determines whether an individual particle should spawn based on distance and gameplay relevance.
   * Gameplay particles (critical hits, potions, enchanted glint) are always preserved.
   */
  public shouldSpawnParticle(distanceBlocks: number, isGameplayRelevant: boolean = false): boolean {
    if (isGameplayRelevant) {
      return true; // Never suppress gameplay-relevant visual feedback
    }

    if (!this.optimizationEnabled) {
      return true;
    }

    if (this.level === 'minimal') {
      return distanceBlocks <= 12 && Math.random() < 0.2;
    }

    if (this.level === 'decreased') {
      return distanceBlocks <= this.maxParticleDistanceBlocks && Math.random() < 0.6;
    }

    return distanceBlocks <= this.maxParticleDistanceBlocks;
  }
}
