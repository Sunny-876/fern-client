import * as fs from 'fs/promises';
import * as path from 'path';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { FernError, FernErrorCode } from '../core/errors';
import { createZipArchive } from '../utils/zip';

export interface ScreenshotMetadata {
  id: string;
  filename: string;
  fullPath: string;
  sizeBytes: number;
  capturedAt: number;
  instanceId?: string;
  favorite: boolean;
  tags: string[];
  sessionBookmark?: string;
  available: boolean;
}

export interface ScreenshotFilter {
  startDate?: number;
  endDate?: number;
  favoriteOnly?: boolean;
  tag?: string;
  instanceId?: string;
  sessionBookmark?: string;
  searchQuery?: string;
}

export class ScreenshotManager {
  private metadataStore: Map<string, { favorite: boolean; tags: string[]; sessionBookmark?: string }> = new Map();
  private metaFilePath: string;
  private isLoaded = false;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger
  ) {
    this.metaFilePath = path.join(this.pathManager.getLauncherDir(), 'screenshot-metadata.json');
  }

  public async load(): Promise<void> {
    try {
      await fs.access(this.metaFilePath);
      const raw = await fs.readFile(this.metaFilePath, 'utf-8');
      const data = JSON.parse(raw);
      this.metadataStore.clear();
      if (data && typeof data === 'object') {
        for (const [key, val] of Object.entries(data)) {
          this.metadataStore.set(key, val as any);
        }
      }
    } catch {
      this.metadataStore.clear();
    }
    this.isLoaded = true;
    this.logger.info('ScreenshotManager', `Loaded metadata for ${this.metadataStore.size} screenshot(s).`);
  }

  /**
   * Scans screenshots across the global screenshots directory and instance directories.
   */
  public async scanScreenshots(
    instances: Array<{ id: string; gameDirectory: string }> = []
  ): Promise<ScreenshotMetadata[]> {
    if (!this.isLoaded) {
      await this.load();
    }

    const searchDirs: Array<{ dir: string; instanceId?: string }> = [
      { dir: this.pathManager.getScreenshotsDir() },
    ];

    for (const inst of instances) {
      if (inst.gameDirectory) {
        searchDirs.push({
          dir: path.join(inst.gameDirectory, 'screenshots'),
          instanceId: inst.id,
        });
      }
    }

    const results: ScreenshotMetadata[] = [];
    const seenPaths = new Set<string>();

    for (const { dir, instanceId } of searchDirs) {
      try {
        await fs.access(dir);
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isFile()) continue;
          const ext = path.extname(entry.name).toLowerCase();
          if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') continue;

          const fullPath = path.resolve(dir, entry.name);
          if (seenPaths.has(fullPath)) continue;
          seenPaths.add(fullPath);

          let stat;
          try {
            stat = await fs.stat(fullPath);
          } catch {
            continue;
          }

          const relativeKey = path.basename(entry.name);
          const meta = this.metadataStore.get(relativeKey) || {
            favorite: false,
            tags: [],
            sessionBookmark: undefined,
          };

          results.push({
            id: `shot-${stat.mtimeMs}-${entry.name}`,
            filename: entry.name,
            fullPath,
            sizeBytes: stat.size,
            capturedAt: stat.mtimeMs,
            instanceId,
            favorite: meta.favorite,
            tags: [...meta.tags],
            sessionBookmark: meta.sessionBookmark,
            available: true,
          });
        }
      } catch {
        // Directory doesn't exist, skip gracefully
      }
    }

    return results.sort((a, b) => b.capturedAt - a.capturedAt);
  }

  /**
   * Filters a list of screenshots by query parameters.
   */
  public filterScreenshots(
    screenshots: ScreenshotMetadata[],
    filter: ScreenshotFilter
  ): ScreenshotMetadata[] {
    return screenshots.filter((shot) => {
      if (filter.startDate !== undefined && shot.capturedAt < filter.startDate) {
        return false;
      }
      if (filter.endDate !== undefined && shot.capturedAt > filter.endDate) {
        return false;
      }
      if (filter.favoriteOnly && !shot.favorite) {
        return false;
      }
      if (filter.instanceId && shot.instanceId !== filter.instanceId) {
        return false;
      }
      if (filter.sessionBookmark && shot.sessionBookmark !== filter.sessionBookmark) {
        return false;
      }
      if (filter.tag && !shot.tags.includes(filter.tag)) {
        return false;
      }
      if (filter.searchQuery && filter.searchQuery.trim()) {
        const q = filter.searchQuery.toLowerCase();
        const matchesName = shot.filename.toLowerCase().includes(q);
        const matchesTag = shot.tags.some((t) => t.toLowerCase().includes(q));
        const matchesBookmark = shot.sessionBookmark?.toLowerCase().includes(q);
        if (!matchesName && !matchesTag && !matchesBookmark) return false;
      }
      return true;
    });
  }

  public async toggleFavorite(filename: string): Promise<boolean> {
    const key = path.basename(filename);
    const existing = this.metadataStore.get(key) || { favorite: false, tags: [] };
    existing.favorite = !existing.favorite;
    this.metadataStore.set(key, existing);
    await this.save();
    return existing.favorite;
  }

  public async addTag(filename: string, tag: string): Promise<string[]> {
    const key = path.basename(filename);
    const cleanTag = tag.trim();
    if (!cleanTag) return [];

    const existing = this.metadataStore.get(key) || { favorite: false, tags: [] };
    if (!existing.tags.includes(cleanTag)) {
      existing.tags.push(cleanTag);
    }
    this.metadataStore.set(key, existing);
    await this.save();
    return existing.tags;
  }

  public async removeTag(filename: string, tag: string): Promise<string[]> {
    const key = path.basename(filename);
    const existing = this.metadataStore.get(key);
    if (!existing) return [];

    existing.tags = existing.tags.filter((t) => t !== tag);
    this.metadataStore.set(key, existing);
    await this.save();
    return existing.tags;
  }

  public async setSessionBookmark(filename: string, bookmark?: string): Promise<void> {
    const key = path.basename(filename);
    const existing = this.metadataStore.get(key) || { favorite: false, tags: [] };
    existing.sessionBookmark = bookmark?.trim() || undefined;
    this.metadataStore.set(key, existing);
    await this.save();
  }

  /**
   * Verifies that the screenshot file exists on disk and returns its path.
   */
  public async verifyScreenshotFile(fullPath: string): Promise<{ exists: boolean; resolvedPath: string }> {
    try {
      const resolved = path.resolve(fullPath);
      await fs.access(resolved);
      return { exists: true, resolvedPath: resolved };
    } catch {
      return { exists: false, resolvedPath: fullPath };
    }
  }

  /**
   * Bundles a selected screenshot collection into a clean zip archive.
   */
  public async exportCollection(
    filePaths: string[],
    targetZipPath: string
  ): Promise<{ filesExported: number; totalBytes: number; zipPath: string }> {
    if (filePaths.length === 0) {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'No screenshots selected for export.');
    }

    const entries: Array<{ relativePath: string; content: Buffer }> = [];
    let totalBytes = 0;

    for (const filePath of filePaths) {
      try {
        const cleanPath = path.resolve(filePath);
        const buf = await fs.readFile(cleanPath);
        entries.push({
          relativePath: path.basename(filePath),
          content: buf,
        });
        totalBytes += buf.length;
      } catch (err) {
        this.logger.warn('ScreenshotManager', `Could not read screenshot for export: ${filePath}`, err);
      }
    }

    if (entries.length === 0) {
      throw new FernError(FernErrorCode.RESOURCE_NOT_FOUND, 'None of the requested screenshot files were readable.');
    }

    const zipBuffer = createZipArchive(entries);
    await fs.mkdir(path.dirname(targetZipPath), { recursive: true });
    await fs.writeFile(targetZipPath, zipBuffer);

    this.logger.info(
      'ScreenshotManager',
      `Exported collection of ${entries.length} screenshots (${zipBuffer.length} bytes) to ${targetZipPath}`
    );

    return {
      filesExported: entries.length,
      totalBytes: zipBuffer.length,
      zipPath: targetZipPath,
    };
  }

  private async save(): Promise<void> {
    const obj: Record<string, any> = {};
    for (const [k, v] of this.metadataStore.entries()) {
      obj[k] = v;
    }
    await fs.mkdir(path.dirname(this.metaFilePath), { recursive: true });
    await fs.writeFile(this.metaFilePath, JSON.stringify(obj, null, 2), 'utf-8');
  }
}
