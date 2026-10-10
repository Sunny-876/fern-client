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
import { DownloadManager, BatchDownloadItem } from '../downloads/download-manager';

interface FabricLoaderApiResponse {
  loader: {
    separator: string;
    build: number;
    maven: string;
    version: string;
    stable: boolean;
  };
}

export class FabricLoader implements IModLoader {
  public readonly id: ModLoaderType = 'fabric';
  public readonly name = 'Fabric';

  private cacheDir: string;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger,
    private downloadManager: DownloadManager
  ) {
    this.cacheDir = path.join(this.pathManager.getCacheDir(), 'loaders', 'fabric');
  }

  public async getCompatibleVersions(minecraftVersion: string): Promise<LoaderVersionInfo[]> {
    const cacheFile = path.join(this.cacheDir, `versions-${minecraftVersion}.json`);
    await fs.mkdir(this.cacheDir, { recursive: true });

    try {
      const url = `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(minecraftVersion)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'FernClient/1.0.0 (contact@fernclient.net)' },
      });

      if (res.ok) {
        const data = (await res.json()) as FabricLoaderApiResponse[];
        const versions: LoaderVersionInfo[] = data.map((item) => ({
          id: item.loader.version,
          version: item.loader.version,
          gameVersion: minecraftVersion,
          stable: item.loader.stable,
          mavenCoordinate: item.loader.maven,
        }));

        await fs.writeFile(cacheFile, JSON.stringify(versions), 'utf-8');
        return versions;
      }
    } catch (err) {
      this.logger.warn('FabricLoader', `Failed to fetch Fabric versions for ${minecraftVersion} from meta:`, err);
    }

    // Check disk cache
    try {
      const cached = await fs.readFile(cacheFile, 'utf-8');
      return JSON.parse(cached);
    } catch {
      // Offline fallback: provide standard recent Fabric loader versions
      return [
        { id: '0.16.10', version: '0.16.10', gameVersion: minecraftVersion, stable: true },
        { id: '0.16.9', version: '0.16.9', gameVersion: minecraftVersion, stable: true },
        { id: '0.15.11', version: '0.15.11', gameVersion: minecraftVersion, stable: true },
      ];
    }
  }

  public async install(
    installation: Installation,
    loaderVersion: string,
    onProgress?: (step: string, percentage: number) => void
  ): Promise<ModLoaderInstallResult> {
    onProgress?.('Fetching Fabric profile metadata...', 10);
    this.logger.info('FabricLoader', `Installing Fabric ${loaderVersion} for MC ${installation.minecraftVersion}`);

    const url = `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(
      installation.minecraftVersion
    )}/${encodeURIComponent(loaderVersion)}/profile/json`;

    let profileData: any;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'FernClient/1.0.0 (contact@fernclient.net)' },
      });
      if (!res.ok) {
        throw new Error(`Fabric meta returned status ${res.status}`);
      }
      profileData = await res.json();
    } catch (err) {
      this.logger.warn('FabricLoader', 'Could not fetch Fabric profile json from network, constructing fallback:', err);
      profileData = this.buildFallbackProfile(installation.minecraftVersion, loaderVersion);
    }

    // Save profile metadata in versions/
    const fabricVersionId = `fabric-loader-${loaderVersion}-${installation.minecraftVersion}`;
    const versionDir = path.join(this.pathManager.getVersionsDir(), fabricVersionId);
    await fs.mkdir(versionDir, { recursive: true });
    await fs.writeFile(path.join(versionDir, `${fabricVersionId}.json`), JSON.stringify(profileData, null, 2));

    // Resolve and download loader libraries
    const librariesDir = this.pathManager.getLibrariesDir();
    const downloadItems: BatchDownloadItem[] = [];

    if (profileData.libraries && Array.isArray(profileData.libraries)) {
      for (const lib of profileData.libraries) {
        const mavenPath = this.mavenCoordinateToPath(lib.name);
        const dest = path.join(librariesDir, mavenPath);
        const baseUrl = lib.url || 'https://maven.fabricmc.net/';
        const fileUrl = `${baseUrl.replace(/\/$/, '')}/${mavenPath}`;

        downloadItems.push({
          id: lib.name,
          url: fileUrl,
          destination: dest,
          category: 'libraries',
        });
      }
    }

    onProgress?.('Downloading Fabric loader libraries...', 30);
    if (downloadItems.length > 0) {
      try {
        await this.downloadManager.downloadBatch(`fabric-${loaderVersion}`, downloadItems, {
          concurrency: 8,
          stepName: 'Downloading Fabric libraries',
        });
      } catch (err) {
        this.logger.warn('FabricLoader', 'Error while downloading some Fabric libraries:', err);
      }
    }

    onProgress?.('Fabric installation complete.', 100);

    return {
      success: true,
      loaderType: 'fabric',
      loaderVersion,
      minecraftVersion: installation.minecraftVersion,
      installedLibrariesCount: downloadItems.length,
      message: `Fabric ${loaderVersion} installed successfully.`,
    };
  }

  public async validate(installation: Installation): Promise<boolean> {
    if (!installation.loaderVersion) return false;
    const fabricVersionId = `fabric-loader-${installation.loaderVersion}-${installation.minecraftVersion}`;
    const profilePath = path.join(this.pathManager.getVersionsDir(), fabricVersionId, `${fabricVersionId}.json`);
    try {
      await fs.access(profilePath);
      return true;
    } catch {
      return false;
    }
  }

  public async getLaunchInfo(installation: Installation): Promise<ModLoaderLaunchInfo> {
    const loaderVersion = installation.loaderVersion || '0.16.10';
    const fabricVersionId = `fabric-loader-${loaderVersion}-${installation.minecraftVersion}`;
    const profilePath = path.join(this.pathManager.getVersionsDir(), fabricVersionId, `${fabricVersionId}.json`);

    let profile: any;
    try {
      const data = await fs.readFile(profilePath, 'utf-8');
      profile = JSON.parse(data);
    } catch {
      profile = this.buildFallbackProfile(installation.minecraftVersion, loaderVersion);
    }

    const libraries: ModLoaderLibrary[] = [];
    if (profile.libraries && Array.isArray(profile.libraries)) {
      for (const lib of profile.libraries) {
        libraries.push({
          name: lib.name,
          url: lib.url ? `${lib.url.replace(/\/$/, '')}/${this.mavenCoordinateToPath(lib.name)}` : undefined,
        });
      }
    }

    return {
      libraries,
      mainClass: profile.mainClass || 'net.fabricmc.loader.impl.launch.knot.KnotClient',
      jvmArguments: ['-DFabricMcEmu= net.minecraft.client.main.Main'],
    };
  }

  private mavenCoordinateToPath(coordinate: string): string {
    const parts = coordinate.split(':');
    if (parts.length < 3) return coordinate.replace(/[:]/g, '/') + '.jar';
    const group = parts[0].replace(/\./g, '/');
    const artifact = parts[1];
    const version = parts[2];
    const classifier = parts[3] ? `-${parts[3]}` : '';
    return `${group}/${artifact}/${version}/${artifact}-${version}${classifier}.jar`;
  }

  private buildFallbackProfile(minecraftVersion: string, loaderVersion: string): any {
    return {
      id: `fabric-loader-${loaderVersion}-${minecraftVersion}`,
      inheritsFrom: minecraftVersion,
      mainClass: 'net.fabricmc.loader.impl.launch.knot.KnotClient',
      libraries: [
        { name: `net.fabricmc:fabric-loader:${loaderVersion}`, url: 'https://maven.fabricmc.net/' },
        { name: 'net.fabricmc:sponge-mixin:0.15.3+mixin.0.8.7', url: 'https://maven.fabricmc.net/' },
        { name: 'net.fabricmc:intermediary:' + minecraftVersion, url: 'https://maven.fabricmc.net/' },
        { name: 'org.ow2.asm:asm:9.7.1', url: 'https://repo1.maven.org/maven2/' },
        { name: 'org.ow2.asm:asm-analysis:9.7.1', url: 'https://repo1.maven.org/maven2/' },
        { name: 'org.ow2.asm:asm-commons:9.7.1', url: 'https://repo1.maven.org/maven2/' },
        { name: 'org.ow2.asm:asm-tree:9.7.1', url: 'https://repo1.maven.org/maven2/' },
        { name: 'org.ow2.asm:asm-util:9.7.1', url: 'https://repo1.maven.org/maven2/' },
      ],
    };
  }
}
