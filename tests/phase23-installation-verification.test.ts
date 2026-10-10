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

describe('Phase 23: Portable Release Installation & Launch Verification', () => {
  let extractDir: string;
  const releaseZipPath = path.resolve(__dirname, '../release/FernClient-1.0.0-Portable.zip');

  beforeEach(() => {
    extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fern-p23-install-'));
  });

  afterEach(() => {
    if (fs.existsSync(extractDir)) {
      try {
        fs.rmSync(extractDir, { recursive: true, force: true });
      } catch {}
    }
  });

  // 1. Artifact & Checksum Verification
  it('verifies portable zip existence, size and computed SHA-256 match release manifest', () => {
    expect(fs.existsSync(releaseZipPath)).toBe(true);
    const stat = fs.statSync(releaseZipPath);
    expect(stat.size).toBe(215454);

    const hash = crypto.createHash('sha256').update(fs.readFileSync(releaseZipPath)).digest('hex');
    expect(hash).toBe('aca5ae20adbba76beefea614181f4014e3962f3a76265ab3a14c59efe1e72128');

    const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../release/release-manifest.json'), 'utf-8'));
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.artifacts[0].sha256).toBe(hash);
  });

  // 2. Clean ZIP Extraction & Archive Security Check
  it('extracts portable ZIP into clean directory and confirms structure and absence of secrets', () => {
    // Extract using tar (natively available on Windows 10/11)
    execSync(`tar -xf "${releaseZipPath}" -C "${extractDir}"`);

    // Verify expected extracted files
    expect(fs.existsSync(path.join(extractDir, 'dist', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(extractDir, 'dist-electron', 'main.cjs'))).toBe(true);
    expect(fs.existsSync(path.join(extractDir, 'dist-electron', 'preload.cjs'))).toBe(true);
    expect(fs.existsSync(path.join(extractDir, 'FernClient-Portable.bat'))).toBe(true);
    expect(fs.existsSync(path.join(extractDir, 'portable.json'))).toBe(true);

    // Verify portable.json configuration
    const portableJson = JSON.parse(fs.readFileSync(path.join(extractDir, 'portable.json'), 'utf-8'));
    expect(portableJson.isPortable).toBe(true);
    expect(portableJson.version).toBe('1.0.0');
    expect(portableJson.releaseChannel).toBe('stable');

    // Confirm no unexpected or private files exist in the archive
    const disallowPatterns = ['.env', 'node_modules', '.git', 'credentials.json', 'id_rsa'];
    const files = fs.readdirSync(extractDir);
    for (const f of files) {
      for (const disallowed of disallowPatterns) {
        expect(f).not.toContain(disallowed);
      }
    }
  });

  // 3. Application Startup and Minecraft Launch Path Test
  it('validates launcher startup and executes a verified Minecraft launch path in portable environment', async () => {
    // Extract portable bundle
    execSync(`tar -xf "${releaseZipPath}" -C "${extractDir}"`);

    // Initialize portable data directory
    const portableDataDir = path.join(extractDir, 'data');
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

    const launcherService = new FernLauncherService(
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

    // 1. Onboard local player account
    const player = await accountManager.createLocalAccount({ displayName: 'VerifiedPlayer' });
    expect(player.id).toBeDefined();
    expect(player.displayName).toBe('VerifiedPlayer');

    // 2. Create Vanilla 1.21.4 installation in portable environment
    const inst = await installationManager.createInstallation({
      name: 'Launch Verification 1.21.4',
      minecraftVersion: '1.21.4',
      loader: 'vanilla',
    });
    expect(inst.id).toBeDefined();

    // 3. Configure mock Java runtime
    const mockJava = path.join(portableDataDir, 'mock_java.exe');
    fs.writeFileSync(mockJava, 'MOCK_JAVA_RUNTIME');
    await installationManager.updateInstallation(inst.id, { javaPath: mockJava });

    // 4. Execute Minecraft dry-run launch path
    const launchResult = await launcherService.launch({
      installationId: inst.id,
      accountId: player.id,
      dryRun: true,
    });

    expect(launchResult.success).toBe(true);
    expect(launchResult.command).toBe(mockJava);
    expect(launchResult.args).toBeDefined();
    expect(launchResult.args).toContain('net.minecraft.client.main.Main');
    expect(launchResult.args).toContain('--username');
    expect(launchResult.args).toContain('VerifiedPlayer');
    expect(launchResult.args?.some((a) => a.startsWith('-Xmx'))).toBe(true);

    // 5. Verify isolated portable data directories created properly
    expect(fs.existsSync(paths.getInstallationsDir())).toBe(true);
    expect(fs.existsSync(paths.getSettingsFilePath())).toBe(true);
    expect(fs.existsSync(paths.getAccountsFilePath())).toBe(true);
  });
});
