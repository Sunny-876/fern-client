import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { SettingsManager } from '../launcher/src/settings/settings-manager';
import { AccountManager } from '../launcher/src/accounts/account-manager';
import { InstallationManager } from '../launcher/src/installations/installation-manager';
import { ProfileManager } from '../launcher/src/installations/profile-manager';
import { JavaManager } from '../launcher/src/java/java-manager';
import { MinecraftProcessManager } from '../launcher/src/core/process';
import { FernLauncherService } from '../launcher/src/core/launcher-service';
import { VersionService } from '../launcher/src/versions/version-service';
import { DownloadManager } from '../launcher/src/downloads/download-manager';
import { MinecraftInstallerService } from '../launcher/src/installations/installer-service';

describe('FernLauncherService & Launch Pipeline', () => {
  let tempDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let settingsManager: SettingsManager;
  let accountManager: AccountManager;
  let installationManager: InstallationManager;
  let profileManager: ProfileManager;
  let javaManager: JavaManager;
  let processManager: MinecraftProcessManager;
  let versionService: VersionService;
  let downloadManager: DownloadManager;
  let installerService: MinecraftInstallerService;
  let launcherService: FernLauncherService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-launch-test-'));
    pathManager = new FernPathManager(tempDir);
    logger = new FernLogger(pathManager);
    settingsManager = new SettingsManager(pathManager, logger);
    accountManager = new AccountManager(pathManager, logger);
    installationManager = new InstallationManager(pathManager, logger);
    profileManager = new ProfileManager(pathManager, logger);
    javaManager = new JavaManager(pathManager, logger);
    processManager = new MinecraftProcessManager(logger);
    downloadManager = new DownloadManager(logger);
    versionService = new VersionService(pathManager, logger);
    installerService = new MinecraftInstallerService(pathManager, versionService, downloadManager, logger);

    launcherService = new FernLauncherService(
      pathManager,
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

    await settingsManager.load();
    await accountManager.load();
    await installationManager.load();
    await profileManager.load();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('validates launch pipeline and constructs proper Minecraft arguments in dry-run mode', async () => {
    // Create player account
    const account = await accountManager.createLocalAccount({ displayName: 'FernArchitect' });
    const inst = installationManager.getInstallations()[0];

    const result = await launcherService.launch({
      accountId: account.id,
      installationId: inst.id,
      dryRun: true,
    });

    expect(result.success).toBe(true);
    expect(result.args).toBeDefined();

    // Check JVM memory args
    expect(result.args).toContain('-Xms2048M');
    expect(result.args).toContain('-Xmx4096M');

    // Check Minecraft Game args
    expect(result.args).toContain('--username');
    expect(result.args).toContain('FernArchitect');
    expect(result.args).toContain('--version');
    expect(result.args).toContain(inst.minecraftVersion);
    expect(result.args).toContain('--uuid');
    expect(result.args).toContain(account.uuid);
    expect(result.args).toContain('--versionType');
    expect(result.args).toContain('FernClient');
  });

  it('rejects launch if account is missing', async () => {
    const inst = installationManager.getInstallations()[0];

    await expect(
      launcherService.launch({
        accountId: 'non-existent-account-id',
        installationId: inst.id,
        dryRun: true,
      })
    ).rejects.toThrow();
  });
});
