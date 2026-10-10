import * as path from 'path';
import * as fs from 'fs/promises';
import { Installation, ModLoaderType } from '../../../shared/models/installation';
import { ModpackImportProgress } from '../../../shared/models/modpack';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { FernError, FernErrorCode } from '../core/errors';
import { InstallationManager } from '../installations/installation-manager';
import { MinecraftInstallerService } from '../installations/installer-service';
import { ModLoaderManager } from '../loaders/loader-manager';
import { DownloadManager, BatchDownloadItem } from '../downloads/download-manager';
import { readZipEntries, readZipEntryText, extractZipSafe, createZipArchive } from '../utils/zip';

export type ModpackProgressListener = (progress: ModpackImportProgress) => void;

export class ModpackService {
  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger,
    private installationManager: InstallationManager,
    private installerService: MinecraftInstallerService,
    private loaderManager: ModLoaderManager,
    private downloadManager: DownloadManager
  ) {}

  /**
   * Imports a .mrpack or .zip modpack file and turns it into a ready-to-play Fern installation.
   */
  public async importModpack(
    archivePath: string,
    onProgress?: ModpackProgressListener,
    options?: { skipBaseInstall?: boolean }
  ): Promise<Installation> {
    this.logger.info('ModpackService', `Beginning modpack import from: ${archivePath}`);

    onProgress?.({
      stage: 'extracting',
      percentage: 5,
      message: 'Reading and validating modpack archive...',
    });

    const archiveBuffer = await fs.readFile(archivePath);
    const fileName = path.basename(archivePath);

    // Check for Modrinth .mrpack format (modrinth.index.json)
    const mrpackIndexStr = readZipEntryText(archiveBuffer, 'modrinth.index.json');
    if (mrpackIndexStr) {
      return this.installMrpack(archiveBuffer, mrpackIndexStr, fileName, onProgress, options);
    }

    // Fallback: Check for generic / Fern modpack.json
    const fernManifestStr = readZipEntryText(archiveBuffer, 'modpack.json');
    if (fernManifestStr) {
      return this.installFernZip(archiveBuffer, fernManifestStr, fileName, onProgress);
    }

    throw new FernError(
      FernErrorCode.VALIDATION_ERROR,
      'Unsupported modpack archive format.',
      'The selected archive is missing modrinth.index.json or modpack.json.'
    );
  }

  private async installMrpack(
    archiveBuffer: Buffer,
    indexJsonStr: string,
    archiveName: string,
    onProgress?: ModpackProgressListener,
    options?: { skipBaseInstall?: boolean }
  ): Promise<Installation> {
    onProgress?.({
      stage: 'manifest',
      percentage: 15,
      message: 'Parsing Modrinth modpack manifest...',
    });

    const index = JSON.parse(indexJsonStr) as {
      name: string;
      versionId?: string;
      summary?: string;
      dependencies: Record<string, string>;
      files: Array<{
        path: string;
        hashes?: { sha1?: string; sha512?: string };
        env?: { client?: string };
        downloads: string[];
        fileSize?: number;
      }>;
    };

    const mcVersion = index.dependencies.minecraft;
    if (!mcVersion) {
      throw new FernError(
        FernErrorCode.VALIDATION_ERROR,
        'Invalid modpack: missing Minecraft version in manifest dependencies.'
      );
    }

    // Determine loader & loader version
    let loader: ModLoaderType = 'vanilla';
    let loaderVersion: string | undefined;

    if (index.dependencies['fabric-loader']) {
      loader = 'fabric';
      loaderVersion = index.dependencies['fabric-loader'];
    } else if (index.dependencies['quilt-loader']) {
      loader = 'quilt';
      loaderVersion = index.dependencies['quilt-loader'];
    } else if (index.dependencies['forge']) {
      loader = 'forge';
      loaderVersion = index.dependencies['forge'];
    } else if (index.dependencies['neoforge']) {
      loader = 'neoforge';
      loaderVersion = index.dependencies['neoforge'];
    }

    // Create installation in Fern
    const packName = index.name || path.parse(archiveName).name;
    const installation = await this.installationManager.createInstallation({
      name: packName,
      minecraftVersion: mcVersion,
      loader,
      loaderVersion,
      maxMemory: 4096,
      minMemory: 2048,
    });

    const instanceDir = this.pathManager.getInstanceDir(installation.id);
    await fs.mkdir(instanceDir, { recursive: true });

    // 1. Install base Minecraft if not installed
    onProgress?.({
      stage: 'minecraft',
      percentage: 25,
      message: `Installing base Minecraft ${mcVersion}...`,
    });
    if (!options?.skipBaseInstall) {
      try {
        await this.installerService.installVersion(mcVersion);
      } catch (err) {
        this.logger.warn('ModpackService', 'Base Minecraft installation check encountered:', err);
      }
    }

    // 2. Install loader if specified
    if (loader !== 'vanilla' && loaderVersion) {
      onProgress?.({
        stage: 'loader',
        percentage: 45,
        message: `Installing ${loader} ${loaderVersion}...`,
      });
      await this.loaderManager.installLoader(installation, loaderVersion);
    }

    // 3. Extract overrides/ folder safely into instance root
    const tempExtractDir = path.join(this.pathManager.getCacheDir(), 'temp_pack_' + Date.now());
    try {
      await extractZipSafe(archiveBuffer, tempExtractDir, {
        filter: (entry) => entry.startsWith('overrides/'),
      });

      const extractedOverrides = path.join(tempExtractDir, 'overrides');
      try {
        await fs.cp(extractedOverrides, instanceDir, { recursive: true });
      } catch {
        // No overrides or empty
      }
    } finally {
      await fs.rm(tempExtractDir, { recursive: true, force: true }).catch(() => {});
    }

    // 4. Download modpack declared files (mods, etc.)
    const clientFiles = index.files.filter(
      (f) => !f.env || f.env.client !== 'unsupported'
    );

    const downloadItems: BatchDownloadItem[] = [];
    for (const f of clientFiles) {
      if (f.downloads && f.downloads.length > 0) {
        // Safe relative path inside instanceDir
        const sanitizedRelPath = f.path.replace(/\\/g, '/').replace(/^\/+/, '');
        const targetPath = path.resolve(instanceDir, sanitizedRelPath);

        // Path traversal defense on manifest declared paths
        if (!targetPath.startsWith(path.resolve(instanceDir) + path.sep)) {
          continue;
        }

        downloadItems.push({
          id: f.path,
          url: f.downloads[0],
          destination: targetPath,
          size: f.fileSize,
          expectedSha1: f.hashes?.sha1,
          category: 'mod',
        });
      }
    }

    onProgress?.({
      stage: 'mods',
      percentage: 60,
      message: `Downloading ${downloadItems.length} modpack files...`,
      totalFiles: downloadItems.length,
      completedFiles: 0,
    });

    if (downloadItems.length > 0) {
      const unsub = this.downloadManager.onBatchProgress((update) => {
        if (update.batchId === `pack-${installation.id}`) {
          const scaled = 60 + Math.round(update.percentage * 0.35);
          onProgress?.({
            stage: 'mods',
            percentage: scaled,
            message: update.step,
            completedFiles: update.completedFiles,
            totalFiles: update.totalFiles,
          });
        }
      });

      try {
        await this.downloadManager.downloadBatch(`pack-${installation.id}`, downloadItems, {
          concurrency: 10,
          stepName: 'Downloading modpack files',
        });
      } finally {
        unsub();
      }
    }

    onProgress?.({
      stage: 'complete',
      percentage: 100,
      message: 'Modpack installation complete!',
    });

    await this.installationManager.setInstallationStatus(installation.id, 'INSTALLED');
    return installation;
  }

  private async installFernZip(
    archiveBuffer: Buffer,
    manifestStr: string,
    archiveName: string,
    onProgress?: ModpackProgressListener
  ): Promise<Installation> {
    const manifest = JSON.parse(manifestStr) as {
      name: string;
      minecraftVersion: string;
      loader: ModLoaderType;
      loaderVersion?: string;
    };

    const packName = manifest.name || path.parse(archiveName).name;
    const installation = await this.installationManager.createInstallation({
      name: packName,
      minecraftVersion: manifest.minecraftVersion,
      loader: manifest.loader || 'vanilla',
      loaderVersion: manifest.loaderVersion,
      maxMemory: 4096,
      minMemory: 2048,
    });

    const instanceDir = this.pathManager.getInstanceDir(installation.id);
    await fs.mkdir(instanceDir, { recursive: true });

    onProgress?.({
      stage: 'extracting',
      percentage: 50,
      message: 'Extracting instance files...',
    });

    // Safely extract entire archive contents into instanceDir (excluding manifest)
    await extractZipSafe(archiveBuffer, instanceDir, {
      filter: (name) => name !== 'modpack.json',
    });

    onProgress?.({
      stage: 'complete',
      percentage: 100,
      message: 'Modpack installation complete!',
    });

    await this.installationManager.setInstallationStatus(installation.id, 'INSTALLED');
    return installation;
  }

  /**
   * Safely exports an installation as a portable .mrpack or .zip modpack archive.
   * Strips all authentication, sessions, and sensitive files.
   */
  public async exportModpack(
    installation: Installation,
    destinationFilePath: string
  ): Promise<void> {
    this.logger.info('ModpackService', `Exporting modpack for installation ${installation.id}`);

    const instanceDir = installation.gameDirectory || this.pathManager.getInstanceDir(installation.id);
    const filesToArchive: Array<{ relativePath: string; content: Buffer }> = [];

    // 1. Generate modrinth.index.json
    const modsDir = path.join(instanceDir, 'mods');
    const modFiles: string[] = [];
    try {
      const entries = await fs.readdir(modsDir);
      for (const e of entries) {
        if (e.endsWith('.jar') && !e.endsWith('.disabled')) {
          modFiles.push(e);
        }
      }
    } catch {
      // No mods directory
    }

    const indexJson = {
      formatVersion: 1,
      game: 'minecraft',
      versionId: '1.0.0',
      name: installation.name,
      summary: `Exported from Fern Client (${installation.minecraftVersion})`,
      dependencies: {
        minecraft: installation.minecraftVersion,
        ...(installation.loader !== 'vanilla' && installation.loaderVersion
          ? { [`${installation.loader}-loader`]: installation.loaderVersion }
          : {}),
      },
      files: [], // Declared files or bundled in overrides
    };

    filesToArchive.push({
      relativePath: 'modrinth.index.json',
      content: Buffer.from(JSON.stringify(indexJson, null, 2), 'utf-8'),
    });

    // 2. Bundle safe overrides: mods, config, resourcepacks, shaderpacks
    const allowedFolders = ['mods', 'config', 'resourcepacks', 'shaderpacks'];
    for (const folder of allowedFolders) {
      const folderPath = path.join(instanceDir, folder);
      try {
        await this.collectFolderFiles(folderPath, `overrides/${folder}`, filesToArchive);
      } catch {
        // Folder does not exist, ignore
      }
    }

    const archiveBuffer = createZipArchive(filesToArchive);
    await fs.mkdir(path.dirname(destinationFilePath), { recursive: true });
    await fs.writeFile(destinationFilePath, archiveBuffer);

    this.logger.info('ModpackService', `Successfully exported modpack to ${destinationFilePath} (${filesToArchive.length} files)`);
  }

  private async collectFolderFiles(
    dirPath: string,
    archivePrefix: string,
    results: Array<{ relativePath: string; content: Buffer }>
  ): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relPath = `${archivePrefix}/${entry.name}`;

      // Skip sensitive files
      const lower = entry.name.toLowerCase();
      if (
        lower.includes('token') ||
        lower.includes('secret') ||
        lower.includes('account') ||
        lower.includes('usercache') ||
        lower.endsWith('.log')
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.collectFolderFiles(fullPath, relPath, results);
      } else {
        const content = await fs.readFile(fullPath);
        results.push({ relativePath: relPath, content });
      }
    }
  }
}
