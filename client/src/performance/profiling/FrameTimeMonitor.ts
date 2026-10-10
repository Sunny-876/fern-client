import { FrameMetrics } from '../../../../shared/models/performance';

export class FrameTimeMonitor {
  private frameTimesMs: number[] = [];
  private maxHistorySize: number;
  private totalFrames: number = 0;
  private runningSumMs: number = 0;
  private spikeThresholdMultiplier: number = 2.5;

  constructor(maxHistorySize: number = 1200) {
    this.maxHistorySize = maxHistorySize;
  }

  public recordFrame(frameDurationMs: number): void {
    if (frameDurationMs <= 0) return;

    this.frameTimesMs.push(frameDurationMs);
    this.totalFrames++;
    this.runningSumMs += frameDurationMs;

    if (this.frameTimesMs.length > this.maxHistorySize) {
      const removed = this.frameTimesMs.shift()!;
      this.runningSumMs -= removed;
    }
  }

  public recordFrames(durations: number[]): void {
    for (const d of durations) {
      this.recordFrame(d);
    }
  }

  public reset(): void {
    this.frameTimesMs = [];
    this.totalFrames = 0;
    this.runningSumMs = 0;
  }

  public getSampleCount(): number {
    return this.frameTimesMs.length;
  }

  public calculateMetrics(): FrameMetrics {
    const count = this.frameTimesMs.length;
    if (count === 0) {
      return {
        fps: 0,
        avgFps: 0,
        onePercentLow: 0,
        zeroPointOnePercentLow: 0,
        avgFrameTimeMs: 0,
        maxFrameTimeMs: 0,
        frameTimeSpikes: 0,
        totalFramesRecorded: 0,
      };
    }

    const currentFrameTime = this.frameTimesMs[count - 1];
    const currentFps = Math.round(1000 / currentFrameTime);

    const avgFrameTimeMs = Number((this.runningSumMs / count).toFixed(2));
    const avgFps = Math.round(1000 / avgFrameTimeMs);

    // Sort frame times descending (longest/worst frame times first)
    const sortedDescending = [...this.frameTimesMs].sort((a, b) => b - a);
    const maxFrameTimeMs = Number(sortedDescending[0].toFixed(2));

    // 1% Low calculation (average of the slowest 1% of frames)
    const onePercentCount = Math.max(1, Math.floor(count * 0.01));
    const worstOnePercentSlice = sortedDescending.slice(0, onePercentCount);
    const worstOnePercentAvgMs = worstOnePercentSlice.reduce((acc, v) => acc + v, 0) / onePercentCount;
    const onePercentLow = Math.round(1000 / worstOnePercentAvgMs);

    // 0.1% Low calculation (average of the slowest 0.1% of frames)
    const pointOnePercentCount = Math.max(1, Math.floor(count * 0.001));
    const worstPointOnePercentSlice = sortedDescending.slice(0, pointOnePercentCount);
    const worstPointOnePercentAvgMs = worstPointOnePercentSlice.reduce((acc, v) => acc + v, 0) / pointOnePercentCount;
    const zeroPointOnePercentLow = Math.round(1000 / worstPointOnePercentAvgMs);

    // Spikes: frames taking longer than 2.5x the average frame time or > 33.3ms (dropping below 30 FPS)
    const spikeThreshold = Math.max(33.3, avgFrameTimeMs * this.spikeThresholdMultiplier);
    let spikes = 0;
    for (let i = 0; i < count; i++) {
      if (this.frameTimesMs[i] > spikeThreshold) {
        spikes++;
      }
    }

    return {
      fps: currentFps,
      avgFps,
      onePercentLow,
      zeroPointOnePercentLow,
      avgFrameTimeMs,
      maxFrameTimeMs,
      frameTimeSpikes: spikes,
      totalFramesRecorded: this.totalFrames,
    };
  }
}
