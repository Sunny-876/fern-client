import { describe, it, expect } from 'vitest';
import {
  CompatibilityEngine,
  CompatibilityCheckInput,
} from '../launcher/src/compatibility/compatibility-engine';

describe('Phase 13: Unified Compatibility Engine', () => {
  const engine = new CompatibilityEngine();

  describe('Minecraft <-> Java Runtime Compatibility', () => {
    it('marks Minecraft 1.21.4 with Java 21 as fully compatible', () => {
      const result = engine.evaluate({
        minecraftVersion: '1.21.4',
        javaMajorVersion: 21,
        loader: 'vanilla',
        allocatedRamMb: 4096,
      });

      expect(result.overallStatus).toBe('compatible');
      expect(result.isPlayable).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('flags Minecraft 1.21.4 with Java 17 as incompatible and non-playable', () => {
      const result = engine.evaluate({
        minecraftVersion: '1.21.4',
        javaMajorVersion: 17,
        loader: 'vanilla',
        allocatedRamMb: 4096,
      });

      expect(result.overallStatus).toBe('incompatible');
      expect(result.isPlayable).toBe(false);
      const javaIssue = result.issues.find((i) => i.code === 'JAVA_21_REQUIRED');
      expect(javaIssue).toBeDefined();
      expect(javaIssue?.isFatal).toBe(true);
      expect(javaIssue?.suggestedResolution).toContain('21');
    });

    it('accepts Minecraft 1.20.4 with Java 17', () => {
      const result = engine.evaluate({
        minecraftVersion: '1.20.4',
        javaMajorVersion: 17,
        loader: 'fabric',
        allocatedRamMb: 4096,
      });

      expect(result.overallStatus).toBe('compatible');
      expect(result.isPlayable).toBe(true);
    });

    it('rejects Minecraft 1.20.4 with Java 8 as incompatible', () => {
      const result = engine.evaluate({
        minecraftVersion: '1.20.4',
        javaMajorVersion: 8,
        loader: 'vanilla',
      });

      expect(result.overallStatus).toBe('incompatible');
      expect(result.isPlayable).toBe(false);
      expect(result.issues.some((i) => i.code === 'JAVA_17_REQUIRED')).toBe(true);
    });

    it('issues a warning when legacy Minecraft 1.16.5 runs on modern Java 21', () => {
      const result = engine.evaluate({
        minecraftVersion: '1.16.5',
        javaMajorVersion: 21,
        loader: 'forge',
        allocatedRamMb: 4096,
      });

      expect(result.overallStatus).toBe('warning');
      expect(result.isPlayable).toBe(true);
      const warn = result.issues.find((i) => i.code === 'LEGACY_JAVA_WARNING');
      expect(warn).toBeDefined();
      expect(warn?.isFatal).toBe(false);
    });
  });

  describe('Mod Loader Compatibility', () => {
    it('flags NeoForge on Minecraft 1.16.5 as incompatible', () => {
      const result = engine.evaluate({
        minecraftVersion: '1.16.5',
        javaMajorVersion: 8,
        loader: 'neoforge',
      });

      expect(result.overallStatus).toBe('incompatible');
      expect(result.isPlayable).toBe(false);
      expect(result.issues.some((i) => i.code === 'NEOFORGE_VERSION_UNSUPPORTED')).toBe(true);
    });

    it('allows NeoForge on Minecraft 1.20.4 and 1.21.4', () => {
      const result = engine.evaluate({
        minecraftVersion: '1.20.4',
        javaMajorVersion: 17,
        loader: 'neoforge',
      });

      expect(result.isPlayable).toBe(true);
    });
  });

  describe('Mod Dependencies & Mutual Incompatibilities', () => {
    it('detects missing required dependencies', () => {
      const result = engine.evaluate({
        minecraftVersion: '1.21.4',
        javaMajorVersion: 21,
        loader: 'fabric',
        installedMods: [
          {
            id: 'sodium',
            name: 'Sodium',
            loaders: ['fabric'],
            dependencies: [
              { id: 'fabric-api', name: 'Fabric API', type: 'required' },
            ],
            enabled: true,
          },
        ],
      });

      expect(result.overallStatus).toBe('missing_dependency');
      expect(result.isPlayable).toBe(false);
      const depIssue = result.issues.find((i) => i.code === 'MISSING_REQUIRED_DEPENDENCY');
      expect(depIssue).toBeDefined();
      expect(depIssue?.affectedComponent).toBe('Sodium');
    });

    it('resolves successfully when required dependencies are present', () => {
      const result = engine.evaluate({
        minecraftVersion: '1.21.4',
        javaMajorVersion: 21,
        loader: 'fabric',
        installedMods: [
          {
            id: 'fabric-api',
            name: 'Fabric API',
            loaders: ['fabric'],
            enabled: true,
          },
          {
            id: 'sodium',
            name: 'Sodium',
            loaders: ['fabric'],
            dependencies: [
              { id: 'fabric-api', name: 'Fabric API', type: 'required' },
            ],
            enabled: true,
          },
        ],
      });

      expect(result.overallStatus).toBe('compatible');
      expect(result.isPlayable).toBe(true);
    });

    it('detects mod loader mismatches (Fabric mod in Forge installation)', () => {
      const result = engine.evaluate({
        minecraftVersion: '1.20.1',
        javaMajorVersion: 17,
        loader: 'forge',
        installedMods: [
          {
            id: 'fabric-skyblock',
            name: 'Fabric Skyblock HUD',
            loaders: ['fabric'],
            enabled: true,
          },
        ],
      });

      expect(result.overallStatus).toBe('incompatible');
      expect(result.isPlayable).toBe(false);
      expect(result.issues.some((i) => i.code === 'MOD_LOADER_INCOMPATIBLE')).toBe(true);
    });

    it('allows Fabric mods when installation loader is Quilt', () => {
      const result = engine.evaluate({
        minecraftVersion: '1.20.1',
        javaMajorVersion: 17,
        loader: 'quilt',
        installedMods: [
          {
            id: 'fabric-hud',
            name: 'Fabric HUD',
            loaders: ['fabric'],
            enabled: true,
          },
        ],
      });

      expect(result.isPlayable).toBe(true);
      expect(result.issues.filter((i) => i.isFatal)).toHaveLength(0);
    });

    it('flags mutual rendering engine conflicts (OptiFine + Sodium)', () => {
      const result = engine.evaluate({
        minecraftVersion: '1.20.4',
        javaMajorVersion: 17,
        loader: 'fabric',
        installedMods: [
          { id: 'optifine', name: 'OptiFine HD', loaders: ['fabric'], enabled: true },
          { id: 'sodium', name: 'Sodium', loaders: ['fabric'], enabled: true },
        ],
      });

      expect(result.overallStatus).toBe('incompatible');
      expect(result.isPlayable).toBe(false);
      expect(result.issues.some((i) => i.code === 'OPTIFINE_SODIUM_CONFLICT')).toBe(true);
    });
  });

  describe('Memory Allocation Limits & Validation', () => {
    it('flags min RAM exceeding max RAM as fatal incompatibility', () => {
      const result = engine.evaluate({
        minecraftVersion: '1.21.4',
        javaMajorVersion: 21,
        loader: 'vanilla',
        minRamMb: 8192,
        allocatedRamMb: 4096,
      });

      expect(result.overallStatus).toBe('incompatible');
      expect(result.isPlayable).toBe(false);
      expect(result.issues.some((i) => i.code === 'MIN_RAM_EXCEEDS_MAX')).toBe(true);
    });

    it('warns when allocated memory is dangerously low (<1024 MB)', () => {
      const result = engine.evaluate({
        minecraftVersion: '1.21.4',
        javaMajorVersion: 21,
        loader: 'vanilla',
        allocatedRamMb: 512,
      });

      expect(result.overallStatus).toBe('warning');
      expect(result.isPlayable).toBe(true);
      expect(result.issues.some((i) => i.code === 'RAM_ALLOCATION_TOO_LOW')).toBe(true);
    });

    it('warns when allocated memory exceeds 85% of total system RAM', () => {
      const result = engine.evaluate({
        minecraftVersion: '1.21.4',
        javaMajorVersion: 21,
        loader: 'vanilla',
        allocatedRamMb: 15000,
        totalSystemRamMb: 16384,
      });

      expect(result.overallStatus).toBe('warning');
      expect(result.isPlayable).toBe(true);
      expect(result.issues.some((i) => i.code === 'RAM_ALLOCATION_EXCEEDS_RECOMMENDED')).toBe(true);
    });
  });

  describe('Shader Pack & Rendering Compatibility', () => {
    it('warns when a shader pack is enabled without a shader engine mod', () => {
      const result = engine.evaluate({
        minecraftVersion: '1.21.4',
        javaMajorVersion: 21,
        loader: 'fabric',
        shaderPacks: [{ name: 'ComplementaryReimagined.zip', enabled: true }],
      });

      expect(result.overallStatus).toBe('warning');
      expect(result.isPlayable).toBe(true);
      expect(result.issues.some((i) => i.code === 'MISSING_SHADER_RENDERER')).toBe(true);
    });

    it('does not warn when Iris is installed alongside the shader pack', () => {
      const result = engine.evaluate({
        minecraftVersion: '1.21.4',
        javaMajorVersion: 21,
        loader: 'fabric',
        installedMods: [{ id: 'iris', name: 'Iris Shaders', loaders: ['fabric'], enabled: true }],
        shaderPacks: [{ name: 'ComplementaryReimagined.zip', enabled: true }],
      });

      expect(result.overallStatus).toBe('compatible');
      expect(result.issues).toHaveLength(0);
    });
  });
});
