import {
  PerformanceSettings,
  PerformanceProfileType,
  ParticleLevel,
  ChunkSchedulingMode,
} from '../../../../shared/models/performance';
import {
  POTATO_PROFILE,
  BALANCED_PROFILE,
  QUALITY_PROFILE,
  DEFAULT_PERFORMANCE_SETTINGS,
  getProfilePreset,
} from '../../../../shared/constants/performance-profiles';

export type {
  PerformanceSettings,
  PerformanceProfileType,
  ParticleLevel,
  ChunkSchedulingMode,
};

export {
  POTATO_PROFILE,
  BALANCED_PROFILE,
  QUALITY_PROFILE,
  DEFAULT_PERFORMANCE_SETTINGS,
  getProfilePreset,
};

// Legacy interface support for backward compatibility with early phase sketches
export interface PerformanceTuning {
  chunkRenderDistance: number;
  simulationDistance: number;
  entityDistanceScaling: number;
  enableFastMath: boolean;
  enableCulling: boolean;
  asyncChunkLoading: boolean;
  memoryCleanIntervalSeconds: number;
}

export const DEFAULT_PERFORMANCE_TUNING: PerformanceTuning = {
  chunkRenderDistance: 12,
  simulationDistance: 8,
  entityDistanceScaling: 1.0,
  enableFastMath: true,
  enableCulling: true,
  asyncChunkLoading: true,
  memoryCleanIntervalSeconds: 300,
};
