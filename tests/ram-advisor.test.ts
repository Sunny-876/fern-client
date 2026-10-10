import { describe, it, expect } from 'vitest';
import { RamAdvisor } from '../launcher/src/performance/memory/ram-advisor';

describe('RamAdvisor & Automatic RAM Recommendations', () => {
  const advisor = new RamAdvisor();

  it('recommends 3-4 GB RAM for Vanilla Minecraft', () => {
    const rec = advisor.calculateRecommendation({
      systemTotalRamMb: 16384, // 16 GB PC
      minecraftVersion: '1.21.4',
      loader: 'vanilla',
      modCount: 0,
    });

    expect(rec.category).toBe('vanilla');
    expect(rec.recommendedMinMb).toBe(2048);
    expect(rec.recommendedMaxMb).toBe(4096);
    expect(rec.isConstrained).toBe(false);
    expect(rec.reason).toContain('Vanilla Minecraft runs optimally');
  });

  it('recommends 4-5 GB RAM for light modded setups (10-20 mods)', () => {
    const rec = advisor.calculateRecommendation({
      systemTotalRamMb: 16384,
      minecraftVersion: '1.21.4',
      loader: 'fabric',
      modCount: 15,
    });

    expect(rec.category).toBe('light_modded');
    expect(rec.recommendedMinMb).toBe(3072);
    expect(rec.recommendedMaxMb).toBe(5120);
    expect(rec.isConstrained).toBe(false);
  });

  it('recommends 5-6 GB RAM for medium modded setups (21-60 mods)', () => {
    const rec = advisor.calculateRecommendation({
      systemTotalRamMb: 16384,
      minecraftVersion: '1.20.1',
      loader: 'forge',
      modCount: 45,
    });

    expect(rec.category).toBe('medium_modded');
    expect(rec.recommendedMinMb).toBe(4096);
    expect(rec.recommendedMaxMb).toBe(6144);
    expect(rec.isConstrained).toBe(false);
  });

  it('recommends 6-8 GB RAM for heavy modpacks (61+ mods)', () => {
    const rec = advisor.calculateRecommendation({
      systemTotalRamMb: 32768, // 32 GB system
      minecraftVersion: '1.20.1',
      loader: 'neoforge',
      modCount: 120,
    });

    expect(rec.category).toBe('heavy_modded');
    expect(rec.recommendedMinMb).toBe(6144);
    expect(rec.recommendedMaxMb).toBe(8192);
    expect(rec.isConstrained).toBe(false);
  });

  it('enforces safety constraints on low-memory systems (8 GB RAM)', () => {
    const rec = advisor.calculateRecommendation({
      systemTotalRamMb: 8192, // 8 GB total system RAM
      minecraftVersion: '1.20.1',
      loader: 'forge',
      modCount: 100, // Heavy pack would ideally want 8GB, but system only has 8GB
    });

    expect(rec.isConstrained).toBe(true);
    // Must leave at least 2.5GB for OS: 8192 - 2500 = 5692 MB or 75% = 6144 MB
    expect(rec.recommendedMaxMb).toBeLessThanOrEqual(5692);
    expect(rec.reason).toContain('Constrained by total system memory');
  });
});
