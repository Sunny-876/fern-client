import * as fs from 'fs/promises';
import * as path from 'path';
import {
  MinecraftVersionPackage,
  MinecraftLibrary,
  OSCompatibilityRule,
  AssetIndexPayload,
} from '../../../shared/models/version';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { FernError, FernErrorCode } from '../core/errors';
import { VersionService } from '../versions/version-service';
import { DownloadManager, BatchDownloadItem, BatchProgressUpdate } from '../downloads/download-manager';

export type InstallProgressCallback = (update: {
  versionId: string;
  stage: 'manifest' | 'client' | 'libraries' | 'assets' | 'complete';
  percentage: number;
  message: string;
  speed?: string;
  eta?: string;
}) => void;

export class MinecraftInstallerService {
  constructor(
    private pathManager: FernPathManager,
    private versionService: VersionService,
    private downloadManager: DownloadManager,
    private logger: FernLogger
  ) {}

  /**
   * Installs complete Minecraft version files (Client JAR, Libraries, Asset Index & Objects).
   */
  public async installVersion(
    versionId: string,
    onProgress?: InstallProgressCallback
  ): Promise<void> {
    this.logger.info('InstallerService', `Beginning installation for Minecraft ${versionId}...`);

    // 1. Fetch version package
    onProgress?.({
      versionId,
      stage: 'manifest',
      percentage: 5,
      message: 'Fetching version package...',
    });

    const pkg = await this.versionService.getVersionPackage(versionId);

    // 2. Download client JAR
    onProgress?.({
      versionId,
      stage: 'client',
      percentage: 10,
      message: 'Downloading Minecraft client JAR...',
    });

    const versionDir = path.join(this.pathManager.getVersionsDir(), versionId);
    const clientJarPath = path.join(versionDir, `${versionId}.jar`);

    await this.downloadManager.downloadBatch(
      `client-${versionId}`,
      [
        {
          id: `client-${versionId}`,
          url: pkg.downloads.client.url,
          destination: clientJarPath,
          size: pkg.downloads.client.size,
          expectedSha1: pkg.downloads.client.sha1,
          category: 'client',
        },
      ],
      { stepName: 'Downloading client JAR' }
    );

    // 3. Resolve and download libraries
    const libraryItems = this.resolveLibraryDownloads(pkg.libraries);
    this.logger.info('InstallerService', `Resolved ${libraryItems.length} libraries to verify/download.`);

    const unsubscribeLib = this.downloadManager.onBatchProgress((update) => {
      if (update.batchId === `libs-${versionId}`) {
        const scaledPercentage = 15 + Math.round((update.percentage * 0.4)); // 15% to 55%
        onProgress?.({
          versionId,
          stage: 'libraries',
          percentage: scaledPercentage,
          message: update.step,
          speed: update.speedFormatted,
          eta: update.etaFormatted,
        });
      }
    });

    try {
      await this.downloadManager.downloadBatch(`libs-${versionId}`, libraryItems, {
        concurrency: 12,
        stepName: 'Downloading libraries',
      });
    } finally {
      unsubscribeLib();
    }

    // 4. Download Asset Index
    onProgress?.({
      versionId,
      stage: 'assets',
      percentage: 60,
      message: 'Fetching asset index...',
    });

    const assetsDir = this.pathManager.getAssetsDir();
    const indexFilePath = path.join(assetsDir, 'indexes', `${pkg.assetIndex.id}.json`);

    await this.downloadManager.downloadBatch(
      `asset-index-${versionId}`,
      [
        {
          id: `index-${pkg.assetIndex.id}`,
          url: pkg.assetIndex.url,
          destination: indexFilePath,
          size: pkg.assetIndex.size,
          expectedSha1: pkg.assetIndex.sha1,
          category: 'assets',
        },
      ],
      { stepName: 'Downloading asset index' }
    );

    // 5. Parse and download asset objects
    const indexRaw = await fs.readFile(indexFilePath, 'utf-8');
    const assetIndex: AssetIndexPayload = JSON.parse(indexRaw);
    const assetItems = this.resolveAssetDownloads(assetIndex);
    this.logger.info('InstallerService', `Resolved ${assetItems.length} assets to verify/download.`);

    const unsubscribeAssets = this.downloadManager.onBatchProgress((update) => {
      if (update.batchId === `assets-${versionId}`) {
        const scaledPercentage = 65 + Math.round((update.percentage * 0.35)); // 65% to 100%
        onProgress?.({
          versionId,
          stage: 'assets',
          percentage: scaledPercentage,
          message: update.step,
          speed: update.speedFormatted,
          eta: update.etaFormatted,
        });
      }
    });

    try {
      await this.downloadManager.downloadBatch(`assets-${versionId}`, assetItems, {
        concurrency: 16,
        stepName: 'Downloading game assets',
      });
    } finally {
      unsubscribeAssets();
    }

    onProgress?.({
      versionId,
      stage: 'complete',
      percentage: 100,
      message: 'Installation complete.',
    });

    this.logger.info('InstallerService', `Successfully installed Minecraft ${versionId}.`);
  }

