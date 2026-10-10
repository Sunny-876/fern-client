import * as fs from 'fs/promises';
import * as path from 'path';
import * as https from 'https';
import {
  MinecraftVersionManifest,
  MinecraftVersionSummary,
  MinecraftVersionPackage,
  MinecraftVersionType,
} from '../../../shared/models/version';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { FernError, FernErrorCode } from '../core/errors';

export const MOJANG_MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const MANIFEST_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export class VersionService {
  private manifestCache: MinecraftVersionManifest | null = null;
  private manifestFetchTime = 0;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger
  ) {}

  /**
   * Fetches official Mojang version manifest, utilizing disk and memory caching.
   */
  public async getManifest(forceRefresh = false): Promise<MinecraftVersionManifest> {
    const now = Date.now();
    if (!forceRefresh && this.manifestCache && (now - this.manifestFetchTime < MANIFEST_CACHE_TTL_MS)) {
      return this.manifestCache;
    }

    const versionsDir = this.pathManager.getVersionsDir();
    const manifestCachePath = path.join(versionsDir, 'version_manifest_v2.json');

    // Attempt to load from disk if fresh and not forced
    if (!forceRefresh) {
      try {
        const stat = await fs.stat(manifestCachePath);
        if (now - stat.mtimeMs < MANIFEST_CACHE_TTL_MS) {
          const raw = await fs.readFile(manifestCachePath, 'utf-8');
          const parsed: MinecraftVersionManifest = JSON.parse(raw);
          this.manifestCache = parsed;
          this.manifestFetchTime = stat.mtimeMs;
          this.logger.debug('VersionService', `Loaded version manifest from disk cache (${parsed.versions.length} versions).`);
          return parsed;
        }
      } catch {
        // Disk cache missing or stale, proceed to network fetch
      }
    }

    // Fetch from Mojang network endpoint
    try {
      this.logger.info('VersionService', `Fetching official Minecraft manifest from ${MOJANG_MANIFEST_URL}...`);
      const rawManifest = await this.httpGetJson<MinecraftVersionManifest>(MOJANG_MANIFEST_URL);

      await fs.mkdir(versionsDir, { recursive: true });
      await fs.writeFile(manifestCachePath, JSON.stringify(rawManifest, null, 2), 'utf-8');

      this.manifestCache = rawManifest;
      this.manifestFetchTime = now;
      this.logger.info(
        'VersionService',
        `Successfully fetched version manifest. Total versions: ${rawManifest.versions.length} (Latest Release: ${rawManifest.latest.release})`
      );
      return rawManifest;
    } catch (netErr: any) {
      this.logger.warn('VersionService', `Network fetch failed: ${netErr.message}. Attempting disk cache fallback...`);
      try {
        const raw = await fs.readFile(manifestCachePath, 'utf-8');
        const parsed: MinecraftVersionManifest = JSON.parse(raw);
        this.manifestCache = parsed;
        return parsed;
      } catch {
        this.logger.warn('VersionService', 'Disk cache unavailable. Utilizing embedded offline LTS manifest fallback.');
        const fallback = this.getEmbeddedFallbackManifest();
        this.manifestCache = fallback;
        return fallback;
      }
    }
  }

  /**
   * Returns list of version summaries with isInstalled status augmented.
   */
  public async getVersions(options?: {
    type?: 'all' | 'release' | 'snapshot' | 'installed';
    search?: string;
  }): Promise<MinecraftVersionSummary[]> {
    const manifest = await this.getManifest();
    const installedSet = new Set(await this.getInstalledVersionIds());

    let list = manifest.versions.map((v) => ({
      ...v,
      isInstalled: installedSet.has(v.id),
    }));

    if (options?.type) {
      if (options.type === 'release') {
        list = list.filter((v) => v.type === 'release');
      } else if (options.type === 'snapshot') {
        list = list.filter((v) => v.type === 'snapshot');
      } else if (options.type === 'installed') {
        list = list.filter((v) => v.isInstalled);
      }
    }

    if (options?.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      list = list.filter((v) => v.id.toLowerCase().includes(q));
    }

    return list;
  }

  /**
   * Checks if a specific Minecraft version is fully installed locally.
   */
  public async isVersionInstalled(versionId: string): Promise<boolean> {
    const versionDir = path.join(this.pathManager.getVersionsDir(), versionId);
    const jsonPath = path.join(versionDir, `${versionId}.json`);
    const jarPath = path.join(versionDir, `${versionId}.jar`);

    try {
      await fs.access(jsonPath);
      await fs.access(jarPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Scans versions/ folder to return all version IDs with both json and jar present.
   */
  public async getInstalledVersionIds(): Promise<string[]> {
    const versionsDir = this.pathManager.getVersionsDir();
    const installed: string[] = [];

    try {
      const entries = await fs.readdir(versionsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const vId = entry.name;
          const jsonPath = path.join(versionsDir, vId, `${vId}.json`);
          const jarPath = path.join(versionsDir, vId, `${vId}.jar`);
          try {
            await fs.access(jsonPath);
            await fs.access(jarPath);
            installed.push(vId);
          } catch {
            // Not complete
          }
        }
      }
    } catch {
      // Ignore if versionsDir not initialized yet
    }

    return installed;
  }

  /**
   * Retrieves full version package JSON from Mojang or local cache.
   */
  public async getVersionPackage(versionId: string): Promise<MinecraftVersionPackage> {
    const versionDir = path.join(this.pathManager.getVersionsDir(), versionId);
    const jsonPath = path.join(versionDir, `${versionId}.json`);

    // Check disk cache first
    try {
      const raw = await fs.readFile(jsonPath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      // If corrupted JSON was on disk, remove it safely so it doesn't cause repeat failures
      try {
        await fs.unlink(jsonPath).catch(() => {});
      } catch {}
    }

    const manifest = await this.getManifest();
    const summary = manifest.versions.find((v) => v.id === versionId);
    if (!summary) {
      throw new FernError(
        FernErrorCode.VALIDATION_ERROR,
        `Minecraft version "${versionId}" was not found in the official version manifest.`
      );
    }

    this.logger.info('VersionService', `Fetching version package for ${versionId} from ${summary.url}...`);
    const pkg = await this.httpGetJson<MinecraftVersionPackage>(summary.url);

    await fs.mkdir(versionDir, { recursive: true });
    await fs.writeFile(jsonPath, JSON.stringify(pkg, null, 2), 'utf-8');
    return pkg;
  }

  private getEmbeddedFallbackManifest(): MinecraftVersionManifest {
    return {
      latest: {
        release: '1.21.4',
        snapshot: '1.21.4',
      },
      versions: [
        {
          id: '1.21.4',
          type: 'release',
          url: 'https://piston-meta.mojang.com/v1/packages/88f28fa16ec38dc2efdfc40a5bc9b531dc12e2c4/1.21.4.json',
          time: '2024-12-03T10:00:00+00:00',
          releaseTime: '2024-12-03T10:00:00+00:00',
          sha1: '88f28fa16ec38dc2efdfc40a5bc9b531dc12e2c4',
          complianceLevel: 1,
        },
        {
          id: '1.20.4',
          type: 'release',
          url: 'https://piston-meta.mojang.com/v1/packages/1.20.4.json',
          time: '2023-12-07T12:00:00+00:00',
          releaseTime: '2023-12-07T12:00:00+00:00',
          sha1: '1.20.4',
          complianceLevel: 1,
        },
        {
          id: '1.16.5',
          type: 'release',
          url: 'https://piston-meta.mojang.com/v1/packages/1.16.5.json',
          time: '2021-01-15T10:00:00+00:00',
          releaseTime: '2021-01-15T10:00:00+00:00',
          sha1: '1.16.5',
          complianceLevel: 1,
        },
      ],
    };
  }

  private async httpGetJson<T>(url: string, retries = 2, timeoutMs = 8000): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await new Promise<T>((resolve, reject) => {
          const req = https.get(
            url,
            {
              headers: {
                'User-Agent': 'FernClient/1.0.0 (Windows; x64)',
                Accept: 'application/json',
              },
            },
            (res) => {
              if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                return;
              }

              let data = '';
              res.setEncoding('utf-8');
              res.on('data', (chunk) => (data += chunk));
              res.on('end', () => {
                try {
                  resolve(JSON.parse(data));
                } catch (pErr) {
                  reject(new Error(`Malformed JSON response from ${url}: ${(pErr as Error).message}`));
                }
              });
            }
          );

          req.setTimeout(timeoutMs, () => {
            req.destroy(new Error(`Request timed out after ${timeoutMs}ms for ${url}`));
          });

          req.on('error', (err) => reject(err));
        });
      } catch (err: any) {
        if (attempt < retries) {
          const delay = Math.min(1000, 200 * Math.pow(2, attempt));
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
    throw new Error(`Failed to fetch JSON from ${url}`);
  }
}
