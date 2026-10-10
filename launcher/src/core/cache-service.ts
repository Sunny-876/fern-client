import * as fs from 'fs/promises';
import * as path from 'path';
import { FernPathManager } from './paths';
import { FernLogger } from './logger';

export interface CacheCategoryBreakdown {
  minecraftFilesBytes: number;
  librariesBytes: number;
  modMetadataBytes: number;
  thumbnailsBytes: number;
  tempFilesBytes: number;
  totalBytes: number;
  formattedTotal: string;
  formatted: {
    minecraftFiles: string;
    libraries: string;
    modMetadata: string;
    thumbnails: string;
    total: string;
  };
}

export class CacheService {
  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger
  ) {}

  private async calculateDirSize(dirPath: string): Promise<number> {
    let size = 0;
    try {
      await fs.access(dirPath);
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          size += await this.calculateDirSize(full);
        } else if (entry.isFile()) {
          const stat = await fs.stat(full);
          size += stat.size;
        }
      }
    } catch {
      // Missing directory or access error
    }
    return size;
  }

  public async getCacheBreakdown(): Promise<CacheCategoryBreakdown> {
    const assetsDir = this.pathManager.getAssetsDir();
    const versionsDir = this.pathManager.getVersionsDir();
    const librariesDir = this.pathManager.getLibrariesDir();
    const tempDir = this.pathManager.getTempDir();
    const modCacheDir = path.join(this.pathManager.getBaseDir(), 'cache', 'mods');
    const thumbnailsDir = path.join(this.pathManager.getBaseDir(), 'cache', 'thumbnails');

    const [assetsSize, versionsSize, libsSize, tempSize, modMetaSize, thumbsSize] = await Promise.all([
      this.calculateDirSize(assetsDir),
      this.calculateDirSize(versionsDir),
      this.calculateDirSize(librariesDir),
      this.calculateDirSize(tempDir),
      this.calculateDirSize(modCacheDir),
      this.calculateDirSize(thumbnailsDir),
    ]);

    const mcFiles = assetsSize + versionsSize;
    const total = mcFiles + libsSize + tempSize + modMetaSize + thumbsSize;

    return {
      minecraftFilesBytes: mcFiles,
      librariesBytes: libsSize,
      modMetadataBytes: modMetaSize,
      thumbnailsBytes: thumbsSize,
      tempFilesBytes: tempSize,
      totalBytes: total,
      formattedTotal: CacheService.formatBytes(total),
      formatted: {
        minecraftFiles: CacheService.formatBytes(mcFiles),
        libraries: CacheService.formatBytes(libsSize),
        modMetadata: CacheService.formatBytes(modMetaSize),
        thumbnails: CacheService.formatBytes(thumbsSize),
        total: CacheService.formatBytes(total),
      },
    };
  }

  /**
   * Cleans safe transient caches (temporary archives, cached thumbnails, old metadata)
   * while strictly preserving required installed Minecraft client jars and asset objects.
   */
  public async clearSafeCache(): Promise<{
    clearedBytes: number;
    clearedFiles: number;
    freedBytes: number;
    freedFormatted: string;
  }> {
    let clearedBytes = 0;
    let clearedFiles = 0;

    const safeCleanTargets = [
      this.pathManager.getTempDir(),
      path.join(this.pathManager.getBaseDir(), 'cache', 'thumbnails'),
      path.join(this.pathManager.getBaseDir(), 'cache', 'mods'),
    ];

    for (const target of safeCleanTargets) {
      try {
        await fs.access(target);
        const entries = await fs.readdir(target, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(target, entry.name);
          try {
            const stat = await fs.stat(full);
            if (entry.isFile()) {
              await fs.unlink(full);
              clearedBytes += stat.size;
              clearedFiles++;
            } else if (entry.isDirectory()) {
              clearedBytes += await this.calculateDirSize(full);
              await fs.rm(full, { recursive: true, force: true });
              clearedFiles++;
            }
          } catch {}
        }
      } catch {}
    }

    this.logger.info(
      'CacheService',
      `Safe cache cleared: ${clearedFiles} files, ${CacheService.formatBytes(clearedBytes)} freed.`
    );

    return {
      clearedBytes,
      clearedFiles,
      freedBytes: clearedBytes,
      freedFormatted: CacheService.formatBytes(clearedBytes),
    };
  }

  public static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