  public cancelInstallation(versionId: string): void {
    this.downloadManager.cancelBatch(`client-${versionId}`);
    this.downloadManager.cancelBatch(`libs-${versionId}`);
    this.downloadManager.cancelBatch(`asset-index-${versionId}`);
    this.downloadManager.cancelBatch(`assets-${versionId}`);
    this.logger.info('InstallerService', `Cancelled installation tasks for ${versionId}`);
  }

  /**
   * Evaluates Mojang library rules and extracts valid download items for current OS.
   */
  public resolveLibraryDownloads(libraries: MinecraftLibrary[]): BatchDownloadItem[] {
    const items: BatchDownloadItem[] = [];
    const currentOs = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
    const librariesDir = this.pathManager.getLibrariesDir();

    for (const lib of libraries) {
      if (!this.isLibraryAllowed(lib.rules, currentOs)) {
        continue;
      }

      // Check standard artifact
      if (lib.downloads?.artifact) {
        const art = lib.downloads.artifact;
        const relativePath = art.path || this.mavenCoordinateToPath(lib.name);
        items.push({
          id: lib.name,
          url: art.url,
          destination: path.join(librariesDir, relativePath),
          size: art.size,
          expectedSha1: art.sha1,
          category: 'libraries',
        });
      }

      // Check OS-specific classifier (natives)
      if (lib.natives && lib.downloads?.classifiers) {
        const classifierKey = lib.natives[currentOs];
        if (classifierKey) {
          const formattedKey = classifierKey.replace('${arch}', process.arch === 'x64' ? '64' : '32');
          const classifierArtifact = lib.downloads.classifiers[formattedKey];
          if (classifierArtifact) {
            const relPath = classifierArtifact.path || `${this.mavenCoordinateToPath(lib.name)}-${formattedKey}.jar`;
            items.push({
              id: `${lib.name}:${formattedKey}`,
              url: classifierArtifact.url,
              destination: path.join(librariesDir, relPath),
              size: classifierArtifact.size,
              expectedSha1: classifierArtifact.sha1,
              category: 'libraries',
            });
          }
        }
      }
    }

    return items;
  }

  /**
   * Resolves Mojang asset objects to CDN download items.
   */
  public resolveAssetDownloads(index: AssetIndexPayload): BatchDownloadItem[] {
    const items: BatchDownloadItem[] = [];
    const objectsDir = path.join(this.pathManager.getAssetsDir(), 'objects');

    for (const [_, obj] of Object.entries(index.objects)) {
      const hash = obj.hash;
      const prefix = hash.substring(0, 2);
      const url = `https://resources.download.minecraft.net/${prefix}/${hash}`;
      const destination = path.join(objectsDir, prefix, hash);

      items.push({
        id: hash,
        url,
        destination,
        size: obj.size,
        expectedSha1: hash,
        category: 'assets',
      });
    }

    return items;
  }

  /**
   * Evaluates OS compatibility rules sequentially.
   */
  public isLibraryAllowed(rules: OSCompatibilityRule[] | undefined, currentOs: string): boolean {
    if (!rules || rules.length === 0) {
      return true;
    }

    let allowed = false;
    for (const rule of rules) {
      if (rule.os) {
        if (rule.os.name === currentOs) {
          allowed = rule.action === 'allow';
        }
      } else {
        allowed = rule.action === 'allow';
      }
    }

    return allowed;
  }

  /**
   * Converts Maven coordinate (e.g. org.lwjgl:lwjgl:3.3.3) to relative jar file path.
   */
  private mavenCoordinateToPath(coordinate: string): string {
    const parts = coordinate.split(':');
    if (parts.length < 3) return coordinate.replace(/[:]/g, '/') + '.jar';
    const group = parts[0].replace(/\./g, '/');
    const artifact = parts[1];
    const version = parts[2];
    const classifier = parts[3] ? `-${parts[3]}` : '';
    return `${group}/${artifact}/${version}/${artifact}-${version}${classifier}.jar`;
  }
}
