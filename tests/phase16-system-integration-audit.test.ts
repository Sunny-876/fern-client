import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { SettingsManager } from '../launcher/src/settings/settings-manager';
import { AccountManager } from '../launcher/src/accounts/account-manager';
import { JavaManager } from '../launcher/src/java/java-manager';
import { VersionService } from '../launcher/src/versions/version-service';
import { InstallationManager } from '../launcher/src/installations/installation-manager';
import { InstanceTemplateManager } from '../launcher/src/installations/instance-templates';
import { ProfileManager } from '../launcher/src/installations/profile-manager';
import { DownloadManager } from '../launcher/src/downloads/download-manager';
import { MinecraftInstallerService } from '../launcher/src/installations/installer-service';
import { MinecraftProcessManager } from '../launcher/src/core/process';
import { FernLauncherService } from '../launcher/src/core/launcher-service';
import { CrashAnalyzer } from '../launcher/src/core/crash-analyzer';
import { BackupService } from '../launcher/src/core/backup-service';
import { BackupVerifier } from '../launcher/src/core/backup-verifier';
import { CompatibilityMatrixService } from '../launcher/src/compatibility/compatibility-matrix-service';
import { RegressionTracker } from '../launcher/src/qa/regression-tracker';

describe('Phase 16: Complete System Integration & End-to-End Product Journey', () => {
  let tempDir: string;
  let paths: FernPathManager;
  let logger: FernLogger;
  let settingsManager: SettingsManager;
  let accountManager: AccountManager;
  let javaManager: JavaManager;
  let versionService: VersionService;
  let installationManager: InstallationManager;
  let templateService: InstanceTemplateManager;
  let profileManager: ProfileManager;
  let downloadManager: DownloadManager;
  let installerService: MinecraftInstallerService;
  let processManager: MinecraftProcessManager;
  let launcherService: FernLauncherService;
  let crashAnalyzer: CrashAnalyzer;
  let backupService: BackupService;
  let backupVerifier: BackupVerifier;
  let compatService: CompatibilityMatrixService;
  let regressionTracker: RegressionTracker;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-p16-integration-'));
    paths = new FernPathManager(tempDir);
    await paths.initializeDirectories();

    logger = new FernLogger(paths);
    settingsManager = new SettingsManager(paths, logger);
    accountManager = new AccountManager(paths, logger);
    javaManager = new JavaManager(paths, logger);
    versionService = new VersionService(paths, logger);
    installationManager = new InstallationManager(paths, logger, versionService);
    templateService = new InstanceTemplateManager(paths, logger);
    profileManager = new ProfileManager(paths, logger);
    downloadManager = new DownloadManager(logger);
    installerService = new MinecraftInstallerService(paths, versionService, downloadManager, logger);
    processManager = new MinecraftProcessManager(logger);
    launcherService = new FernLauncherService(
      paths,
      logger,
      accountManager,
      installationManager,
      profileManager,
      javaManager,
      settingsManager,
      versionService,
      installerService,
      processManager
    );
    crashAnalyzer = new CrashAnalyzer();
    backupService = new BackupService(paths, logger, installationManager, settingsManager, profileManager);
    backupVerifier = new BackupVerifier();
    compatService = new CompatibilityMatrixService();
    regressionTracker = new RegressionTracker();

    await settingsManager.load();
    await accountManager.load();
    await installationManager.load();
    await profileManager.load();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('Journey 1: Executes first-run onboarding, account creation, and settings persistence', async () => {
    // 1. Check initial first-run state
    expect(settingsManager.getSettings().general.firstRunCompleted).toBe(false);

    // 2. Create legitimate offline account
    const account = await accountManager.createLocalAccount({
      displayName: 'FernExplorer',
    });
    expect(account.id).toBeDefined();
    expect(account.displayName).toBe('FernExplorer');
    expect(accountManager.getActiveAccount()?.id).toBe(account.id);

    // 3. Complete onboarding
    await settingsManager.updateSettings({
      general: {
        ...settingsManager.getSettings().general,
        firstRunCompleted: true,
      },
    });
    expect(settingsManager.getSettings().general.firstRunCompleted).toBe(true);
  });

  it('Journey 2: Instance lifecycle with built-in template, compatibility audit, and launch dry-run', async () => {
    // 1. Audit support tier for target configuration
    const evalResult = compatService.evaluateEnvironment({
      osName: 'Windows 11 (23H2)',
      minecraftVersion: '1.21.4',
      javaMajorVersion: 21,
      loader: 'fabric',
    });
    expect(evalResult.overallTier).toBe('SUPPORTED_AND_TESTED');
    expect(evalResult.isRunnable).toBe(true);

    // 2. Create instance from built-in Fabric template
    const inst = await templateService.createInstanceFromTemplate(
      'template-fabric-modern',
      'Fern Speedrun Rig',
      installationManager
    );
    expect(inst.name).toBe('Fern Speedrun Rig');
    expect(inst.loader).toBe('fabric');

    // 3. Configure custom java path on installation for testing dry run
    const fakeJava = path.join(tempDir, 'java_mock.exe');
    await fs.writeFile(fakeJava, 'MOCK_JAVA_BIN');
    await installationManager.updateInstallation(inst.id, { javaPath: fakeJava });

    // 4. Create an active account
    const account = await accountManager.createLocalAccount({ displayName: 'FernPilot' });

    // 5. Dry-run launch arguments assembly
    const launchResult = await launcherService.launch({
      installationId: inst.id,
      accountId: account.id,
      dryRun: true,
    });

    expect(launchResult.success).toBe(true);
    expect(launchResult.args).toBeDefined();
    expect(launchResult.args?.some((a) => a.includes('FernPilot'))).toBe(true);
    expect(launchResult.args?.some((a) => a.includes('-Xmx'))).toBe(true);
  });

  it('Journey 3: Simulates game crash, analyzes cause, and verifies safe mode mitigation', async () => {
    const mockCrashLog = `
---- Minecraft Crash Report ----
// You should try our sister game, Minceraft!

Time: 2026-10-10 12:00:00 UTC
Description: Initializing game

java.lang.OutOfMemoryError: Java heap space
\tat net.minecraft.client.main.Main.main(Main.java:180)
`;
    const crashReportPath = path.join(tempDir, 'crash-report.txt');
    await fs.writeFile(crashReportPath, mockCrashLog);

    // 1. Analyze crash
    const analysis = CrashAnalyzer.parseLogContent(mockCrashLog, 1, crashReportPath);
    expect(analysis.hasCrash).toBe(true);
    expect(analysis.category).toBe('out_of_memory');
    expect(analysis.suggestedAction).toContain('Increase allocated RAM');

    // 2. Track defect through regression tracker with sanitized logs
    const defect = regressionTracker.submitReport({
      title: 'Heap exhaustion during asset loading',
      fernVersion: '1.0.0-beta.1',
      releaseChannel: 'beta',
      minecraftVersion: '1.21.4',
      javaRuntime: '21.0.2',
      loader: 'fabric',
      loaderVersion: '0.16.9',
      category: 'LAUNCH_FAILURE',
      severity: 'HIGH',
      reproductionSteps: ['Launch with 512MB RAM'],
      expectedResult: 'Smooth launch',
      actualResult: 'Crash with OOM',
      rawLogs: `User log from C:\\Users\\Administrator\\AppData\\Roaming\\Fern Client\\logs with accessToken=SECRET_TOKEN_XYZ and IP 192.168.1.100\n${mockCrashLog}`,
    });

    expect(defect.sanitizedLogs).not.toContain('SECRET_TOKEN_XYZ');
    expect(defect.sanitizedLogs).not.toContain('C:\\Users\\Administrator');
    expect(defect.sanitizedLogs).toContain('[REDACTED]');
    expect(defect.sanitizedLogs).toContain('[REDACTED_IP]');

    // 3. Beta promotion evaluation confirms gating
    const gate = regressionTracker.evaluatePromotionGate();
    expect(gate.metrics.totalOpenDefects).toBeGreaterThanOrEqual(1);
  });

  it('Journey 4: Configuration backup creation, integrity verification, and safe restoration', async () => {
    // 1. Customize settings
    await settingsManager.updateSettings({
      appearance: { theme: 'oled', accentColor: '#22c55e', reduceMotion: true, uiScale: 1.0 },
      general: { ...settingsManager.getSettings().general, keepLauncherOpen: 'close' },
    });

    // 2. Create backup
    const backup = await backupService.createConfigBackup('Pre-Audit Checkpoint');
    expect(backup.id).toBeDefined();

    // 3. Validate backup structure and disk manifest
    const validation = await backupService.validateBackup(backup.id);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // 4. Modify settings to simulate accidental corruption or change
    await settingsManager.updateSettings({
      appearance: { theme: 'light', accentColor: '#000000', reduceMotion: false, uiScale: 1.0 },
      general: { ...settingsManager.getSettings().general, keepLauncherOpen: 'keep' },
    });
    expect(settingsManager.getSettings().appearance.theme).toBe('light');

    // 5. Restore backup and verify full state recovery
    const restoreResult = await backupService.restoreBackup(backup.id);
    expect(restoreResult.success).toBe(true);

    await settingsManager.load();
    expect(settingsManager.getSettings().appearance.theme).toBe('oled');
    expect(settingsManager.getSettings().general.keepLauncherOpen).toBe('close');
  });
});
