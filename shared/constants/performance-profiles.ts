import { PerformanceSettings } from '../models/performance';

export const POTATO_PROFILE: PerformanceSettings = {
  profile: 'potato',
  fpsLimit: 0,
  vsync: false,
  dynamicOptimization: true,
  targetFps: 60,
  chunkOptimization: true,
  chunkRenderDistance: 6,
  simulationDistance: 4,
  chunkSchedulingMode: 'async',
  entityOptimization: true,
  entityDistanceScaling: 0.6,
  entityCulling: true,
  particleOptimization: true,
  particles: 'minimal',
  memoryOptimization: true,
  safeMode: false,
  clouds: false,
  weatherEffects: false,
  animatedTextures: false,
  fastMath: true,
  reducedMotion: true,
};

export const BALANCED_PROFILE: PerformanceSettings = {
  profile: 'balanced',
  fpsLimit: 0,
  vsync: false,
  dynamicOptimization: true,
  targetFps: 120,
  chunkOptimization: true,
  chunkRenderDistance: 12,
  simulationDistance: 8,
  chunkSchedulingMode: 'async',
  entityOptimization: true,
  entityDistanceScaling: 1.0,
  entityCulling: true,
  particleOptimization: true,
  particles: 'decreased',
  memoryOptimization: true,
  safeMode: false,
  clouds: true,
  weatherEffects: true,
  animatedTextures: true,
  fastMath: true,
  reducedMotion: false,
};

export const QUALITY_PROFILE: PerformanceSettings = {
  profile: 'quality',
  fpsLimit: 0,
  vsync: false,
  dynamicOptimization: false,
  targetFps: 144,
  chunkOptimization: true,
  chunkRenderDistance: 18,
  simulationDistance: 12,
  chunkSchedulingMode: 'threaded',
  entityOptimization: true,
  entityDistanceScaling: 1.2,
  entityCulling: true,
  particleOptimization: false,
  particles: 'all',
  memoryOptimization: true,
  safeMode: false,
  clouds: true,
  weatherEffects: true,
  animatedTextures: true,
  fastMath: false,
  reducedMotion: false,
};

export const DEFAULT_PERFORMANCE_SETTINGS: PerformanceSettings = {
  ...BALANCED_PROFILE,
};

export function getProfilePreset(profile: 'potato' | 'balanced' | 'quality' | 'custom'): PerformanceSettings {
  switch (profile) {
    case 'potato':
      return { ...POTATO_PROFILE };
    case 'quality':
      return { ...QUALITY_PROFILE };
    case 'balanced':
    default:
      return { ...BALANCED_PROFILE };
  }
}
