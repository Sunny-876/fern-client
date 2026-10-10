import { describe, it, expect } from 'vitest';
import { CompatibilityMatrixService } from '../launcher/src/compatibility/compatibility-matrix-service';

describe('Phase 15: Compatibility Matrix Automation', () => {
  const matrixService = new CompatibilityMatrixService();

  describe('Operating System Support Tiering', () => {
    it('rates Windows 11 and Windows 10 as fully supported and tested', () => {
      const win11 = matrixService.evaluateOS('Windows 11 23H2');
      expect(win11.tier).toBe('SUPPORTED_AND_TESTED');

      const win10 = matrixService.evaluateOS('Windows 10 22H2');
      expect(win10.tier).toBe('SUPPORTED_AND_TESTED');
    });

    it('marks Windows 7 and Windows 8 as unsupported blockers', () => {
      const win7 = matrixService.evaluateOS('Windows 7 SP1');
      expect(win7.tier).toBe('UNSUPPORTED');
      expect(win7.recommendedAlternatives).toBeDefined();

      const win8 = matrixService.evaluateOS('Windows 8.1');
      expect(win8.tier).toBe('UNSUPPORTED');
    });

    it('marks macOS and Linux as experimental community tiers', () => {
      const linux = matrixService.evaluateOS('Ubuntu Linux 24.04');
      expect(linux.tier).toBe('EXPERIMENTAL');

      const mac = matrixService.evaluateOS('macOS Darwin');
      expect(mac.tier).toBe('EXPERIMENTAL');
    });
  });

  describe('Minecraft & Java Runtime Pairing', () => {
    it('approves Minecraft 1.21.4 with Java 21 LTS', () => {
      const evals = matrixService.evaluateMinecraftAndJava('1.21.4', 21);
      expect(evals.some((e) => e.tier === 'SUPPORTED_AND_TESTED')).toBe(true);
      expect(evals.every((e) => e.tier !== 'UNSUPPORTED')).toBe(true);
    });

    it('rejects Minecraft 1.21.4 with Java 17 as unsupported blocker', () => {
      const evals = matrixService.evaluateMinecraftAndJava('1.21.4', 17);
      const javaEval = evals.find((e) => e.category === 'java');
      expect(javaEval?.tier).toBe('UNSUPPORTED');
      expect(javaEval?.notes).toContain('requires Java 21');
    });

    it('approves Minecraft 1.20.1 with Java 17 LTS', () => {
      const evals = matrixService.evaluateMinecraftAndJava('1.20.1', 17);
      expect(evals.every((e) => e.tier !== 'UNSUPPORTED')).toBe(true);
    });

    it('flags Minecraft 1.8.9 with Java 21 with limitations warning', () => {
      const evals = matrixService.evaluateMinecraftAndJava('1.8.9', 21);
      const javaEval = evals.find((e) => e.category === 'java');
      expect(javaEval?.tier).toBe('SUPPORTED_WITH_LIMITATIONS');
    });
  });

  describe('Mod Loader & Shader Integration', () => {
    it('rates Fabric on 1.21.4 as supported and tested', () => {
      const loaderEval = matrixService.evaluateLoader('fabric', '1.21.4');
      expect(loaderEval.tier).toBe('SUPPORTED_AND_TESTED');
    });

    it('rates Forge on 1.20.1 as supported and tested, but flags 1.21 with limitations', () => {
      const forge120 = matrixService.evaluateLoader('forge', '1.20.1');
      expect(forge120.tier).toBe('SUPPORTED_AND_TESTED');

      const forge121 = matrixService.evaluateLoader('forge', '1.21.4');
      expect(forge121.tier).toBe('SUPPORTED_WITH_LIMITATIONS');
    });

    it('rates Iris and Oculus as supported, OptiFine with limitations', () => {
      expect(matrixService.evaluateShader('iris').tier).toBe('SUPPORTED_AND_TESTED');
      expect(matrixService.evaluateShader('oculus').tier).toBe('SUPPORTED_AND_TESTED');
      expect(matrixService.evaluateShader('optifine').tier).toBe('SUPPORTED_WITH_LIMITATIONS');
    });
  });

  describe('Full Environment Evaluation', () => {
    it('passes standard production setup as runnable with no blockers', () => {
      const result = matrixService.evaluateEnvironment({
        osName: 'Windows 11 24H2',
        minecraftVersion: '1.21.4',
        javaMajorVersion: 21,
        loader: 'fabric',
        shaderMod: 'iris',
      });

      expect(result.isRunnable).toBe(true);
      expect(result.overallTier).toBe('SUPPORTED_AND_TESTED');
      expect(result.blockers.length).toBe(0);
    });

    it('blocks launch if Java LTS version is incompatible with Minecraft version', () => {
      const result = matrixService.evaluateEnvironment({
        osName: 'Windows 11',
        minecraftVersion: '1.21.4',
        javaMajorVersion: 17, // Java 17 cannot run MC 1.21
        loader: 'fabric',
      });

      expect(result.isRunnable).toBe(false);
      expect(result.overallTier).toBe('UNSUPPORTED');
      expect(result.blockers.length).toBeGreaterThan(0);
    });
  });
});
