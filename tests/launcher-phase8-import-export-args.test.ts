import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ImportExportService } from '../launcher/src/core/import-export-service';
import { LaunchArgumentValidator } from '../launcher/src/core/launch-arguments';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { InstallationManager } from '../launcher/src/installations/installation-manager';
import { ProfileManager } from '../launcher/src/installations/profile-manager';

describe('Phase 8: Import/Export Packages & JVM Argument Safety', () => {
  let tempDir: string;
  let paths: FernPathManager;
  let logger: FernLogger;
  let instManager: InstallationManager;
  let profileManager: ProfileManager;
  let importExportService: ImportExportService;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fern-impexp-phase8-'));
    paths = new FernPathManager(tempDir);
    await paths.initializeDirectories();
    logger = new FernLogger(paths);

    instManager = new InstallationManager(paths, logger);
    await instManager.load();

    profileManager = new ProfileManager(paths, logger);
    await profileManager.load();

    importExportService = new ImportExportService(paths, logger, instManager, profileManager);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('exports and imports installation package correctly', async () => {
    const created = await instManager.createInstallation({
      name: 'Custom Fabric Pack',
      minecraftVersion: '1.21.4',
      loader: 'fabric',
    });

    const exported = await importExportService.exportInstallation(created.id);
    expect(exported.format).toBe('fern_package');
    expect(exported.type).toBe('fern_installation');
    expect(exported.payload.name).toBe('Custom Fabric Pack');
    expect(exported.createdAt).toBeDefined();

    // Import the exported package back
    const jsonStr = JSON.stringify(exported);
    const imported = await importExportService.importPackage(jsonStr);

    expect(imported.success).toBe(true);
    expect(imported.message).toContain('Custom Fabric Pack');
  });

  it('exports and imports Fern UI profile package correctly', async () => {
    const profile = await profileManager.createProfile({
      name: 'Speedrun HUD Profile',
      installationId: 'default',
      minecraftVersion: '1.20.4',
    });

    const exported = await importExportService.exportProfile(profile.id);
    expect(exported.format).toBe('fern_package');
    expect(exported.type).toBe('fern_profile');
    expect(exported.payload.name).toBe('Speedrun HUD Profile');

    const imported = await importExportService.importPackage(JSON.stringify(exported));
    expect(imported.success).toBe(true);
    expect(imported.message).toContain('Speedrun HUD Profile');
  });

  it('rejects invalid or malformed package JSON', async () => {
    const badJson = await importExportService.importPackage('{ not valid json');
    expect(badJson.success).toBe(false);

    const badFormat = await importExportService.importPackage('{"format":"unknown_type"}');
    expect(badFormat.success).toBe(false);
  });

  it('categorizes Recommended, Advanced, and Custom JVM arguments and detects dangerous flags', () => {
    const args = [
      '-XX:+UseG1GC', // Recommended
      '-XX:+ParallelRefProcEnabled', // Advanced
      '-XX:+AggressiveOpts', // Dangerous / deprecated in modern Java
      '-Xincgc', // Deprecated incremental GC
      '-Dmy.custom.property=true', // Custom
    ];

    const result = LaunchArgumentValidator.validateArgs(args, 21);

    expect(result.isValid).toBe(true);
    expect(result.categorized.recommended.length).toBeGreaterThan(0);
    expect(result.categorized.advanced.length).toBeGreaterThan(0);
    expect(result.categorized.custom.length).toBeGreaterThan(0);

    // Warnings should be emitted for deprecated / dangerous flags
    expect(result.warnings.some((w) => w.includes('-XX:+AggressiveOpts'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('-Xincgc'))).toBe(true);
  });

  it('permits safe mode arguments without warnings', () => {
    const safeModeArgs = ['-Dfern.safemode=true', '--fernSafeMode'];
    const result = LaunchArgumentValidator.validateArgs(safeModeArgs, 21);
    expect(result.isValid).toBe(true);
  });
});
