import { FrameTimeMonitor } from './FrameTimeMonitor';
import { FrameMetrics, MemoryMetrics } from '../../../../shared/models/performance';

export interface ProfilerSectionTime {
  cpuMs: number;
  renderMs: number;
  chunkMs: number;
  entityMs: number;
  gcMs: number;
}

export interface InGamePerformanceOverlayData {
  fps: number;
  frameTimeMs: number;
  pingMs: number;
  memoryUsedMb: number;
  memoryAllocatedMb: number;
}

export class PerformanceProfiler {
  private enabled: boolean = false;
  private monitor: FrameTimeMonitor;
  private currentTimings: ProfilerSectionTime = {
    cpuMs: 0,
    renderMs: 0,
    chunkMs: 0,
    entityMs: 0,
    gcMs: 0,
  };

  constructor(monitor?: FrameTimeMonitor) {
    this.monitor = monitor || new FrameTimeMonitor();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getMonitor(): FrameTimeMonitor {
    return this.monitor;
  }

  public updateSectionTimings(timings: Partial<ProfilerSectionTime>): void {
    if (!this.enabled) return;
    this.currentTimings = {
      ...this.currentTimings,
      ...timings,
    };
  }

  public getSectionTimings(): Readonly<ProfilerSectionTime> {
    return { ...this.currentTimings };
  }

  /**
   * Generates lightweight overlay snapshot for in-game HUD telemetry.
   */
  public getOverlayData(pingMs: number = 24, memAllocatedMb: number = 4096, memUsedMb: number = 1850): InGamePerformanceOverlayData {
    const metrics = this.monitor.calculateMetrics();
    return {
      fps: metrics.fps || metrics.avgFps || 60,
      frameTimeMs: metrics.avgFrameTimeMs || 16.6,
      pingMs,
      memoryUsedMb: memUsedMb,
      memoryAllocatedMb: memAllocatedMb,
    };
  }
}
