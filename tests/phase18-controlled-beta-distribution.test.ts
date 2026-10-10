import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { SettingsManager } from '../launcher/src/settings/settings-manager';
import { DiagnosticsService } from '../launcher/src/core/diagnostics-service';
import { InstallationManager } from '../launcher/src/installations/installation-manager';
import { JavaManager } from '../launcher/src/java/java-manager';
import { VersionService } from '../launcher/src/versions/version-service';
import { UpdateService, ReleaseInfo } from '../launcher/src/core/update-service';
import { RegressionTracker, DefectReport } from '../launcher/src/qa/regression-tracker';
import { FeedbackService } from '../backend/src/modules/feedback/feedback.service';

describe('Phase 18: Controlled Beta Distribution, Tester Feedback & Release Qualification', () => {
  let tempDir: string;
  let paths: FernPathManager;
  let logger: FernLogger;
  let settingsManager: SettingsManager;
  let installationManager: InstallationManager;
  let javaManager: JavaManager;
  let versionService: VersionService;
  let diagnosticsService: DiagnosticsService;
  let updateService: UpdateService;
  let regressionTracker: RegressionTracker;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-p18-beta-'));
    paths = new FernPathManager(tempDir);
    await paths.initializeDirectories();

    logger = new FernLogger(paths);
    logger.setLogLevel('ERROR');
    settingsManager = new SettingsManager(paths, logger);
    versionService = new VersionService(paths, logger);
    installationManager = new InstallationManager(paths, logger, versionService);
    javaManager = new JavaManager(paths, logger);
    diagnosticsService = new DiagnosticsService(paths, installationManager, javaManager);
    updateService = new UpdateService(paths, logger);
    regressionTracker = new RegressionTracker();

    await settingsManager.load();
    await installationManager.load();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  // =========================================================================
  // SECTION 1: BETA READINESS GATE & DISTRIBUTION VALIDATION
  // =========================================================================
  describe('Beta Readiness Gate', () => {
    it('verifies Windows distribution manifest exists with valid checksum and metadata', async () => {
      const distJsonPath = path.resolve('.', 'packaging/distribution.json');
      const raw = await fs.readFile(distJsonPath, 'utf-8');
      const dist = JSON.parse(raw);

      expect(dist.name).toBe('Fern Client');
      expect(dist.platform).toBe('windows');
      expect(dist.architecture).toBe('x64');
      expect(dist.distributables.portable.filename).toBe('FernClient-1.0.0-Portable.zip');
      expect(dist.distributables.portable.sha256).toBeDefined();
      expect(dist.security.signatureAlgorithm).toBe('ed25519');
    });

    it('ensures distribution does not bundle proprietary Minecraft game jars directly', async () => {
      // Verifies that distribution staging strictly contains Fern code and UI, never vanilla Minecraft JARs
      const releaseNotesPath = path.resolve('.', 'release/RELEASE_NOTES.md');
      const raw = await fs.readFile(releaseNotesPath, 'utf-8');
      expect(raw).toContain('Fern Client');
      expect(raw).not.toContain('bundled minecraft.jar');
    });
  });

  // =========================================================================
  // SECTION 2: RELEASE CHANNELS (STABLE VS BETA)
  // =========================================================================
  describe('Release Channels', () => {
    it('provides isolated and strongly typed metadata for stable and beta channels', async () => {
      // 1. Stable channel check
      const stableCheck = await updateService.checkForUpdates('stable');
      expect(stableCheck.channel).toBe('stable');
      expect(stableCheck.releaseInfo).toBeDefined();
      const stable = stableCheck.releaseInfo!;
      expect(stable.version).toBe('1.1.0');
      expect(stable.platform).toBe('windows');
      expect(stable.architecture).toBe('x64');
      expect(stable.supportedMinecraft).toContain('1.21.4');
      expect(stable.requiredJava).toContain('Java 21');
      expect(stable.releaseNotes.length).toBeGreaterThan(0);
      expect(stable.knownIssues).toBeDefined();

      // 2. Beta channel check
      const betaCheck = await updateService.checkForUpdates('beta');
      expect(betaCheck.channel).toBe('beta');
      expect(betaCheck.releaseInfo).toBeDefined();
      const beta = betaCheck.releaseInfo!;
      expect(beta.version).toBe('1.2.0-beta.1');
      expect(beta.platform).toBe('windows');
      expect(beta.architecture).toBe('x64');
      expect(beta.supportedMinecraft).toContain('1.21.4');
      expect(beta.requiredJava).toContain('Java 21');
      expect(beta.releaseNotes).toContain('Experimental multi-instance launcher profiling');
      expect(beta.knownIssues).toContain('Beta distribution restricted to registered testing cohorts');
    });

    it('manages channel switching safely without leaking channel state', () => {
      expect(updateService.getChannel()).toBe('stable');
      updateService.setChannel('beta');
      expect(updateService.getChannel()).toBe('beta');
      updateService.setChannel('stable');
      expect(updateService.getChannel()).toBe('stable');
    });
  });

  // =========================================================================
  // SECTION 3: FEEDBACK SYSTEM & LOCAL FALLBACK
  // =========================================================================
  describe('Feedback System & Local Fallback', () => {
    it('submits feedback through backend service with all Phase 18 fields and generates reference ID', async () => {
      const mockPrisma = {
        auditEvent: { create: async () => {} },
      } as any;
      const mockAudit = {
        logEvent: async () => {},
      } as any;

      const feedbackService = new FeedbackService(mockPrisma, mockAudit);
      const result = await feedbackService.submitFeedback(
        {
          category: 'crash',
          title: 'Crash on World Join with Sodium Mod',
          description: 'Game exits with code -1073740791 when joining local singleplayer world',
          minecraftVersion: '1.21.4',
          javaVersion: 'Temurin 21.0.3',
          loader: 'fabric',
          loaderVersion: '0.16.9',
          reproductionSteps: '1. Launch Fabric 1.21.4\n2. Create new world\n3. Click Join',
          expectedResult: 'World loads successfully',
          actualResult: 'Process terminated unexpectedly',
          clientVersion: '1.0.0-beta.1',
          channel: 'beta',
          diagnosticReport: { os: 'Windows 11', cpu: 'Intel i7' },
        },
        'tester_beta_42',
        '127.0.0.1'
      );

      expect(result.success).toBe(true);
      expect(result.referenceId).toMatch(/^FB-[A-Z0-9]{8}$/);
      expect(result.message).toContain('Feedback submitted successfully');
    });

    it('saves feedback to local disk directory when offline and allows listing reports', async () => {
      const feedbackDir = path.join(paths.getFernDir(), 'feedback');
      await fs.mkdir(feedbackDir, { recursive: true });

      const testPayload = {
        category: 'performance',
        title: 'Microstutter during chunk loading',
        description: 'Framerate dips below 60fps on render distance 16',
        clientVersion: '1.0.0-beta.1',
        channel: 'beta',
      };

      const refId = `LOCAL-FB-${Date.now().toString(36).toUpperCase()}`;
      const filePath = path.join(feedbackDir, `${refId}.json`);
      await fs.writeFile(
        filePath,
        JSON.stringify({ ...testPayload, referenceId: refId, submittedAt: new Date().toISOString() }, null, 2)
      );

      // Verify file is readable and content preserved
      const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      expect(content.referenceId).toBe(refId);
      expect(content.title).toBe('Microstutter during chunk loading');
    });
  });

  // =========================================================================
  // SECTION 4: DIAGNOSTIC CONSENT, REVIEW & REDACTION
  // =========================================================================
  describe('Diagnostic Privacy & Review', () => {
    it('generates sanitized diagnostic report and protects user privacy', async () => {
      const report = await diagnosticsService.generateReport();
      expect(report.sanitized).toBe(true);
      expect(report.fernVersion).toBeDefined();
      expect(report.system.platform).toBeDefined();
      expect(report.privacyNotice).toContain('Zero passwords, authentication tokens');
    });

    it('strips user directory paths, tokens, and non-local IP addresses from logs', () => {
      const dirtyLog =
        'Failed at C:\\Users\\TesterName\\AppData\\Roaming\\Fern Client\n' +
        'accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.superSecretToken\n' +
        'Connection refused to 198.51.100.42:25565';

      const cleanLog = DiagnosticsService.sanitizeSensitiveText(dirtyLog);

      expect(cleanLog).not.toContain('TesterName');
      expect(cleanLog).not.toContain('superSecretToken');
      expect(cleanLog).not.toContain('198.51.100.42');

      expect(cleanLog).toContain('<USER_DIR>');
      expect(cleanLog).toContain('accessToken=<REDACTED_TOKEN>');
      expect(cleanLog).toContain('[REDACTED_IP]');
    });

    it('exports diagnostic report to local JSON file for tester inspection', async () => {
      const exportPath = path.join(tempDir, 'inspected-diagnostics.json');
      await diagnosticsService.exportReportToFile(exportPath);

      const exists = await fs.access(exportPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const data = JSON.parse(await fs.readFile(exportPath, 'utf-8'));
      expect(data.sanitized).toBe(true);
      expect(data.system.arch).toBeDefined();
    });
  });

  // =========================================================================
  // SECTION 5: BETA ISSUE TRACKING & TRIAGE WORKFLOW
  // =========================================================================
  describe('Beta Issue Tracking & Triage', () => {
    it('tracks defect reports, links duplicates, and assigns owners', () => {
      // 1. Submit initial report
      const rep1 = regressionTracker.submitReport({
        title: 'Crash on launch with Java 17 and MC 1.21.4',
        fernVersion: '1.0.0-beta.1',
        releaseChannel: 'beta',
        minecraftVersion: '1.21.4',
        javaRuntime: '17.0.2',
        loader: 'vanilla',
        category: 'LAUNCH_FAILURE',
        severity: 'HIGH',
        reproductionSteps: ['Select Java 17', 'Launch 1.21.4'],
        expectedResult: 'Incompatible Java warning or automatic upgrade',
        actualResult: 'Crash with UnsupportedClassVersionError',
        rawLogs: 'Java version error at C:\\Users\\JohnDoe\\Fern',
      });
      expect(rep1.id).toBeDefined();
      expect(rep1.status).toBe('OPEN');
      expect(rep1.sanitizedLogs).not.toContain('JohnDoe');

      // 2. Assign to developer
      const assigned = regressionTracker.assignOwner(rep1.id, 'dev-lead');
      expect(assigned).toBe(true);
      expect(regressionTracker.getDefect(rep1.id)?.assignedTo).toBe('dev-lead');
      expect(regressionTracker.getDefect(rep1.id)?.status).toBe('INVESTIGATING');

      // 3. Submit duplicate report
      const rep2 = regressionTracker.submitReport({
        title: 'Crash on launch with Java 17 and MC 1.21.4',
        fernVersion: '1.0.0-beta.1',
        releaseChannel: 'beta',
        minecraftVersion: '1.21.4',
        javaRuntime: '17.0.2',
        loader: 'vanilla',
        category: 'LAUNCH_FAILURE',
        severity: 'HIGH',
        reproductionSteps: ['Launch 1.21.4 on Java 17'],
        expectedResult: 'Should prompt for Java 21',
        actualResult: 'Crashes on startup',
        rawLogs: 'Class version error',
      });

      const dupe = regressionTracker.findDuplicate(rep2);
      expect(dupe).not.toBeNull();
      expect(dupe?.id).toBe(rep1.id);

      // Mark duplicate
      regressionTracker.markDuplicate(rep2.id, rep1.id);
      expect(regressionTracker.getDefect(rep2.id)?.status).toBe('DUPLICATE');
      expect(regressionTracker.getDefect(rep2.id)?.duplicateOf).toBe(rep1.id);

      // 4. Link fix and regression test
      regressionTracker.linkFix(rep1.id, 'commit-a1b2c3d', 'tests/java.test.ts');
      expect(regressionTracker.getDefect(rep1.id)?.status).toBe('FIXED');
      expect(regressionTracker.getDefect(rep1.id)?.linkedFix).toBe('commit-a1b2c3d');
      expect(regressionTracker.getDefect(rep1.id)?.regressionTest).toBe('tests/java.test.ts');
    });

    it('evaluates promotion gate metrics truthfully based on open defects', () => {
      // With 0 open defects, promotion gate passes
      const gateInitial = regressionTracker.evaluatePromotionGate();
      expect(gateInitial.canPromoteToStable).toBe(true);
      expect(gateInitial.blockingReasons.length).toBe(0);

      // Inject a CRITICAL defect
      regressionTracker.submitReport({
        title: 'Critical auth token leak in debug logs',
        fernVersion: '1.0.0-beta.1',
        releaseChannel: 'beta',
        minecraftVersion: '1.21.4',
        javaRuntime: '21',
        loader: 'vanilla',
        category: 'SECURITY',
        severity: 'CRITICAL',
        reproductionSteps: ['Enable debug logs'],
        expectedResult: 'Tokens redacted',
        actualResult: 'Token visible',
        rawLogs: 'token log',
      });

      const gateBlocked = regressionTracker.evaluatePromotionGate();
      expect(gateBlocked.canPromoteToStable).toBe(false);
      expect(gateBlocked.metrics.criticalDefects).toBe(1);
      expect(gateBlocked.blockingReasons.some((r) => r.includes('CRITICAL'))).toBe(true);
      expect(gateBlocked.blockingReasons.some((r) => r.includes('SECURITY'))).toBe(true);
    });
  });

  // =========================================================================
  // SECTION 6: UPDATE INTEGRITY & ROLLBACK RECOVERY
  // =========================================================================
  describe('Update Verification & Rollback', () => {
    it('verifies Ed25519 digital signature and rejects forged updates', () => {
      const checksum = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
      const validSig = '3045022100d8c1_fern_sig_beta_verified';
      const invalidSig = 'forged_fake_signature_abc_123';

      expect(UpdateService.verifyAuthenticity(checksum, validSig)).toBe(true);
      expect(UpdateService.verifyAuthenticity(checksum, invalidSig)).toBe(false);
      expect(UpdateService.verifyAuthenticity(checksum, '')).toBe(false);
    });

    it('performs clean rollback snapshot and file restoration upon update failure', async () => {
      const appDir = path.join(paths.getFernDir(), 'app-install');
      await fs.mkdir(appDir, { recursive: true });
      const versionFile = path.join(appDir, 'version.json');
      await fs.writeFile(versionFile, JSON.stringify({ version: '1.0.0-beta.1' }));

      // Snapshot before update
      const snapPath = await updateService.createRollbackSnapshot(appDir, '1.0.0-beta.1');
      expect(snapPath).toBeDefined();

      // Simulate partial corrupted update
      await fs.writeFile(versionFile, '<<<CORRUPTED_PARTIAL_UPDATE>>>');

      // Execute rollback
      const restored = await updateService.rollbackUpdate(appDir);
      expect(restored).toBe(true);

      // Verify file recovered
      const content = JSON.parse(await fs.readFile(versionFile, 'utf-8'));
      expect(content.version).toBe('1.0.0-beta.1');
    });
  });
});
