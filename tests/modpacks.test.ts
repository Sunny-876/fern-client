import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { DownloadManager } from '../launcher/src/downloads/download-manager';
import { VersionService } from '../launcher/src/versions/version-service';
import { InstallationManager } from '../launcher/src/installations/installation-manager';
import { MinecraftInstallerService } from '../launcher/src/installations/installer-service';
import { ModLoaderManager } from '../launcher/src/loaders/loader-manager';
import { ModpackService } from '../launcher/src/modpacks/modpack-service';
import { createZipArchive, readZipEntryText } from '../launcher/src/utils/zip';

describe('ModpackService Import & Export', () => {
  let tempDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let downloadManager: DownloadManager;
  let versionService: VersionService;
  let installationManager: InstallationManager;
  let installerService: MinecraftInstallerService;
  let loaderManager: ModLoaderManager;
  let modpackService: ModpackService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-modpack-test-'));
    pathManager = new FernPathManager(tempDir);
    logger = new FernLogger(pathManager);
    downloadManager = new DownloadManager(logger);
    versionService = new VersionService(pathManager, logger);
    installationManager = new InstallationManager(pathManager, logger, versionService);
    installerService = new MinecraftInstallerService(pathManager, versionService, downloadManager, logger);
    loaderManager = new ModLoaderManager(pathManager, logger, downloadManager);
    modpackService = new ModpackService(
      pathManager,
      logger,
      installationManager,
      installerService,
      loaderManager,
      downloadManager
    );

    await installationManager.load();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('imports Modrinth .mrpack archive and creates installation with overrides', async () => {
    const mrpackIndex = {
      formatVersion: 1,
      game: 'minecraft',
      versionId: '1.0.0',
      name: 'Fabulous Fern Survival',
      dependencies: {
        minecraft: '1.21.4',
        'fabric-loader': '0.16.10',
      },
      files: [],
    };

    const mrpackBuf = createZipArchive([
      { relativePath: 'modrinth.index.json', content: JSON.stringify(mrpackIndex) },
      { relativePath: 'overrides/config/test-options.txt', content: 'fov:90\n' },
    ]);

    const archivePath = path.join(tempDir, 'fern-survival.mrpack');
    await fs.writeFile(archivePath, mrpackBuf);

    const inst = await modpackService.importModpack(archivePath, undefined, { skipBaseInstall: true });
    expect(inst.id).toBeDefined();
    expect(inst.name).toBe('Fabulous Fern Survival');
    expect(inst.minecraftVersion).toBe('1.21.4');
    expect(inst.loader).toBe('fabric');
    expect(inst.loaderVersion).toBe('0.16.10');

    // Verify overrides copied
    const instanceDir = pathManager.getInstanceDir(inst.id);
    const configFile = path.join(instanceDir, 'config', 'test-options.txt');
    const configExists = await fs.readFile(configFile, 'utf-8');
    expect(configExists).toBe('fov:90\n');
  }, 15000);

  it('exports an installation to a clean modpack archive without sensitive files', async () => {
    const inst = await installationManager.createInstallation({
      name: 'Export Pack',
      minecraftVersion: '1.21.4',
      loader: 'fabric',
      loaderVersion: '0.16.10',
    });

    const instanceDir = pathManager.getInstanceDir(inst.id);
    await fs.mkdir(path.join(instanceDir, 'mods'), { recursive: true });
    await fs.mkdir(path.join(instanceDir, 'config'), { recursive: true });

    // Legitimate mod and config
    await fs.writeFile(path.join(instanceDir, 'mods', 'sodium.jar'), 'fake-sodium');
    await fs.writeFile(path.join(instanceDir, 'config', 'sodium-options.json'), '{}');

    // Sensitive files that must NEVER be exported
    await fs.writeFile(path.join(instanceDir, 'accounts.json'), 'secret-token-data');
    await fs.writeFile(path.join(instanceDir, 'usercache.json'), 'user-cache');

    const exportPath = path.join(tempDir, 'exported.mrpack');
    await modpackService.exportModpack(inst, exportPath);

    const exportedBuf = await fs.readFile(exportPath);
    const indexStr = readZipEntryText(exportedBuf, 'modrinth.index.json');
    expect(indexStr).toBeDefined();

    const index = JSON.parse(indexStr!);
    expect(index.name).toBe('Export Pack');
    expect(index.dependencies.minecraft).toBe('1.21.4');

    // Check that sensitive files were not included
    const leakedAccount = readZipEntryText(exportedBuf, 'overrides/accounts.json');
    expect(leakedAccount).toBeNull();
  });
});
