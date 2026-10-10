export type PerformanceProfileType = 'potato' | 'balanced' | 'quality' | 'custom';

export type ParticleLevel = 'all' | 'decreased' | 'minimal';

export type ChunkSchedulingMode = 'default' | 'async' | 'threaded';

export interface PerformanceSettings {
  profile: PerformanceProfileType;
  fpsLimit: number; // 0 = unlimited, or 30, 60, 120, 144, 240
  vsync: boolean;
  dynamicOptimization: boolean;
  targetFps: number;
  chunkOptimization: boolean;
  chunkRenderDistance: number;
  simulationDistance: number;
  chunkSchedulingMode: ChunkSchedulingMode;
  entityOptimization: boolean;
  entityDistanceScaling: number; // 0.5 to 1.5 (default 1.0)
  entityCulling: boolean;
  particleOptimization: boolean;
  particles: ParticleLevel;
  memoryOptimization: boolean;
  safeMode: boolean; // Safe Performance Mode fallback
  clouds: boolean;
  weatherEffects: boolean;
  animatedTextures: boolean;
  fastMath: boolean;
  reducedMotion: boolean;
}

export interface FrameMetrics {
  fps: number;
  avgFps: number;
  onePercentLow: number;
  zeroPointOnePercentLow: number;
  avgFrameTimeMs: number;
  maxFrameTimeMs: number;
  frameTimeSpikes: number;
  totalFramesRecorded: number;
}

export interface MemoryMetrics {
  allocatedMb: number;
  usedMb: number;
  peakMb: number;
  systemTotalMb: number;
  systemFreeMb: number;
  gcPauseCount: number;
  gcPauseTotalMs: number;
}

export interface StartupMetrics {
  launcherStartupMs: number;
  preparationMs: number;
  processStartupMs: number;
  totalStartupMs: number;
}

export interface SystemHardwareInfo {
  cpuModel: string;
  cpuCores: number;
  totalRamMb: number;
  freeRamMb: number;
  osPlatform: string;
  osRelease: string;
  gpuRenderer?: string;
  gpuVramMb?: number;
}

export interface BenchmarkReport {
  id: string;
  timestamp: number;
  installationId: string;
  installationName: string;
  profile: PerformanceProfileType;
  durationSeconds: number;
  metrics: FrameMetrics;
  memory: MemoryMetrics;
  systemInfo: SystemHardwareInfo;
}

export interface ComparisonReport {
  baseline: BenchmarkReport;
  optimized: BenchmarkReport;
  avgFpsDelta: number;
  avgFpsImprovementPercent: number;
  onePercentLowDelta: number;
  onePercentLowImprovementPercent: number;
  frameTimeReductionPercent: number;
  memorySavedMb: number;
  summary: string;
}

export interface RamRecommendation {
  recommendedMinMb: number;
  recommendedMaxMb: number;
  systemTotalMb: number;
  modCount: number;
  category: 'vanilla' | 'light_modded' | 'medium_modded' | 'heavy_modded';
  reason: string;
  isConstrained: boolean;
}

export interface JvmArgumentSpec {
  flag: string;
  reason: string;
  category: 'heap' | 'gc' | 'compiler' | 'system' | 'optimization';
  minJavaVersion?: number;
  experimental?: boolean;
}
