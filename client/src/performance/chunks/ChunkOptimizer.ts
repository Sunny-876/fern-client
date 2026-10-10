import { PerformanceSettings, ChunkSchedulingMode } from '../../../../shared/models/performance';

export interface ChunkOptimizationState {
  renderDistance: number;
  simulationDistance: number;
  schedulingMode: ChunkSchedulingMode;
  asyncMeshGeneration: boolean;
  maxWorkerThreads: number;
  rebuildPriority: 'distance' | 'camera_angle' | 'balanced';
}

export class ChunkOptimizer {
  private state: ChunkOptimizationState = {
    renderDistance: 12,
    simulationDistance: 8,
    schedulingMode: 'async',
    asyncMeshGeneration: true,
    maxWorkerThreads: 4,
    rebuildPriority: 'balanced',
  };

  constructor(settings?: PerformanceSettings) {
    if (settings) {
      this.applySettings(settings);
    }
  }

  public applySettings(settings: PerformanceSettings): void {
    const isSafe = settings.safeMode;
    this.state = {
      renderDistance: Math.max(2, Math.min(32, settings.chunkRenderDistance)),
      simulationDistance: Math.max(2, Math.min(32, settings.simulationDistance)),
      schedulingMode: isSafe ? 'default' : settings.chunkSchedulingMode,
      asyncMeshGeneration: !isSafe && settings.chunkOptimization,
      maxWorkerThreads: Math.max(1, Math.min(8, (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4) || 4)),
      rebuildPriority: settings.profile === 'potato' ? 'camera_angle' : 'balanced',
    };
  }

  public getState(): Readonly<ChunkOptimizationState> {
    return { ...this.state };
  }

  public getRenderDistance(): number {
    return this.state.renderDistance;
  }

  public getSimulationDistance(): number {
    return this.state.simulationDistance;
  }

  public getSchedulingMode(): ChunkSchedulingMode {
    return this.state.schedulingMode;
  }

  public isAsyncMeshGenEnabled(): boolean {
    return this.state.asyncMeshGeneration;
  }

  /**
   * Calculates whether a chunk at distance d should have rebuild priority.
   */
  public shouldPrioritizeRebuild(distanceInChunks: number): boolean {
    // Chunks closest to the player (< 4 chunks) are always prioritized to eliminate visual pop-in
    return distanceInChunks <= 4;
  }
}
