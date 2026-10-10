import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  RegressionTracker,
  sanitizeLogContent,
  DefectReport,
} from '../launcher/src/qa/regression-tracker';
import { ReleasePipeline } from '../scripts/release-pipeline';

describe('Phase 15: Regression Tracking, Triage & Release Pipeline', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-p15-triage-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('Log Sanitization & Privacy Protection', () => {
    it('sanitizes Windows user paths, secret tokens, and non-local IP addresses', () => {
      const dirtyLog = `
[INFO] Error reading C:\\Users\\Alice\\AppData\\Roaming\\Fern Client\\config.json
[WARN] Failed token exchange: accessToken=secret_oauth_token_12345
[DEBUG] Connected to remote node at 198.51.100.25:25565
[DEBUG] Preserved localhost 127.0.0.1:8080
      `.trim();

      const sanitized = sanitizeLogContent(dirtyLog);

      expect(sanitized).not.toContain('Alice');
      expect(sanitized).toContain('%USERPROFILE%');
      expect(sanitized).not.toContain('secret_oauth_token_12345');
      expect(sanitized).toContain('accessToken=[REDACTED]');
      expect(sanitized).not.toContain('198.51.100.25');
      expect(sanitized).toContain('[REDACTED_IP]');
      expect(sanitized).toContain('127.0.0.1:8080'); // Preserved localhost
    });
  });

  describe('Regression Tracker & Promotion Gate', () => {
    it('submits defects, sanitizes raw logs, and detects duplicates', () => {
      const tracker = new RegressionTracker();

      const defect1 = tracker.submitReport({
        title: 'Rendering glitch with sodium',
        fernVersion: '1.0.0-beta.1',
        releaseChannel: 'beta',
        minecraftVersion: '1.21.4',
        javaRuntime: 'Java 21',
        loader: 'fabric',
        category: 'PERFORMANCE',
        severity: 'MEDIUM',
        reproductionSteps: ['Launch game', 'Open video settings'],
        expectedResult: 'Smooth frame rate',
        actualResult: 'Flickering textures',
        rawLogs: 'Log at C:\\Users\\Bob\\Fern.log with token=xyz',
      });

      expect(defect1.id).toBeDefined();
      expect(defect1.sanitizedLogs).not.toContain('Bob');

      // Duplicate detection
      const duplicateCandidate: DefectReport = {
        id: 'new-id',
        title: 'Rendering glitch with sodium',
        fernVersion: '1.0.0-beta.1',
        releaseChannel: 'beta',
        minecraftVersion: '1.21.4',
        javaRuntime: 'Java 21',
        loader: 'fabric',
        category: 'PERFORMANCE',
        severity: 'LOW',
        reproductionSteps: [],
        expectedResult: '',
        actualResult: '',
        sanitizedLogs: '',
        createdAt: Date.now(),
        status: 'OPEN',
      };

      const match = tracker.findDuplicate(duplicateCandidate);
      expect(match).not.toBeNull();
      expect(match?.id).toBe(defect1.id);
    });

    it('blocks promotion to stable when critical or excessive high defects are open', () => {
      const tracker = new RegressionTracker();

      // Clean state passes
      expect(tracker.evaluatePromotionGate().canPromoteToStable).toBe(true);

      // Add a CRITICAL defect
      const crit = tracker.submitReport({
        title: 'Crash on boot',
        fernVersion: '1.0.0-beta.1',
        releaseChannel: 'beta',
        minecraftVersion: '1.21.4',
        javaRuntime: 'Java 21',
        loader: 'fabric',
        category: 'LAUNCH_FAILURE',
        severity: 'CRITICAL',
        reproductionSteps: ['Click launch'],
        expectedResult: 'Minecraft boots',
        actualResult: 'Crash with code 1',
        rawLogs: 'error log',
      });

      const gateStatus = tracker.evaluatePromotionGate();
      expect(gateStatus.canPromoteToStable).toBe(false);
      expect(gateStatus.blockingReasons.length).toBeGreaterThan(0);

      // Resolve critical defect
      tracker.updateStatus(crit.id, 'FIXED');
      expect(tracker.evaluatePromotionGate().canPromoteToStable).toBe(true);
    });
  });

  describe('Release Pipeline Automation', () => {
    it('validates semantic version strings and detects channels accurately', () => {
      const pipeline = new ReleasePipeline();

      expect(pipeline.validateSemver('1.0.0')).toBe(true);
      expect(pipeline.validateSemver('1.0.0-beta.1')).toBe(true);
      expect(pipeline.validateSemver('2.1.4-rc.2')).toBe(true);
      expect(pipeline.validateSemver('invalid-version')).toBe(false);

      expect(pipeline.detectChannel('1.0.0')).toBe('stable');
      expect(pipeline.detectChannel('1.0.0-beta.2')).toBe('beta');
    });

    it('generates release manifest, SHA256 sums, release notes, and rollback plans', async () => {
      const pipeline = new ReleasePipeline();

      // Create mock artifacts in temp release dir
      const mockZip = path.join(tmpDir, 'FernClient-1.0.0-Portable.zip');
      await fs.writeFile(mockZip, 'MOCK_ZIP_BINARY_DATA');

      const manifest = pipeline.buildReleaseManifest('1.0.0-beta.1', tmpDir, '1.0.0-beta.0');

      expect(manifest.version).toBe('1.0.0-beta.1');
      expect(manifest.channel).toBe('beta');
      expect(manifest.artifacts.length).toBe(1);
      expect(manifest.artifacts[0].sha256).toBeDefined();

      // Check generated files
      const sumsContent = await fs.readFile(path.join(tmpDir, 'SHA256SUMS.txt'), 'utf-8');
      expect(sumsContent).toContain('FernClient-1.0.0-Portable.zip');

      const notesContent = await fs.readFile(path.join(tmpDir, 'RELEASE_NOTES.md'), 'utf-8');
      expect(notesContent).toContain('Fern Client 1.0.0-beta.1');

      const rollbackContent = await fs.readFile(path.join(tmpDir, 'ROLLBACK_INSTRUCTIONS.md'), 'utf-8');
      expect(rollbackContent).toContain('1.0.0-beta.0');
    });
  });
});
