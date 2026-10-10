import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';
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
import { UpdateService } from '../launcher/src/core/update-service';
import { FernError, FernErrorCode } from '../launcher/src/core/errors';

describe('Phase 17: Stability Hardening, End-to-End Validation & Beta Qualification', () => {
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
  let backupService: BackupService;
  let backupVerifier: BackupVerifier;
  let compatService: CompatibilityMatrixService;
  let updateService: UpdateService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-p17-beta-'));
    paths = new FernPathManager(tempDir);
    await paths.initializeDirectories();

    logger = new FernLogger(paths);
    logger.setLogLevel('ERROR');
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
    backupService = new BackupService(paths, logger, installationManager, settingsManager, profileManager);
    backupVerifier = new BackupVerifier();
    compatService = new CompatibilityMatrixService();
    updateService = new UpdateService(paths, logger);

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

  // =========================================================================
  // SECTION 1: REAL VANILLA LAUNCH JOURNEY VALIDATION
  // =========================================================================
  it('Vanilla Launch Journey: Verifies account onboarding, manifest metadata, dry-run launch and repeat launch', async () => {
    // 1. Account onboarding
    const account = await accountManager.createLocalAccount({ displayName: 'FernBetaTester' });
    expect(account.id).toBeDefined();
    expect(account.displayName).toBe('FernBetaTester');
    expect(account.uuid).toBeDefined();

    // 2. Installation creation
    const inst = await installationManager.createInstallation({
      name: 'Vanilla 1.21.4 Beta Test',
      minecraftVersion: '1.21.4',
      loader: 'vanilla',
    });
    expect(inst.id).toBeDefined();

    // 3. Mock valid Java binary
    const mockJava = path.join(tempDir, 'java.exe');
    await fs.writeFile(mockJava, 'MOCK_JAVA_RUNTIME');
    await installationManager.updateInstallation(inst.id, { javaPath: mockJava });

    // 4. First launch dry-run
    const launch1 = await launcherService.launch({
      installationId: inst.id,
      accountId: account.id,
      dryRun: true,
    });
    expect(launch1.success).toBe(true);
    expect(launch1.args).toContain('--username');
    expect(launch1.args).toContain('FernBetaTester');
    expect(launch1.args).toContain('--version');
    expect(launch1.args).toContain('1.21.4');

    // 5. Repeat launch ensures clean idempotency
    const launch2 = await launcherService.launch({
      installationId: inst.id,
      accountId: account.id,
      dryRun: true,
    });
    expect(launch2.success).toBe(true);
    expect(launch2.args).toEqual(launch1.args);
  });

  // =========================================================================
  // SECTION 2: MODDED LAUNCH & COMPATIBILITY VALIDATION
  // =========================================================================
  it('Modded Launch: Evaluates Fabric/Forge/NeoForge tiers and template provisioning', async () => {
    // 1. Check Fabric tier
    const fabricTier = compatService.evaluateEnvironment({
      osName: 'Windows 11 (23H2)',
      minecraftVersion: '1.21.4',
      javaMajorVersion: 21,
      loader: 'fabric',
    });
    expect(fabricTier.overallTier).toBe('SUPPORTED_AND_TESTED');

    // 2. Check NeoForge tier
    const neoforgeTier = compatService.evaluateEnvironment({
      osName: 'Windows 11 (23H2)',
      minecraftVersion: '1.21.4',
      javaMajorVersion: 21,
      loader: 'neoforge',
    });
    expect(neoforgeTier.isRunnable).toBe(true);

    // 3. Provision instance from Fabric template
    const inst = await templateService.createInstanceFromTemplate(
      'template-fabric-modern',
      'Fabric Beta Rig',
      installationManager
    );
    expect(inst.loader).toBe('fabric');
    expect(inst.name).toBe('Fabric Beta Rig');
  });

  // =========================================================================
  // SECTION 3: CONFIGURATION SAFETY & CORRUPTION RECOVERY
  // =========================================================================
  it('Configuration Safety: Detects corruption, preserves backup, and restores verified state', async () => {
    // 1. Set specific settings
    await settingsManager.updateSettings({
      appearance: { theme: 'oled', accentColor: '#10b981', reduceMotion: true, uiScale: 1.1 },
    });

    // 2. Create verified backup
    const backup = await backupService.createConfigBackup('Beta Baseline Checkpoint');
    const validation = await backupService.validateBackup(backup.id);
    expect(validation.isValid).toBe(true);

    // 3. Corrupt settings.json with invalid syntax
    const settingsPath = paths.getSettingsFilePath();
    await fs.writeFile(settingsPath, '<<<MALFORMED_CORRUPTED_JSON>>>');

    // 4. Reload settings -> triggers automatic backup and default restoration
    await settingsManager.load();
    expect(settingsManager.getSettings().general).toBeDefined();

    // Verify .bak file was created
    const dirFiles = await fs.readdir(paths.getLauncherDir());
    const bakFile = dirFiles.find((f) => f.startsWith('settings.json.corrupt.') && f.endsWith('.bak'));
    expect(bakFile).toBeDefined();

    // 5. Restore original settings from backup
    const restored = await backupService.restoreBackup(backup.id);
    expect(restored.success).toBe(true);
    await settingsManager.load();
    expect(settingsManager.getSettings().appearance.theme).toBe('oled');
  });

  // =========================================================================
  // SECTION 4: FAILURE INJECTION & ACTIONABLE ERRORS
  // =========================================================================
  it('Failure Injection: Rejects missing Java executable with actionable FernError', async () => {
    const account = await accountManager.createLocalAccount({ displayName: 'Player' });
    const inst = await installationManager.createInstallation({
      name: 'Missing Java Test',
      minecraftVersion: '1.21.4',
      javaPath: path.join(tempDir, 'non_existent_java.exe'),
    });

    await expect(
      launcherService.launch({
        installationId: inst.id,
        accountId: account.id,
        dryRun: true,
      })
    ).rejects.toThrowError(FernError);

    try {
      await launcherService.launch({
        installationId: inst.id,
        accountId: account.id,
        dryRun: true,
      });
    } catch (e: any) {
      expect(e.code).toBe(FernErrorCode.JAVA_NOT_FOUND);
      expect(e.actionableHint).toBeDefined();
    }
  });

  it('Failure Injection: Safely handles child process error event without crashing', async () => {
    const fakeChild = new EventEmitter() as unknown as ChildProcess;
    Object.assign(fakeChild, {
      pid: 7777,
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      kill: () => true,
    });

    let exitCalledWith = -999;
    processManager.trackProcess(
      fakeChild,
      'inst-crash-test',
      'java.exe',
      [],
      (code) => {
        exitCalledWith = code || 0;
      }
    );

    expect(processManager.isInstallationRunning('inst-crash-test')).toBe(true);

    // Simulate spawn failure / error event
    fakeChild.emit('error', new Error('spawn ENOENT fake'));

    // Process manager must clean up tracking and notify callback
    expect(processManager.isInstallationRunning('inst-crash-test')).toBe(false);
    expect(exitCalledWith).toBe(-1);
  });

  it('Failure Injection: Cleans up corrupted version package on disk cache', async () => {
    const vDir = path.join(paths.getVersionsDir(), '1.21.4');
    await fs.mkdir(vDir, { recursive: true });
    const jsonPath = path.join(vDir, '1.21.4.json');
    await fs.writeFile(jsonPath, '{ CORRUPTED_SYNTAX_JSON: [ ');

    // getVersionPackage detects parse failure, unlinks corrupted file, and heals cache with valid JSON
    const pkg = await versionService.getVersionPackage('1.21.4');
    expect(pkg).toBeDefined();
    expect(pkg.id).toBe('1.21.4');

    // Verify file on disk is valid recovered JSON, not corrupted
    const raw = await fs.readFile(jsonPath, 'utf-8');
    expect(raw).not.toContain('CORRUPTED_SYNTAX_JSON');
    const parsed = JSON.parse(raw);
    expect(parsed.id).toBe('1.21.4');
  });

  it('Security: Rejects forged, truncated, or invalid digital update signatures', () => {
    const checksum = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    // 1. Legit signature accepted
    const legit = '3045022100_fern_sig_prod_verified';
    expect(UpdateService.verifyAuthenticity(checksum, legit)).toBe(true);

    // 2. Bogus forged signature strictly rejected (does NOT return true)
    const forged = 'random_attacker_forged_signature_hex_1234567890';
    expect(UpdateService.verifyAuthenticity(checksum, forged)).toBe(false);

    // 3. Empty or null signature rejected
    expect(UpdateService.verifyAuthenticity(checksum, '')).toBe(false);
    expect(UpdateService.verifyAuthenticity('', legit)).toBe(false);
  });

  it('Security: Prevents path traversal in backup restoration', async () => {
    const account = await accountManager.createLocalAccount({ displayName: 'Player' });
    const inst = await installationManager.createInstallation({
      name: 'Path Traversal Test',
      minecraftVersion: '1.21.4',
    });

    // Create a zip with path traversal payload
    const { createZipArchive } = await import('../launcher/src/utils/zip');
    const maliciousZip = createZipArchive([
      { relativePath: '../../evil.txt', content: Buffer.from('malicious') },
    ]);
    const zipPath = path.join(tempDir, 'traversal.zip');
    await fs.writeFile(zipPath, maliciousZip);

    await expect(
      installationManager.restoreInstallationConfig(inst.id, zipPath)
    ).rejects.toThrowError(FernError);
  });

  it('Security: Rejects command injection in custom JVM arguments', async () => {
    const account = await accountManager.createLocalAccount({ displayName: 'Player' });
    const inst = await installationManager.createInstallation({
      name: 'JVM Injection Test',
      minecraftVersion: '1.21.4',
      jvmArguments: ['-Xmx4G', '-Dsafe=true; rm -rf /'],
    });

    const mockJava = path.join(tempDir, 'java.exe');
    await fs.writeFile(mockJava, 'MOCK_JAVA_RUNTIME');
    await installationManager.updateInstallation(inst.id, { javaPath: mockJava });

    await expect(
      launcherService.launch({
        installationId: inst.id,
        accountId: account.id,
        dryRun: true,
      })
    ).rejects.toThrowError(FernError);

    try {
      await launcherService.launch({
        installationId: inst.id,
        accountId: account.id,
        dryRun: true,
      });
    } catch (e: any) {
      expect(e.code).toBe(FernErrorCode.SECURITY_VIOLATION);
      expect(e.message).toContain('Forbidden special character');
    }
  });

  it('Update Recovery: Creates rollback snapshot and safely restores previous launcher state on update failure', async () => {
    // 1. Create a dummy version file in launcher app directory
    const launcherDir = paths.getLauncherDir();
    const canaryFile = path.join(launcherDir, 'canary.txt');
    await fs.writeFile(canaryFile, 'CANARY_VERSION_1.0.0');

    // 2. Create snapshot
    const snapshotPath = await updateService.createRollbackSnapshot(launcherDir, '1.0.0');
    expect(snapshotPath).toBeDefined();
    expect(await updateService.hasRollbackAvailable()).toBe(true);

    // 3. Simulate failed / corrupted update overwriting the file
    await fs.writeFile(canaryFile, 'CORRUPTED_INCOMPLETE_UPDATE');

    // 4. Trigger rollback
    const restored = await updateService.rollbackUpdate(launcherDir);
    expect(restored).toBe(true);

    // 5. Verify canary was restored
    const content = await fs.readFile(canaryFile, 'utf-8');
    expect(content).toBe('CANARY_VERSION_1.0.0');
  });
});
