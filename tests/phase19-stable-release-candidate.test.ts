import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger, LogLevel } from '../launcher/src/core/logger';
import { InstallationManager } from '../launcher/src/installations/installation-manager';
import { ProfileManager } from '../launcher/src/installations/profile-manager';
import { AccountManager } from '../launcher/src/accounts/account-manager';
import { DiagnosticsService } from '../launcher/src/core/diagnostics-service';
import { LaunchArgumentValidator } from '../launcher/src/core/launch-arguments';
import { RegressionTracker } from '../launcher/src/qa/regression-tracker';
import { ReleasePipeline } from '../scripts/release-pipeline';
import { UpdateService } from '../launcher/src/core/update-service';
import { BRANDING } from '../shared/constants/branding';

describe('Phase 19: Beta Feedback Resolution, Regression Prevention & Stable Release Candidate', () => {
  let tmpDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-phase19-test-'));
    pathManager = new FernPathManager(tmpDir);
    await pathManager.initializeDirectories();
    logger = new FernLogger(pathManager);
    logger.setLogLevel('ERROR');
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error in temp
    }
  });

  // =========================================================================
  // 1. Defect Triage & Release Promotion Gate
  // =========================================================================
  describe('Beta Evidence Triage & Release Promotion Gate', () => {
    it('tracks triage lifecycle, links fixes, and enforces promotion gate criteria', () => {
      const tracker = new RegressionTracker();

      // Register defect
      const bug = tracker.submitReport({
        title: 'Corrupted profiles JSON prevents launcher startup',
        category: 'UI_CUSTOMIZATION',
        severity: 'CRITICAL',
        reproductionSteps: [
          'Simulate power loss writing profiles.json',
          'Launch Fern Client',
          'Observe crash or unhandled rejection'
        ],
        expectedResult: 'Launcher recovers with default profile and .corrupt.bak backup',
        actualResult: 'Launcher failed to load profiles',
        rawLogs: 'SyntaxError: Unexpected token < in JSON at position 0',
        fernVersion: '1.0.0-rc.1',
        releaseChannel: 'rc' as any,
        minecraftVersion: '1.21.4',
        javaRuntime: 'Java 21',
        loader: 'fabric',
      });

      // Initially, gate blocks promotion due to open critical defect
      let gate = tracker.evaluatePromotionGate();
      expect(gate.canPromoteToStable).toBe(false);
      expect(gate.metrics.criticalDefects).toBe(1);

      // Assign owner, link fix and mark resolved
      tracker.assignOwner(bug.id, 'reliability-team');
      tracker.linkFix(
        bug.id,
        'commit-rc1-data-safeguards',
        'tests/phase19-stable-release-candidate.test.ts'
      );

      // Re-evaluate gate
      gate = tracker.evaluatePromotionGate();
      expect(gate.canPromoteToStable).toBe(true);
      expect(gate.metrics.criticalDefects).toBe(0);

      const metrics = tracker.getMetrics();
      expect(metrics.total).toBe(1);
      expect(metrics.fixed).toBe(1);
      expect(metrics.critical).toBe(0);
    });
  });

  // =========================================================================
  // 2. Configuration & Data Integrity (Corrupt File Backup & Recovery)
  // =========================================================================
  describe('Data Integrity & Corrupt State Recovery', () => {
    it('InstallationManager: backs up corrupted JSON to .corrupt.bak and restores default installations', async () => {
      const instFilePath = pathManager.getInstallationsFilePath();
      await fs.mkdir(path.dirname(instFilePath), { recursive: true });

      // Write malformed JSON
      const corruptData = '{ "invalid_json": true, incomplete...';
      await fs.writeFile(instFilePath, corruptData, 'utf-8');

      const instManager = new InstallationManager(pathManager, logger);
      await instManager.load();

      // Manager should recover and be loaded
      const installations = instManager.getInstallations();
      expect(installations.length).toBeGreaterThan(0);
      expect(instManager.getActiveInstallation()).toBeDefined();

      // Verify .corrupt.bak file exists in directory
      const dirFiles = await fs.readdir(path.dirname(instFilePath));
      const backupFiles = dirFiles.filter(f => f.startsWith('installations.json.corrupt.') && f.endsWith('.bak'));
      expect(backupFiles.length).toBe(1);

      const backupContent = await fs.readFile(path.join(path.dirname(instFilePath), backupFiles[0]), 'utf-8');
      expect(backupContent).toBe(corruptData);
    });

    it('ProfileManager: backs up corrupted JSON to .corrupt.bak and restores default profile', async () => {
      const profFilePath = pathManager.getProfilesFilePath();
      await fs.mkdir(path.dirname(profFilePath), { recursive: true });

      const corruptData = '<<<CORRUPT_PROFILE_PAYLOAD>>>';
      await fs.writeFile(profFilePath, corruptData, 'utf-8');

      const profManager = new ProfileManager(pathManager, logger);
      await profManager.load();

      const profiles = profManager.getProfiles();
      expect(profiles.length).toBe(1);
      expect(profManager.getActiveProfile()).toBeDefined();
      expect(profManager.getActiveProfile()?.id).toBe('default-profile');

      const dirFiles = await fs.readdir(path.dirname(profFilePath));
      const backupFiles = dirFiles.filter(f => f.startsWith('profiles.json.corrupt.') && f.endsWith('.bak'));
      expect(backupFiles.length).toBe(1);

      const backupContent = await fs.readFile(path.join(path.dirname(profFilePath), backupFiles[0]), 'utf-8');
      expect(backupContent).toBe(corruptData);
    });

    it('AccountManager: backs up corrupted JSON to .corrupt.bak and recovers to empty account store', async () => {
      const accFilePath = pathManager.getAccountsFilePath();
      await fs.mkdir(path.dirname(accFilePath), { recursive: true });

      const corruptData = '{"accounts": [BROKEN_TOKEN_DATA]}';
      await fs.writeFile(accFilePath, corruptData, 'utf-8');

      const accManager = new AccountManager(pathManager, logger);
      await accManager.load();

      const accounts = accManager.getAccounts();
      expect(accounts.length).toBe(0);
      expect(accManager.getActiveAccount()).toBeNull();

      const dirFiles = await fs.readdir(path.dirname(accFilePath));
      const backupFiles = dirFiles.filter(f => f.startsWith('accounts.json.corrupt.') && f.endsWith('.bak'));
      expect(backupFiles.length).toBe(1);

      const backupContent = await fs.readFile(path.join(path.dirname(accFilePath), backupFiles[0]), 'utf-8');
      expect(backupContent).toBe(corruptData);
    });
  });

  // =========================================================================
  // 3. Security, Privacy & Diagnostic Redaction
  // =========================================================================
  describe('Security & Diagnostic Redaction', () => {
    it('DiagnosticsService thoroughly redacts tokens, passwords, user home paths, and IP addresses', () => {
      const sensitiveLog = [
        'Connecting to Minecraft OAuth endpoint with token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secretToken123',
        'Authentication request accessToken=secret_auth_token_value_xyz',
        'Database connection string: password=P@ssw0rd123!',
        'Local path accessed: C:\\Users\\Administrator\\AppData\\Roaming\\Fern Client\\config.json',
        'Remote telemetry host contacted at 192.168.1.100:443',
      ].join('\n');

      const sanitized = DiagnosticsService.sanitizeSensitiveText(sensitiveLog);

      expect(sanitized).not.toContain('secretToken123');
      expect(sanitized).not.toContain('secret_auth_token_value_xyz');
      expect(sanitized).not.toContain('P@ssw0rd123!');
      expect(sanitized).not.toContain('C:\\Users\\Administrator');
      expect(sanitized).not.toContain('192.168.1.100');
      expect(sanitized).toContain('<REDACTED_TOKEN>');
      expect(sanitized).toContain('<REDACTED_PASSWORD>');
      expect(sanitized).toContain('<USER_DIR>');
      expect(sanitized).toContain('[REDACTED_IP]');
    });

    it('LaunchArgumentValidator blocks command execution flags and script injectors in custom JVM args', () => {
      // Safe flags
      expect(LaunchArgumentValidator.validateArgs(['-Xmx4G', '-Xms2G', '-XX:+UseG1GC']).isValid).toBe(true);

      // Forbidden command chaining / shell injection characters
      const injections = [
        ['& calc.exe'],
        ['| powershell.exe -enc EvilPayload'],
        ['; cmd.exe /c start notepad.exe'],
        ['`evil_cmd`'],
        ['$EVIL_VAR'],
        ['> overwrite.txt'],
        ['< input.txt'],
      ];

      for (const injection of injections) {
        const result = LaunchArgumentValidator.validateArgs(injection);
        expect(result.isValid).toBe(false);
      }
    });
  });

  // =========================================================================
  // 4. Release Candidate Versioning, Channels & Build Manifest
  // =========================================================================
  describe('Release Candidate Packaging & Distribution Manifest', () => {
    it('branding version and package.json version align on Release Candidate or Stable', async () => {
      expect(['1.0.0-rc.1', '1.0.0']).toContain(BRANDING.VERSION);

      const pkgRaw = await fs.readFile(path.resolve('.', 'package.json'), 'utf-8');
      const pkg = JSON.parse(pkgRaw);
      expect(['1.0.0-rc.1', '1.0.0']).toContain(pkg.version);
    });

    it('ReleasePipeline detects RC channel, validates semver, and builds release manifest', async () => {
      const pipeline = new ReleasePipeline();

      expect(pipeline.validateSemver('1.0.0-rc.1')).toBe(true);
      expect(pipeline.detectChannel('1.0.0-rc.1')).toBe('rc');

      // Create a mock zip artifact in temporary directory
      const mockZip = path.join(tmpDir, 'FernClient-1.0.0-Portable.zip');
      await fs.writeFile(mockZip, 'BINARY_PAYLOAD_FOR_RC1_PORTABLE');

      const manifest = pipeline.buildReleaseManifest('1.0.0-rc.1', tmpDir, '1.0.0-beta.1');

      expect(manifest.version).toBe('1.0.0-rc.1');
      expect(manifest.channel).toBe('rc');
      expect(manifest.artifacts.length).toBe(1);
      expect(manifest.artifacts[0].sha256).toBeDefined();

      const releaseNotes = await fs.readFile(path.join(tmpDir, 'RELEASE_NOTES.md'), 'utf-8');
      expect(releaseNotes).toContain('Fern Client 1.0.0-rc.1 (RC)');

      const rollback = await fs.readFile(path.join(tmpDir, 'ROLLBACK_INSTRUCTIONS.md'), 'utf-8');
      expect(rollback).toContain('1.0.0-beta.1');
    });

    it('validates Windows packaging distribution manifest contains version and valid artifact checksums', async () => {
      const distJsonPath = path.resolve('.', 'packaging/distribution.json');
      const raw = await fs.readFile(distJsonPath, 'utf-8');
      const dist = JSON.parse(raw);

      expect(dist.name).toBe('Fern Client');
      expect(dist.platform).toBe('windows');
      expect(dist.architecture).toBe('x64');
      expect(['1.0.0-rc.1', '1.0.0']).toContain(dist.version.launcher);
      expect(['1.0.0-rc.1', '1.0.0']).toContain(dist.version.client);
      expect(dist.channels.stable).toBeDefined();

      // Portable artifact verification
      const portableZipPath = path.resolve('.', 'release/FernClient-1.0.0-Portable.zip');
      const exists = await fs.access(portableZipPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const zipStat = await fs.stat(portableZipPath);
      expect(zipStat.size).toBeGreaterThan(100000); // Realistic size ~215 KB
      expect(dist.distributables.portable.sizeBytes).toBe(zipStat.size);
    });

    it('UpdateService.compareSemver correctly ranks 1.0.0-beta.1 < 1.0.0-rc.1 < 1.0.0', () => {
      // Beta vs RC
      expect(UpdateService.compareSemver('1.0.0-rc.1', '1.0.0-beta.1')).toBe(1);
      expect(UpdateService.compareSemver('1.0.0-beta.1', '1.0.0-rc.1')).toBe(-1);

      // RC vs Final
      expect(UpdateService.compareSemver('1.0.0', '1.0.0-rc.1')).toBe(1);
      expect(UpdateService.compareSemver('1.0.0-rc.1', '1.0.0')).toBe(-1);

      // RC increments
      expect(UpdateService.compareSemver('1.0.0-rc.2', '1.0.0-rc.1')).toBe(1);
      expect(UpdateService.compareSemver('1.0.0-rc.1', '1.0.0-rc.1')).toBe(0);
    });
  });
});
