import { PerformanceSettings } from '../../../../shared/models/performance';

export interface RenderingState {
  frustumCullingEnabled: boolean;
  batchingEnabled: boolean;
  cloudsEnabled: boolean;
  weatherEffectsEnabled: boolean;
  animatedTexturesEnabled: boolean;
  fastMath: boolean;
  reducedMotionEnabled: boolean;
  fpsLimit: number;
  vsync: boolean;
}

export class RenderingOptimizer {
  private state: RenderingState = {
    frustumCullingEnabled: true,
    batchingEnabled: true,
    cloudsEnabled: true,
    weatherEffectsEnabled: true,
    animatedTexturesEnabled: true,
    fastMath: true,
    reducedMotionEnabled: false,
    fpsLimit: 0,
    vsync: false,
  };

  constructor(settings?: PerformanceSettings) {
    if (settings) {
      this.applySettings(settings);
    }
  }

  public applySettings(settings: PerformanceSettings): void {
    this.state = {
      frustumCullingEnabled: settings.chunkOptimization,
      batchingEnabled: !settings.safeMode,
      cloudsEnabled: settings.clouds,
      weatherEffectsEnabled: settings.weatherEffects,
      animatedTexturesEnabled: settings.animatedTextures,
      fastMath: settings.fastMath && !settings.safeMode,
      reducedMotionEnabled: settings.reducedMotion,
      fpsLimit: settings.fpsLimit,
      vsync: settings.vsync,
    };
  }

  public getState(): Readonly<RenderingState> {
    return { ...this.state };
  }

  public shouldRenderClouds(): boolean {
    return this.state.cloudsEnabled;
  }

  public shouldAnimateTextures(): boolean {
    return this.state.animatedTexturesEnabled;
  }

  public shouldRenderWeather(): boolean {
    return this.state.weatherEffectsEnabled;
  }

  public isFastMathActive(): boolean {
    return this.state.fastMath;
  }

  public isFrustumCullingActive(): boolean {
    return this.state.frustumCullingEnabled;
  }

  public isBatchingActive(): boolean {
    return this.state.batchingEnabled;
  }

  public getFpsLimit(): number {
    return this.state.fpsLimit;
  }

  public isVsyncEnabled(): boolean {
    return this.state.vsync;
  }
}
