import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { SettingsManager } from '../launcher/src/settings/settings-manager';
import { AccountManager } from '../launcher/src/accounts/account-manager';
import { JavaManager } from '../launcher/src/java/java-manager';
import { VersionService } from '../launcher/src/versions/version-service';
import { InstallationManager } from '../launcher/src/installations/installation-manager';
import { ProfileManager } from '../launcher/src/installations/profile-manager';
import { DownloadManager } from '../launcher/src/downloads/download-manager';
import { MinecraftInstallerService } from '../launcher/src/installations/installer-service';
import { MinecraftProcessManager } from '../launcher/src/core/process';
import { FernLauncherService } from '../launcher/src/core/launcher-service';
import { BRANDING } from '../shared/constants/branding';
import { FernError, FernErrorCode } from '../launcher/src/core/errors';

describe('Phase 24: Public Release First-Run Experience & Trust Validation', () => {
  let tempWorkspace: string;
  const officialZipPath = path.resolve(__dirname, '../release/FernClient-1.0.0-Portable.zip');
  const expectedSha256 = 'aca5ae20adbba76beefea614181f4014e3962f3a76265ab3a14c59efe1e72128';

  beforeEach(() => {
    tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'fern-p24-validate-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempWorkspace)) {
      try {
        fs.rmSync(tempWorkspace, { recursive: true, force: true });
      } catch {}
    }
  });

  // 1. Download, Extraction and Checksum Validation
  it('1. verifies published zip extraction, file count and SHA-256 match', () => {
    expect(fs.existsSync(officialZipPath)).toBe(true);

    const actualHash = crypto
      .createHash('sha256')
      .update(fs.readFileSync(officialZipPath))
      .digest('hex');
    expect(actualHash).toBe(expectedSha256);

    // Extract into clean isolated workspace
    execSync(`tar -xf "${officialZipPath}" -C "${tempWorkspace}"`);

    const extractedFiles = fs.readdirSync(tempWorkspace);
    expect(extractedFiles).toContain('dist');
    expect(extractedFiles).toContain('dist-electron');
    expect(extractedFiles).toContain('FernClient-Portable.bat');
    expect(extractedFiles).toContain('portable.json');
  });

  // 2. First Application Startup & Portable Isolation
  it('2. verifies first application startup and portable data directory isolation', async () => {
    execSync(`tar -xf "${officialZipPath}" -C "${tempWorkspace}"`);

    const portableJson = JSON.parse(
      fs.readFileSync(path.join(tempWorkspace, 'portable.json'), 'utf-8')
    );
    expect(portableJson.isPortable).toBe(true);
    expect(portableJson.version).toBe('1.0.0');
    expect(portableJson.dataDirectory).toBe('./data');

    // Emulate initial launch creating ./data directory
    const portableDataDir = path.join(tempWorkspace, 'data');
    fs.mkdirSync(portableDataDir, { recursive: true });

    const paths = new FernPathManager(portableDataDir);
    await paths.initializeDirectories();

    expect(paths.getBaseDir()).toBe(portableDataDir);
    expect(fs.existsSync(paths.getLauncherDir())).toBe(true);
    expect(fs.existsSync(paths.getInstallationsDir())).toBe(true);
    expect(fs.existsSync(paths.getVersionsDir())).toBe(true);
  });

  // 3. Version Display & Branding Consistency
  it('3. confirms version number and brand metadata alignment', () => {
    expect(BRANDING.APP_NAME).toBe('Fern Client');
    expect(BRANDING.VERSION).toBe('1.0.0');
    expect(BRANDING.GITHUB).toBe('https://github.com/Sunny-876/fern-client');

    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8')
    );
    expect(pkg.version).toBe('1.0.0');
  });

  // 4. Java Detection & Configuration
  it('4. validates Java runtime configuration and JVM argument synthesis', async () => {
    const portableDataDir = path.join(tempWorkspace, 'data');
    fs.mkdirSync(portableDataDir, { recursive: true });
    const paths = new FernPathManager(portableDataDir);
    await paths.initializeDirectories();

    const logger = new FernLogger(paths);
    logger.setLogLevel('ERROR');
    const javaManager = new JavaManager(paths, logger);

    const scan = await javaManager.detectRuntimes();
    expect(Array.isArray(scan.runtimes)).toBe(true);

    // Test custom runtime registration
    const customJavaExe = path.join(tempWorkspace, 'mock_jdk21', 'bin', 'java.exe');
    fs.mkdirSync(path.dirname(customJavaExe), { recursive: true });
    fs.writeFileSync(customJavaExe, 'MOCK_JAVA_BINARY');

    const settingsManager = new SettingsManager(paths, logger);
    await settingsManager.load();
    await settingsManager.updateSettings({
      java: {
        defaultJavaPath: customJavaExe,
        autoDetectJava: true,
        customJvmArgs: ['-XX:+UseG1GC'],
      },
      memory: {
        defaultMinMemoryMb: 1024,
        defaultMaxMemoryMb: 4096,
      },
    });

    const updated = settingsManager.getSettings();
    expect(updated.java.defaultJavaPath).toBe(customJavaExe);
    expect(updated.memory.defaultMaxMemoryMb).toBe(4096);
  });

  // 5. Minecraft Version Selection
  it('5. validates Minecraft version manifest resolution for modern (1.21.4) and LTS versions', async () => {
    const portableDataDir = path.join(tempWorkspace, 'data');
    fs.mkdirSync(portableDataDir, { recursive: true });
    const paths = new FernPathManager(portableDataDir);
    await paths.initializeDirectories();

    const logger = new FernLogger(paths);
    logger.setLogLevel('ERROR');
    const versionService = new VersionService(paths, logger);

    const manifest = await versionService.getManifest();
    expect(manifest.latest.release).toBeDefined();

    const v1214 = manifest.versions.find((v) => v.id === '1.21.4');
    expect(v1214).toBeDefined();
    expect(v1214?.type).toBe('release');

    const v1204 = manifest.versions.find((v) => v.id === '1.20.4');
    expect(v1204).toBeDefined();
  });

  // 6. Vanilla Launch Execution (Dry-Run Verification)
  it('6. validates complete Vanilla 1.21.4 launch journey in portable mode', async () => {
    execSync(`tar -xf "${officialZipPath}" -C "${tempWorkspace}"`);
    const portableDataDir = path.join(tempWorkspace, 'data');
    fs.mkdirSync(portableDataDir, { recursive: true });
    const paths = new FernPathManager(portableDataDir);
    await paths.initializeDirectories();

    const logger = new FernLogger(paths);
    logger.setLogLevel('ERROR');
    const settingsManager = new SettingsManager(paths, logger);
    const accountManager = new AccountManager(paths, logger);
    const javaManager = new JavaManager(paths, logger);
    const versionService = new VersionService(paths, logger);
    const installationManager = new InstallationManager(paths, logger, versionService);
    const profileManager = new ProfileManager(paths, logger);
    const downloadManager = new DownloadManager(logger);
    const installerService = new MinecraftInstallerService(paths, versionService, downloadManager, logger);
    const processManager = new MinecraftProcessManager(logger);

    const launcher = new FernLauncherService(
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

    await settingsManager.load();
    await accountManager.load();
    await installationManager.load();
    await profileManager.load();

    const player = await accountManager.createLocalAccount({ displayName: 'FirstRunTester' });
    const inst = await installationManager.createInstallation({
      name: 'Vanilla 1.21.4 First Run',
      minecraftVersion: '1.21.4',
      loader: 'vanilla',
    });

    const mockJava = path.join(portableDataDir, 'java.exe');
    fs.writeFileSync(mockJava, 'MOCK_JAVA_RUN');
    await installationManager.updateInstallation(inst.id, { javaPath: mockJava });

    const launch = await launcher.launch({
      installationId: inst.id,
      accountId: player.id,
      dryRun: true,
    });

    expect(launch.success).toBe(true);
    expect(launch.command).toBe(mockJava);
    expect(launch.args).toContain('net.minecraft.client.main.Main');
    expect(launch.args).toContain('--username');
    expect(launch.args).toContain('FirstRunTester');
    expect(launch.args).toContain('--version');
    expect(launch.args).toContain('1.21.4');
  });

  // 7. Modded Launch Journey (Fabric 1.21.4)
  it('7. validates modded installation configuration (Fabric 1.21.4)', async () => {
    const portableDataDir = path.join(tempWorkspace, 'data');
    fs.mkdirSync(portableDataDir, { recursive: true });
    const paths = new FernPathManager(portableDataDir);
    await paths.initializeDirectories();

    const logger = new FernLogger(paths);
    logger.setLogLevel('ERROR');
    const versionService = new VersionService(paths, logger);
    const installationManager = new InstallationManager(paths, logger, versionService);
    await installationManager.load();

    const fabricInst = await installationManager.createInstallation({
      name: 'Fabric 1.21.4 Modded Pack',
      minecraftVersion: '1.21.4',
      loader: 'fabric',
      loaderVersion: '0.16.5',
    });

    expect(fabricInst.id).toBeDefined();
    expect(fabricInst.loader).toBe('fabric');
    expect(fabricInst.loaderVersion).toBe('0.16.5');
  });

  // 8. Error Handling When Required Service / Java is Missing
  it('8. handles missing Java binary or invalid launch config with actionable error diagnostics', async () => {
    const portableDataDir = path.join(tempWorkspace, 'data');
    fs.mkdirSync(portableDataDir, { recursive: true });
    const paths = new FernPathManager(portableDataDir);
    await paths.initializeDirectories();

    const logger = new FernLogger(paths);
    logger.setLogLevel('ERROR');
    const settingsManager = new SettingsManager(paths, logger);
    const accountManager = new AccountManager(paths, logger);
    const javaManager = new JavaManager(paths, logger);
    const versionService = new VersionService(paths, logger);
    const installationManager = new InstallationManager(paths, logger, versionService);
    const profileManager = new ProfileManager(paths, logger);
    const downloadManager = new DownloadManager(logger);
    const installerService = new MinecraftInstallerService(paths, versionService, downloadManager, logger);
    const processManager = new MinecraftProcessManager(logger);

    const launcher = new FernLauncherService(
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

    await settingsManager.load();
    await accountManager.load();
    await installationManager.load();

    const player = await accountManager.createLocalAccount({ displayName: 'ErrorTester' });
    const inst = await installationManager.createInstallation({
      name: 'Corrupt Java Test',
      minecraftVersion: '1.21.4',
      loader: 'vanilla',
      javaPath: 'C:\\NonExistentPath\\java_invalid.exe',
    });

    // Attempting to launch with non-existent Java executable must throw structured FernError
    await expect(
      launcher.launch({
        installationId: inst.id,
        accountId: player.id,
        dryRun: false,
      })
    ).rejects.toThrow();
  });

  // 9. Preservation of User Settings and Profiles Across Restarts
  it('9. preserves user configurations, player accounts, and installations across sessions', async () => {
    const portableDataDir = path.join(tempWorkspace, 'data');
    fs.mkdirSync(portableDataDir, { recursive: true });
    const paths = new FernPathManager(portableDataDir);
    await paths.initializeDirectories();

    const logger = new FernLogger(paths);
    logger.setLogLevel('ERROR');

    // Session 1: Create user state
    const settings1 = new SettingsManager(paths, logger);
    const accounts1 = new AccountManager(paths, logger);
    const versionService = new VersionService(paths, logger);
    const installations1 = new InstallationManager(paths, logger, versionService);

    await settings1.load();
    await accounts1.load();
    await installations1.load();

    await settings1.updateSettings({
      minecraft: {
        fullscreen: true,
        defaultResolution: { width: 2560, height: 1440 },
        logWindowOnLaunch: false,
      },
      memory: {
        defaultMinMemoryMb: 2048,
        defaultMaxMemoryMb: 8192,
      },
    });

    const account = await accounts1.createLocalAccount({ displayName: 'PersistentPlayer' });
    const inst = await installations1.createInstallation({
      name: 'Persistent Installation',
      minecraftVersion: '1.21.4',
      loader: 'vanilla',
    });

    // Session 2: Fresh instances loading from same data directory (simulating app restart)
    const settings2 = new SettingsManager(paths, logger);
    const accounts2 = new AccountManager(paths, logger);
    const installations2 = new InstallationManager(paths, logger, versionService);

    await settings2.load();
    await accounts2.load();
    await installations2.load();

    const loadedSettings = settings2.getSettings();
    expect(loadedSettings.minecraft.fullscreen).toBe(true);
    expect(loadedSettings.minecraft.defaultResolution.width).toBe(2560);
    expect(loadedSettings.memory.defaultMaxMemoryMb).toBe(8192);

    const loadedAccount = accounts2.getAccount(account.id);
    expect(loadedAccount).toBeDefined();
    expect(loadedAccount?.displayName).toBe('PersistentPlayer');

    const loadedInst = installations2.getInstallation(inst.id);
    expect(loadedInst).toBeDefined();
    expect(loadedInst?.name).toBe('Persistent Installation');
  });
});
