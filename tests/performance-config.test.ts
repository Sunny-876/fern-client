import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  POTATO_PROFILE,
  BALANCED_PROFILE,
  QUALITY_PROFILE,
  DEFAULT_PERFORMANCE_SETTINGS,
  getProfilePreset,
} from '../shared/constants/performance-profiles';
import { SafeModeManager } from '../client/src/performance/core/SafeModeManager';
import { OptionsSyncer } from '../launcher/src/performance/options/options-syncer';
import { FernPerformanceEngine } from '../client/src/performance/core/FernPerformanceEngine';

describe('Performance Configuration & Profiles', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'fern-perf-test-'));
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignored
    }
  });

  it('provides sensible, distinct defaults for Potato, Balanced, and Quality profiles', () => {
    expect(POTATO_PROFILE.profile).toBe('potato');
    expect(POTATO_PROFILE.clouds).toBe(false);
    expect(POTATO_PROFILE.particles).toBe('minimal');
    expect(POTATO_PROFILE.chunkRenderDistance).toBeLessThanOrEqual(8);
    expect(POTATO_PROFILE.fastMath).toBe(true);

    expect(BALANCED_PROFILE.profile).toBe('balanced');
    expect(BALANCED_PROFILE.chunkRenderDistance).toBe(12);
    expect(BALANCED_PROFILE.particles).toBe('decreased');
    expect(BALANCED_PROFILE.fastMath).toBe(true);

    expect(QUALITY_PROFILE.profile).toBe('quality');
    expect(QUALITY_PROFILE.chunkRenderDistance).toBe(18);
    expect(QUALITY_PROFILE.particles).toBe('all');
    expect(QUALITY_PROFILE.clouds).toBe(true);

    expect(DEFAULT_PERFORMANCE_SETTINGS.profile).toBe('balanced');
  });

  it('correctly resolves presets via getProfilePreset()', () => {
    expect(getProfilePreset('potato').profile).toBe('potato');
    expect(getProfilePreset('quality').profile).toBe('quality');
    expect(getProfilePreset('balanced').profile).toBe('balanced');
  });

  it('enforces Safe Performance Mode sanitization to prevent rendering crashes', () => {
    const safeManager = new SafeModeManager();
    expect(safeManager.isSafeMode()).toBe(false);

    // Initial custom aggressive settings
    const aggressive = {
      ...POTATO_PROFILE,
      fastMath: true,
      entityDistanceScaling: 0.5,
      chunkSchedulingMode: 'async' as const,
      clouds: false,
    };

    safeManager.enableSafeMode('Mod compatibility conflict', 'potato');
    expect(safeManager.isSafeMode()).toBe(true);

    const sanitized = safeManager.sanitizeSettings(aggressive);
    expect(sanitized.safeMode).toBe(true);
    expect(sanitized.fastMath).toBe(false); // aggressive fast-math disabled
    expect(sanitized.entityDistanceScaling).toBeGreaterThanOrEqual(0.8); // mobs won't vanish
    expect(sanitized.chunkSchedulingMode).toBe('default'); // safe chunk pipeline
    expect(sanitized.clouds).toBe(true);
  });

  it('synchronizes performance parameters into Minecraft options.txt while preserving other user keys', async () => {
    const optionsPath = path.join(tempDir, 'options.txt');
    // Pre-populate existing custom user options (e.g., custom FOV and keybinds)
    const existing = [
      'fov:85.0',
      'key_key.jump:key.keyboard.space',
      'renderDistance:16',
      'soundCategory_master:0.75',
    ].join('\n');
    await fs.promises.writeFile(optionsPath, existing, 'utf8');

    const syncer = new OptionsSyncer();
    await syncer.syncOptions(tempDir, POTATO_PROFILE);

    const updated = await fs.promises.readFile(optionsPath, 'utf8');
    // Check that user keys are preserved
    expect(updated).toContain('fov:85.0');
    expect(updated).toContain('key_key.jump:key.keyboard.space');
    expect(updated).toContain('soundCategory_master:0.75');

    // Check that Fern Potato options were synchronized
    expect(updated).toContain(`renderDistance:${POTATO_PROFILE.chunkRenderDistance}`);
    expect(updated).toContain(`simulationDistance:${POTATO_PROFILE.simulationDistance}`);
    expect(updated).toContain('particles:2'); // minimal = 2
    expect(updated).toContain('graphicsMode:1'); // fast graphics for potato
    expect(updated).toContain('clouds:false');
  });

  it('switches profiles cleanly inside FernPerformanceEngine', () => {
    const engine = new FernPerformanceEngine({ profile: 'balanced' });
    expect(engine.getSettings().profile).toBe('balanced');
    expect(engine.particles.getParticleLevel()).toBe('decreased');

    engine.applyProfile('potato');
    expect(engine.getSettings().profile).toBe('potato');
    expect(engine.particles.getParticleLevel()).toBe('minimal');
    expect(engine.rendering.shouldRenderClouds()).toBe(false);

    engine.applyProfile('quality');
    expect(engine.getSettings().profile).toBe('quality');
    expect(engine.particles.getParticleLevel()).toBe('all');
    expect(engine.chunks.getRenderDistance()).toBe(18);
  });
});
