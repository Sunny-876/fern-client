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

export class ForgeLoader implements IModLoader {
  public readonly id: ModLoaderType = 'forge';
  public readonly name = 'Forge';

  private cacheDir: string;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger,
    private _downloadManager: DownloadManager
  ) {
    this.cacheDir = path.join(this.pathManager.getCacheDir(), 'loaders', 'forge');
  }

  public async getCompatibleVersions(minecraftVersion: string): Promise<LoaderVersionInfo[]> {
    const cacheFile = path.join(this.cacheDir, `promotions.json`);
    await fs.mkdir(this.cacheDir, { recursive: true });

    try {
      const res = await fetch('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json', {
        headers: { 'User-Agent': 'FernClient/1.0.0 (contact@fernclient.net)' },
      });
      if (res.ok) {
        const data = (await res.json()) as { promos: Record<string, string> };
        await fs.writeFile(cacheFile, JSON.stringify(data), 'utf-8');
        return this.filterPromotionsForMc(data.promos, minecraftVersion);
      }
    } catch (err) {
      this.logger.warn('ForgeLoader', `Failed to fetch Forge promos:`, err);
    }

    try {
      const cached = JSON.parse(await fs.readFile(cacheFile, 'utf-8'));
      return this.filterPromotionsForMc(cached.promos, minecraftVersion);
    } catch {
      // Offline fallback
      return [
        { id: `${minecraftVersion}-recommended`, version: 'recommended', gameVersion: minecraftVersion, stable: true },
        { id: `${minecraftVersion}-latest`, version: 'latest', gameVersion: minecraftVersion, stable: false },
      ];
    }
  }

  private filterPromotionsForMc(promos: Record<string, string>, mcVersion: string): LoaderVersionInfo[] {
    const results: LoaderVersionInfo[] = [];
    const recommended = promos[`${mcVersion}-recommended`];
    const latest = promos[`${mcVersion}-latest`];

    if (recommended) {
      results.push({
        id: recommended,
        version: recommended,
        gameVersion: mcVersion,
        stable: true,
      });
    }
    if (latest && latest !== recommended) {
      results.push({
        id: latest,
        version: latest,
        gameVersion: mcVersion,
        stable: false,
      });
    }
    return results;
  }

  public async install(
    installation: Installation,
    loaderVersion: string,
    onProgress?: (step: string, percentage: number) => void
  ): Promise<ModLoaderInstallResult> {
    onProgress?.('Configuring Forge loader profile...', 30);
    this.logger.info('ForgeLoader', `Installing Forge ${loaderVersion} for MC ${installation.minecraftVersion}`);

    const forgeVersionId = `forge-${installation.minecraftVersion}-${loaderVersion}`;
    const versionDir = path.join(this.pathManager.getVersionsDir(), forgeVersionId);
    await fs.mkdir(versionDir, { recursive: true });

    const profileData = {
      id: forgeVersionId,
      inheritsFrom: installation.minecraftVersion,
      mainClass: 'net.minecraftforge.bootstrap.ForgeBootstrap',
      arguments: {
        game: ['--launchTarget', 'forgeclient'],
      },
      libraries: [
        {
          name: `net.minecraftforge:forge:${installation.minecraftVersion}-${loaderVersion}`,
          url: 'https://maven.minecraftforge.net/',
        },
      ],
    };

    await fs.writeFile(path.join(versionDir, `${forgeVersionId}.json`), JSON.stringify(profileData, null, 2));
    onProgress?.('Forge installation complete.', 100);

    return {
      success: true,
      loaderType: 'forge',
      loaderVersion,
      minecraftVersion: installation.minecraftVersion,
      installedLibrariesCount: 1,
      message: `Forge ${loaderVersion} configured.`,
    };
  }

  public async validate(installation: Installation): Promise<boolean> {
    if (!installation.loaderVersion) return false;
    const forgeVersionId = `forge-${installation.minecraftVersion}-${installation.loaderVersion}`;
    const profilePath = path.join(this.pathManager.getVersionsDir(), forgeVersionId, `${forgeVersionId}.json`);
    try {
      await fs.access(profilePath);
      return true;
    } catch {
      return false;
    }
  }

  public async getLaunchInfo(installation: Installation): Promise<ModLoaderLaunchInfo> {
    const loaderVersion = installation.loaderVersion || 'recommended';
    const libraries: ModLoaderLibrary[] = [
      {
        name: `net.minecraftforge:forge:${installation.minecraftVersion}-${loaderVersion}`,
      },
    ];

    return {
      libraries,
      mainClass: 'net.minecraftforge.bootstrap.ForgeBootstrap',
      gameArguments: ['--launchTarget', 'forgeclient'],
    };
  }
}
