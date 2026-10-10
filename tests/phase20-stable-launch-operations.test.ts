import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { SettingsManager } from '../launcher/src/settings/settings-manager';
import { InstallationManager } from '../launcher/src/installations/installation-manager';
import { ProfileManager } from '../launcher/src/installations/profile-manager';
import { AccountManager } from '../launcher/src/accounts/account-manager';
import { UpdateService } from '../launcher/src/core/update-service';
import { DiagnosticsService } from '../launcher/src/core/diagnostics-service';
import { LaunchArgumentValidator } from '../launcher/src/core/launch-arguments';
import { RegressionTracker } from '../launcher/src/qa/regression-tracker';
import { ReleasePipeline } from '../scripts/release-pipeline';
import { BRANDING } from '../shared/constants/branding';

describe('Phase 20: Fern Client Stable Launch & Post-Release Operations', () => {
  let tmpDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-phase20-test-'));
    pathManager = new FernPathManager(tmpDir);
    await pathManager.initializeDirectories();
    logger = new FernLogger(pathManager);
    logger.setLogLevel('ERROR');
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore temp dir cleanup errors
    }
  });

  // =========================================================================
  // 1. Release Gate Verification
  // =========================================================================
  describe('Stable Release Gate Verification', () => {
    it('enforces 0 critical, 0 blockers, and 0 security defects for stable release promotion', () => {
      const tracker = new RegressionTracker();

      // Clean state: no unresolved issues
      const initialGate = tracker.evaluatePromotionGate();
      expect(initialGate.canPromoteToStable).toBe(true);
      expect(initialGate.metrics.criticalDefects).toBe(0);
      expect(initialGate.metrics.highDefects).toBe(0);

      // Submit a blocker defect
      const blocker = tracker.submitReport({
        title: 'Launch regression on Windows 11 Build 26100',
        category: 'LAUNCH_FAILURE',
        severity: 'CRITICAL',
        reproductionSteps: ['Launch vanilla on 24H2'],
        expectedResult: 'Minecraft window opens',
        actualResult: 'Exit code 1',
        rawLogs: 'Failed to initialize display',
        fernVersion: '1.0.0',
        releaseChannel: 'stable',
        minecraftVersion: '1.21.4',
        javaRuntime: 'Java 21',
        loader: 'vanilla',
      });

      // Gate must block promotion
      let gate = tracker.evaluatePromotionGate();
      expect(gate.canPromoteToStable).toBe(false);
      expect(gate.blockingReasons.length).toBeGreaterThan(0);

      // Resolve blocker with linked hotfix and regression test
      tracker.linkFix(
        blocker.id,
        'commit-hotfix-win11-display',
        'tests/phase20-stable-launch-operations.test.ts'
      );

      // Gate should now pass
      gate = tracker.evaluatePromotionGate();
      expect(gate.canPromoteToStable).toBe(true);
      expect(gate.metrics.criticalDefects).toBe(0);
    });
  });

  // =========================================================================
  // 2. Installation, Upgrade Migration & User Data Preservation
  // =========================================================================
  describe('Installation, Upgrade & Data Preservation', () => {
    it('fresh installation initializes clean defaults without missing files or crashes', async () => {
      const settingsManager = new SettingsManager(pathManager, logger);
      const installationManager = new InstallationManager(pathManager, logger);
      const profileManager = new ProfileManager(pathManager, logger);
      const accountManager = new AccountManager(pathManager, logger);

      await settingsManager.load();
      await installationManager.load();
      await profileManager.load();
      await accountManager.load();

      expect(settingsManager.getSettings().appearance.theme).toBe('dark');
      expect(installationManager.getInstallations().length).toBeGreaterThan(0);
      expect(profileManager.getProfiles().length).toBeGreaterThan(0);
      expect(accountManager.getAccounts().length).toBe(0);
    });

    it('upgrade migration from previous version preserves existing user settings, profiles, and accounts', async () => {
      // 1. Setup pre-existing user data from v1.0.0-rc.1
      const settingsManager = new SettingsManager(pathManager, logger);
      await settingsManager.load();
      await settingsManager.updateSettings({
        appearance: {
          ...settingsManager.getSettings().appearance,
          theme: 'oled',
        },
        general: {
          ...settingsManager.getSettings().general,
          minimizeToTray: true,
        },
      });

      const profileManager = new ProfileManager(pathManager, logger);
      await profileManager.load();
      const customProfile = await profileManager.createProfile({
        name: 'PvP Competitive Profile',
        installationId: 'fabric-1-21-4',
        minecraftVersion: '1.21.4',
      });

      const accountManager = new AccountManager(pathManager, logger);
      await accountManager.load();
      await accountManager.createLocalAccount({ displayName: 'FernVeteran' });

      // 2. Simulate launcher upgrade to 1.0.0 by creating new managers on same directory
      const upgradedSettings = new SettingsManager(pathManager, logger);
      const upgradedProfiles = new ProfileManager(pathManager, logger);
      const upgradedAccounts = new AccountManager(pathManager, logger);

      await upgradedSettings.load();
      await upgradedProfiles.load();
      await upgradedAccounts.load();

      // 3. Verify user data was preserved intact
      expect(upgradedSettings.getSettings().appearance.theme).toBe('oled');
      expect(upgradedSettings.getSettings().general.minimizeToTray).toBe(true);

      const foundProfile = upgradedProfiles.getProfile(customProfile.id);
      expect(foundProfile).toBeDefined();
      expect(foundProfile?.name).toBe('PvP Competitive Profile');

      const accounts = upgradedAccounts.getAccounts();
      expect(accounts.length).toBe(1);
      expect(accounts[0].displayName).toBe('FernVeteran');
    });

    it('unrelated user files in the directory are never deleted or modified during launcher operations', async () => {
      const fernDir = pathManager.getFernDir();
      const customUserDocPath = path.join(fernDir, 'my-custom-modpack-notes.txt');
      await fs.writeFile(customUserDocPath, 'User custom notes and world coordinates: X: 100, Z: 500', 'utf-8');

      // Run multiple launcher manager operations
      const settingsManager = new SettingsManager(pathManager, logger);
      const installationManager = new InstallationManager(pathManager, logger);
      await settingsManager.load();
      await installationManager.load();

      // Verify custom user document remains completely untouched
      const exists = await fs.access(customUserDocPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      const content = await fs.readFile(customUserDocPath, 'utf-8');
      expect(content).toContain('User custom notes');
    });
  });

  // =========================================================================
  // 3. Update Failure Handling, Rollback & Offline Resilience
  // =========================================================================
  describe('Update Failure Handling, Rollback & Offline Resilience', () => {
    it('UpdateService rejects corrupted download payloads and invalid digital signatures', async () => {
      const updateService = new UpdateService(pathManager, logger);
      const testFilePath = path.join(tmpDir, 'downloaded-update.zip');
      await fs.writeFile(testFilePath, 'CORRUPTED_BINARY_PAYLOAD_NOT_MATCHING_HASH');

      const expectedSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const integrityValid = await updateService.verifyPackageIntegrity(testFilePath, expectedSha256);
      expect(integrityValid).toBe(false);

      // Verify signature rejection on fake signature
      const signatureValid = updateService.verifyAuthenticity(expectedSha256, 'INVALID_SIGNATURE_HEX');
      expect(signatureValid).toBe(false);
    });

    it('creates rollback snapshot and successfully restores known-good state if update fails', async () => {
      const updateService = new UpdateService(pathManager, logger);
      const appDir = path.join(tmpDir, 'app-runtime');
      await fs.mkdir(appDir, { recursive: true });

      const stableVersionFile = path.join(appDir, 'version.json');
      await fs.writeFile(stableVersionFile, JSON.stringify({ version: '1.0.0' }));

      // Create pre-update rollback snapshot
      const snapshotPath = await updateService.createRollbackSnapshot(appDir, '1.0.0');
      expect(snapshotPath).toBeDefined();

      // Simulate a failed update that corrupts appDir
      await fs.writeFile(stableVersionFile, JSON.stringify({ version: '1.0.1-broken' }));

      // Restore rollback snapshot
      const restored = await updateService.rollbackUpdate(appDir);
      expect(restored).toBe(true);

      const restoredContent = JSON.parse(await fs.readFile(stableVersionFile, 'utf-8'));
      expect(restoredContent.version).toBe('1.0.0');
    });

    it('offline resilience: launcher functions seamlessly when update service is offline or unreachable', async () => {
      const updateService = new UpdateService(pathManager, logger);
      const installationManager = new InstallationManager(pathManager, logger);
      await installationManager.load();

      // Offline mode check returns no update without throwing unhandled rejection
      const checkResult = await updateService.checkForUpdates('stable');
      expect(checkResult).toBeDefined();
      expect(checkResult.channel).toBe('stable');

      // Installations and profiles continue functioning
      const activeInst = installationManager.getActiveInstallation();
      expect(activeInst).toBeDefined();
    });
  });

  // =========================================================================
  // 4. Staged Rollout & Distribution Integrity Controls
  // =========================================================================
  describe('Staged Rollout & Distribution Controls', () => {
    it('branding, package.json, and distribution.json are aligned on stable 1.0.0', async () => {
      expect(BRANDING.VERSION).toBe('1.0.0');

      const pkgRaw = await fs.readFile(path.resolve('.', 'package.json'), 'utf-8');
      const pkg = JSON.parse(pkgRaw);
      expect(pkg.version).toBe('1.0.0');

      const distJsonPath = path.resolve('.', 'packaging/distribution.json');
      const distRaw = await fs.readFile(distJsonPath, 'utf-8');
      const dist = JSON.parse(distRaw);
      expect(dist.version.launcher).toBe('1.0.0');
      expect(dist.channels.stable.latestVersion).toBe('1.0.0');
    });

    it('ReleasePipeline generates reproducible SHA-256 manifests and emergency rollback instructions', async () => {
      const pipeline = new ReleasePipeline();

      expect(pipeline.validateSemver('1.0.0')).toBe(true);
      expect(pipeline.detectChannel('1.0.0')).toBe('stable');

      // Create mock zip artifact
      const mockZip = path.join(tmpDir, 'FernClient-1.0.0-Portable.zip');
      await fs.writeFile(mockZip, 'PORTABLE_STABLE_ZIP_BINARY_DATA');

      const manifest = pipeline.buildReleaseManifest('1.0.0', tmpDir, '1.0.0-rc.1');

      expect(manifest.version).toBe('1.0.0');
      expect(manifest.channel).toBe('stable');
      expect(manifest.artifacts.length).toBe(1);
      expect(manifest.checksumManifestSha256).toBeDefined();

      const rollbackDoc = await fs.readFile(path.join(tmpDir, 'ROLLBACK_INSTRUCTIONS.md'), 'utf-8');
      expect(rollbackDoc).toContain('Rollback Procedure: Fern Client 1.0.0 -> 1.0.0-rc.1');
      expect(rollbackDoc).toContain('Immediately switch launcher update manifest back to version');
    });

    it('verifies portable zip release bundle exists with valid non-empty size and computed SHA-256', async () => {
      const portableZipPath = path.resolve('.', 'release/FernClient-1.0.0-Portable.zip');
      const stat = await fs.stat(portableZipPath);
      expect(stat.size).toBeGreaterThan(150000); // Core bundle ~215 KB

      const sumsPath = path.resolve('.', 'release/SHA256SUMS.txt');
      const sumsContent = await fs.readFile(sumsPath, 'utf-8');
      expect(sumsContent).toContain('FernClient-1.0.0-Portable.zip');
    });
  });

  // =========================================================================
  // 5. Post-Release Privacy, Redaction & Diagnostic Security
  // =========================================================================
  describe('Post-Release Privacy & Diagnostic Security', () => {
    it('DiagnosticsService thoroughly strips personal details, passwords, and tokens from crash logs', () => {
      const crashLog = [
        '[ERROR] [Auth] Failed to authenticate user: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.superSecretToken123',
        '[INFO ] [Database] Connected with credentials password=MySuperSecurePassword! host=192.168.1.50:5432',
        '[DEBUG] [Filesystem] Loaded user world from C:\\Users\\PersonalAccount\\AppData\\Roaming\\Fern Client\\saves',
        '[WARN ] [Network] Ping timed out contacting remote peer at 172.16.0.4:25565',
      ].join('\n');

      const sanitized = DiagnosticsService.sanitizeSensitiveText(crashLog);

      expect(sanitized).not.toContain('superSecretToken123');
      expect(sanitized).not.toContain('MySuperSecurePassword!');
      expect(sanitized).not.toContain('C:\\Users\\PersonalAccount');
      expect(sanitized).not.toContain('192.168.1.50');
      expect(sanitized).not.toContain('172.16.0.4');

      expect(sanitized).toContain('<REDACTED_TOKEN>');
      expect(sanitized).toContain('<REDACTED_PASSWORD>');
      expect(sanitized).toContain('<USER_DIR>');
      expect(sanitized).toContain('[REDACTED_IP]');
    });

    it('LaunchArgumentValidator rejects dangerous command execution or injection flags', () => {
      expect(LaunchArgumentValidator.validateArgs(['-Xmx4G', '-Xms2G', '-XX:+UseG1GC']).isValid).toBe(true);

      const maliciousArgs = [
        ['& ping 127.0.0.1'],
        ['; shutdown /s /t 0'],
        ['| whoami'],
        ['`rm -rf /`'],
        ['$SECRET_ENV'],
      ];

      for (const args of maliciousArgs) {
        expect(LaunchArgumentValidator.validateArgs(args).isValid).toBe(false);
      }
    });
  });
});
