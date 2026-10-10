import { describe, it, expect } from 'vitest';
import { FrameTimeMonitor } from '../client/src/performance/profiling/FrameTimeMonitor';
import { BenchmarkRunner } from '../launcher/src/performance/benchmarking/benchmark-runner';

describe('Profiler, Frame Pacing & Benchmark Mode', () => {
  it('accurately calculates Average FPS, 1% Low, 0.1% Low, and Frame Time Spikes', () => {
    const monitor = new FrameTimeMonitor(1000);

    // Feed 1000 controlled frame times
    // 980 frames @ 6.94ms (~144 FPS)
    // 15 frames @ 16.6ms (~60 FPS)
    // 5 frames @ 45.0ms (~22 FPS severe spikes)
    for (let i = 0; i < 980; i++) monitor.recordFrame(6.94);
    for (let i = 0; i < 15; i++) monitor.recordFrame(16.6);
    for (let i = 0; i < 5; i++) monitor.recordFrame(45.0);

    const metrics = monitor.calculateMetrics();

    expect(metrics.totalFramesRecorded).toBe(1000);
    // Average frame time should be around 7.28 ms
    expect(metrics.avgFrameTimeMs).toBeGreaterThan(6.8);
    expect(metrics.avgFrameTimeMs).toBeLessThan(7.6);
    // Average FPS around 135-145
    expect(metrics.avgFps).toBeGreaterThan(130);
    expect(metrics.avgFps).toBeLessThan(145);

    // 1% Low (worst 10 frames = 5 of 45ms + 5 of 16.6ms, avg = 30.8ms => ~32 FPS)
    expect(metrics.onePercentLow).toBeLessThan(metrics.avgFps);
    expect(metrics.onePercentLow).toBeGreaterThan(25);
    expect(metrics.onePercentLow).toBeLessThan(45);

    // 0.1% Low (worst 1 frame = 45ms => ~22 FPS)
    expect(metrics.zeroPointOnePercentLow).toBeLessThanOrEqual(metrics.onePercentLow);
    expect(metrics.zeroPointOnePercentLow).toBeGreaterThanOrEqual(20);

    // Spikes (5 frames of 45ms clearly exceed 2.5x of 7.28ms and exceed 33.3ms)
    expect(metrics.frameTimeSpikes).toBe(5);
  });

  it('generates reproducible benchmark reports via BenchmarkRunner', async () => {
    const runner = new BenchmarkRunner();
    const report = await runner.runBenchmark({
      installationId: 'test-inst',
      installationName: 'Test Instance',
      profile: 'balanced',
      durationSeconds: 5,
    });

    expect(report.id).toBeTruthy();
    expect(report.profile).toBe('balanced');
    expect(report.metrics.avgFps).toBeGreaterThan(60);
    expect(report.metrics.onePercentLow).toBeGreaterThan(30);
    expect(report.metrics.avgFrameTimeMs).toBeGreaterThan(0);
    expect(report.memory.peakMb).toBeGreaterThan(1000);
    expect(report.systemInfo.cpuModel).toBeTruthy();
  });

  it('computes objective Before vs After comparison metrics without fabricated values', async () => {
    const runner = new BenchmarkRunner();

    // Baseline run (custom / heavier profile)
    const baseline = await runner.runBenchmark({
      installationId: 'inst-1',
      installationName: 'Fern Vanilla 1.21.4',
      profile: 'quality',
      durationSeconds: 5,
    });

    // Optimized Fern run (balanced / optimized profile)
    const optimized = await runner.runBenchmark({
      installationId: 'inst-1',
      installationName: 'Fern Vanilla 1.21.4',
      profile: 'potato',
      durationSeconds: 5,
    });

    const comparison = runner.compareReports(baseline, optimized);

    // Check that math is strictly consistent
    const expectedFpsDelta = optimized.metrics.avgFps - baseline.metrics.avgFps;
    expect(comparison.avgFpsDelta).toBe(expectedFpsDelta);

    const expectedImprovement = Number(((expectedFpsDelta / baseline.metrics.avgFps) * 100).toFixed(1));
    expect(comparison.avgFpsImprovementPercent).toBe(expectedImprovement);

    expect(comparison.summary).toContain('Fern optimization');
    expect(comparison.onePercentLowDelta).toBe(optimized.metrics.onePercentLow - baseline.metrics.onePercentLow);
  });
});
