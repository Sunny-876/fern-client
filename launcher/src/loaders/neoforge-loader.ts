import * as path from 'path';
import * as fs from 'fs/promises';
import { IModLoader } from './loader-interface';
import { ModLoaderType, Installation } from '../../../shared/models/installation';
import {
  LoaderVersionInfo,
  ModLoaderLaunchInfo,
  ModLoaderInstallResult,
  ModLoaderLibrary,
} from '../../../shared/models/loader';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { DownloadManager } from '../downloads/download-manager';

export class NeoForgeLoader implements IModLoader {
  public readonly id: ModLoaderType = 'neoforge';
  public readonly name = 'NeoForge';

  private cacheDir: string;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger,
    private _downloadManager: DownloadManager
  ) {
    this.cacheDir = path.join(this.pathManager.getCacheDir(), 'loaders', 'neoforge');
  }

  public async getCompatibleVersions(minecraftVersion: string): Promise<LoaderVersionInfo[]> {
    const cacheFile = path.join(this.cacheDir, `versions-${minecraftVersion}.json`);
    await fs.mkdir(this.cacheDir, { recursive: true });

    try {
      const res = await fetch('https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge', {
        headers: { 'User-Agent': 'FernClient/1.0.0 (contact@fernclient.net)' },
      });
      if (res.ok) {
        const data = (await res.json()) as { versions: string[] };
        const compatible = this.filterNeoForgeVersions(data.versions, minecraftVersion);
        await fs.writeFile(cacheFile, JSON.stringify(compatible), 'utf-8');
        return compatible;
      }
    } catch (err) {
      this.logger.warn('NeoForgeLoader', 'Failed to fetch NeoForge versions from maven:', err);
    }

    try {
      const cached = JSON.parse(await fs.readFile(cacheFile, 'utf-8'));
      return cached;
    } catch {
      // Derive default NeoForge version for 1.20.4+ (e.g. 20.4.x for 1.20.4, 21.1.x for 1.21.1)
      const majorMinor = minecraftVersion.replace(/^1\./, '');
      return [
        { id: `${majorMinor}.0`, version: `${majorMinor}.0`, gameVersion: minecraftVersion, stable: true },
        { id: `${majorMinor}.1`, version: `${majorMinor}.1`, gameVersion: minecraftVersion, stable: true },
      ];
    }
  }

  private filterNeoForgeVersions(allVersions: string[], mcVersion: string): LoaderVersionInfo[] {
    // NeoForge versions are typically <MC_MINOR>.<PATCH> e.g. 20.4.237 for 1.20.4, 21.1.55 for 1.21.1
    const mcParts = mcVersion.split('.');
    const prefix = mcParts.length >= 2 ? `${mcParts[1]}.` : '';

    const matching = allVersions
      .filter((v) => v.startsWith(prefix))
      .slice(-10)
      .reverse();

    return matching.map((v, idx) => ({
      id: v,
      version: v,
      gameVersion: mcVersion,
      stable: idx === 0,
    }));
  }

  public async install(
    installation: Installation,
    loaderVersion: string,
    onProgress?: (step: string, percentage: number) => void
  ): Promise<ModLoaderInstallResult> {
    onProgress?.('Configuring NeoForge profile...', 30);
    this.logger.info('NeoForgeLoader', `Installing NeoForge ${loaderVersion} for MC ${installation.minecraftVersion}`);

    const neoVersionId = `neoforge-${installation.minecraftVersion}-${loaderVersion}`;
    const versionDir = path.join(this.pathManager.getVersionsDir(), neoVersionId);
    await fs.mkdir(versionDir, { recursive: true });

    const profileData = {
      id: neoVersionId,
      inheritsFrom: installation.minecraftVersion,
      mainClass: 'cpw.mods.boot.Launch',
      arguments: {
        game: ['--launchTarget', 'neoforgeclient'],
      },
      libraries: [
        {
          name: `net.neoforged:neoforge:${loaderVersion}`,
          url: 'https://maven.neoforged.net/releases/',
        },
      ],
    };

    await fs.writeFile(path.join(versionDir, `${neoVersionId}.json`), JSON.stringify(profileData, null, 2));
    onProgress?.('NeoForge installation complete.', 100);

    return {
      success: true,
      loaderType: 'neoforge',
      loaderVersion,
      minecraftVersion: installation.minecraftVersion,
      installedLibrariesCount: 1,
      message: `NeoForge ${loaderVersion} configured.`,
    };
  }

  public async validate(installation: Installation): Promise<boolean> {
    if (!installation.loaderVersion) return false;
    const neoVersionId = `neoforge-${installation.minecraftVersion}-${installation.loaderVersion}`;
    const profilePath = path.join(this.pathManager.getVersionsDir(), neoVersionId, `${neoVersionId}.json`);
    try {
      await fs.access(profilePath);
      return true;
    } catch {
      return false;
    }
  }

  public async getLaunchInfo(installation: Installation): Promise<ModLoaderLaunchInfo> {
    const loaderVersion = installation.loaderVersion || '21.1.0';
    const libraries: ModLoaderLibrary[] = [
      {
        name: `net.neoforged:neoforge:${loaderVersion}`,
      },
    ];

    return {
      libraries,
      mainClass: 'cpw.mods.boot.Launch',
      gameArguments: ['--launchTarget', 'neoforgeclient'],
    };
  }
}
