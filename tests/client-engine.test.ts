import { describe, it, expect } from 'vitest';
import { FernPerformanceEngine } from '../client/src/performance/core/FernPerformanceEngine';
import { POTATO_PROFILE, BALANCED_PROFILE, QUALITY_PROFILE } from '../shared/constants/performance-profiles';

describe('Client Performance Subsystems & FernPerformanceEngine', () => {
  it('initializes and synchronizes all modular optimizers', () => {
    const engine = new FernPerformanceEngine({ ...BALANCED_PROFILE });

    expect(engine.rendering.isFrustumCullingActive()).toBe(true);
    expect(engine.chunks.getRenderDistance()).toBe(12);
    expect(engine.entities.getState().cullingEnabled).toBe(true);
    expect(engine.particles.getParticleLevel()).toBe('decreased');
    expect(engine.particles.getDensityMultiplier()).toBe(0.5);
  });

  it('preserves crucial gameplay entities and critical particles regardless of culling profile', () => {
    const engine = new FernPerformanceEngine({ ...POTATO_PROFILE }); // Most aggressive profile

    // Crucial gameplay entities (players, bosses, leashed mobs) must never be culled
    expect(engine.entities.shouldRenderEntity(100, true)).toBe(true);
    // Non-crucial distant entity culled beyond max distance
    expect(engine.entities.shouldRenderEntity(100, false)).toBe(false);

    // Gameplay particles (potions, crits) must always spawn
    expect(engine.particles.shouldSpawnParticle(50, true)).toBe(true);
  });

  it('performs safe memory trimming without invoking tight manual GC loops', () => {
    const engine = new FernPerformanceEngine();

    const trim1 = engine.memory.trimUnusedAllocations();
    expect(trim1.trimmed).toBe(true);
    expect(trim1.reason).toContain('Safe buffer trim pass');

    // Immediate second trim is throttled (prevents thrashing)
    const trim2 = engine.memory.trimUnusedAllocations();
    expect(trim2.trimmed).toBe(false);
    expect(trim2.reason).toContain('Throttled');
  });

  it('evaluates dynamic optimization tick and temporarily dials down optional workload when FPS drops', () => {
    const engine = new FernPerformanceEngine({
      dynamicOptimization: true,
      targetFps: 100,
    });

    // Simulate 120 frames with low FPS (average ~40 FPS = 25ms per frame)
    for (let i = 0; i < 120; i++) {
      engine.frameMonitor.recordFrame(25.0);
    }

    // Tick 1
    engine.evaluateDynamicOptimizationTick();
    // Tick 2
    engine.evaluateDynamicOptimizationTick();
    // Tick 3: triggers load reduction
    const res = engine.evaluateDynamicOptimizationTick();
    expect(res.adjusted).toBe(true);
    expect(res.action).toContain('Reduced visual load');
    expect(engine.particles.getParticleLevel()).toBe('minimal');
  });

  it('engages Safe Performance Mode when triggered, resetting aggressive optimizations', () => {
    const engine = new FernPerformanceEngine({
      ...POTATO_PROFILE,
      fastMath: true,
      entityDistanceScaling: 0.5,
    });

    expect(engine.isSafeModeActive()).toBe(false);
    expect(engine.rendering.isFastMathActive()).toBe(true);

    engine.enableSafeMode('Rendering glitch reported');
    expect(engine.isSafeModeActive()).toBe(true);
    expect(engine.rendering.isFastMathActive()).toBe(false);
    expect(engine.entities.getState().distanceScaling).toBeGreaterThanOrEqual(0.8);
    expect(engine.rendering.shouldRenderClouds()).toBe(true);

    engine.disableSafeMode();
    expect(engine.isSafeModeActive()).toBe(false);
  });
});
