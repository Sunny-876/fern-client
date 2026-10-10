import { describe, it, expect } from 'vitest';
import { JvmSynthesizer } from '../launcher/src/performance/jvm/jvm-synthesizer';

describe('JvmSynthesizer & Evidence-Based Argument Generation', () => {
  const synthesizer = new JvmSynthesizer();

  it('generates paired min/max heap allocations to avoid runtime resizing stutter', () => {
    const specs = synthesizer.synthesizeArguments({
      javaMajorVersion: 21,
      allocatedRamMb: 4096,
      minecraftVersion: '1.21.4',
    });

    const xms = specs.find((s) => s.flag.startsWith('-Xms'));
    const xmx = specs.find((s) => s.flag.startsWith('-Xmx'));

    expect(xms).toBeDefined();
    expect(xmx).toBeDefined();
    expect(xms?.flag).toBe('-Xms4096M');
    expect(xmx?.flag).toBe('-Xmx4096M');
    expect(xms?.reason).toContain('eliminate runtime heap resizing');
  });

  it('provides comprehensive, documented justifications for every generated argument', () => {
    const specs = synthesizer.synthesizeArguments({
      javaMajorVersion: 21,
      allocatedRamMb: 6144,
      minecraftVersion: '1.21.4',
    });

    for (const spec of specs) {
      expect(spec.flag).toBeTruthy();
      expect(spec.reason).toBeTruthy();
      expect(spec.reason.length).toBeGreaterThan(15);
      expect(spec.category).toMatch(/^(heap|gc|compiler|system|optimization)$/);
    }
  });

  it('applies G1GC ergonomics and low-pause goals for standard workloads', () => {
    const flags = synthesizer.generateArgumentList({
      javaMajorVersion: 21,
      allocatedRamMb: 4096,
      minecraftVersion: '1.21.4',
    });

    expect(flags).toContain('-XX:+UseG1GC');
    expect(flags).toContain('-XX:MaxGCPauseMillis=50');
    expect(flags).toContain('-XX:+ParallelRefProcEnabled');
    expect(flags).toContain('-XX:G1NewSizePercent=20');
    expect(flags).toContain('-XX:G1ReservePercent=15');
    expect(flags).toContain('-XX:InitiatingHeapOccupancyPercent=45');
    expect(flags).toContain('-XX:+AlwaysPreTouch');
  });

  it('dynamically adapts G1HeapRegionSize based on allocated heap scale', () => {
    const mediumHeapFlags = synthesizer.generateArgumentList({
      javaMajorVersion: 17,
      allocatedRamMb: 4096,
      minecraftVersion: '1.20.1',
    });
    expect(mediumHeapFlags).toContain('-XX:G1HeapRegionSize=16M');

    const largeHeapFlags = synthesizer.generateArgumentList({
      javaMajorVersion: 17,
      allocatedRamMb: 8192,
      minecraftVersion: '1.20.1',
    });
    expect(largeHeapFlags).toContain('-XX:G1HeapRegionSize=32M');
  });

  it('supports Generational ZGC for Java 21+ with 12GB+ allocated RAM when requested', () => {
    const zgcFlags = synthesizer.generateArgumentList({
      javaMajorVersion: 21,
      allocatedRamMb: 14336, // 14 GB
      minecraftVersion: '1.21.4',
      preferZgc: true,
    });

    expect(zgcFlags).toContain('-XX:+UseZGC');
    expect(zgcFlags).toContain('-XX:+ZGenerational');
    expect(zgcFlags).not.toContain('-XX:+UseG1GC');
  });

  it('falls back to safe standard flags when isSafeMode is active', () => {
    const safeFlags = synthesizer.generateArgumentList({
      javaMajorVersion: 21,
      allocatedRamMb: 14336,
      minecraftVersion: '1.21.4',
      preferZgc: true,
      isSafeMode: true,
    });

    // Should NOT use ZGC or aggressive G1 percentages in safe mode
    expect(safeFlags).toContain('-XX:+UseG1GC');
    expect(safeFlags).not.toContain('-XX:+ZGenerational');
    expect(safeFlags).not.toContain('-XX:G1NewSizePercent=20');
  });
});
