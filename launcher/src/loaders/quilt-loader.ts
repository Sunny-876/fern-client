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

interface QuiltLoaderApiResponse {
  loader: {
    separator: string;
    build: number;
    maven: string;
    version: string;
  };
}

export class QuiltLoader implements IModLoader {
  public readonly id: ModLoaderType = 'quilt';
  public readonly name = 'Quilt';

  private cacheDir: string;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger,
    private downloadManager: DownloadManager
  ) {
    this.cacheDir = path.join(this.pathManager.getCacheDir(), 'loaders', 'quilt');
  }

  public async getCompatibleVersions(minecraftVersion: string): Promise<LoaderVersionInfo[]> {
    const cacheFile = path.join(this.cacheDir, `versions-${minecraftVersion}.json`);
    await fs.mkdir(this.cacheDir, { recursive: true });

    try {
      const url = `https://meta.quiltmc.org/v3/versions/loader/${encodeURIComponent(minecraftVersion)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'FernClient/1.0.0 (contact@fernclient.net)' },
      });

      if (res.ok) {
        const data = (await res.json()) as QuiltLoaderApiResponse[];
        const versions: LoaderVersionInfo[] = data.map((item) => ({
          id: item.loader.version,
          version: item.loader.version,
          gameVersion: minecraftVersion,
          stable: true,
          mavenCoordinate: item.loader.maven,
        }));

        await fs.writeFile(cacheFile, JSON.stringify(versions), 'utf-8');
        return versions;
      }
    } catch (err) {
      this.logger.warn('QuiltLoader', `Failed to fetch Quilt versions for ${minecraftVersion}:`, err);
    }

    try {
      const cached = await fs.readFile(cacheFile, 'utf-8');
      return JSON.parse(cached);
    } catch {
      return [
        { id: '0.26.4', version: '0.26.4', gameVersion: minecraftVersion, stable: true },
        { id: '0.26.3', version: '0.26.3', gameVersion: minecraftVersion, stable: true },
      ];
    }
  }

  public async install(
    installation: Installation,
    loaderVersion: string,
    onProgress?: (step: string, percentage: number) => void
  ): Promise<ModLoaderInstallResult> {
    onProgress?.('Fetching Quilt profile metadata...', 10);
    this.logger.info('QuiltLoader', `Installing Quilt ${loaderVersion} for MC ${installation.minecraftVersion}`);

    const url = `https://meta.quiltmc.org/v3/versions/loader/${encodeURIComponent(
      installation.minecraftVersion
    )}/${encodeURIComponent(loaderVersion)}/profile/json`;

    let profileData: any;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'FernClient/1.0.0 (contact@fernclient.net)' },
      });
      if (!res.ok) throw new Error(`Quilt meta returned status ${res.status}`);
      profileData = await res.json();
    } catch (err) {
      this.logger.warn('QuiltLoader', 'Could not fetch Quilt profile json from network, constructing fallback:', err);
      profileData = this.buildFallbackProfile(installation.minecraftVersion, loaderVersion);
    }

    const quiltVersionId = `quilt-loader-${loaderVersion}-${installation.minecraftVersion}`;
    const versionDir = path.join(this.pathManager.getVersionsDir(), quiltVersionId);
    await fs.mkdir(versionDir, { recursive: true });
    await fs.writeFile(path.join(versionDir, `${quiltVersionId}.json`), JSON.stringify(profileData, null, 2));

    const librariesDir = this.pathManager.getLibrariesDir();
    const downloadItems: BatchDownloadItem[] = [];

    if (profileData.libraries && Array.isArray(profileData.libraries)) {
      for (const lib of profileData.libraries) {
        const mavenPath = this.mavenCoordinateToPath(lib.name);
        const dest = path.join(librariesDir, mavenPath);
        const baseUrl = lib.url || 'https://maven.quiltmc.org/repository/release/';
        const fileUrl = `${baseUrl.replace(/\/$/, '')}/${mavenPath}`;

        downloadItems.push({
          id: lib.name,
          url: fileUrl,
          destination: dest,
          category: 'libraries',
        });
      }
    }

    onProgress?.('Downloading Quilt loader libraries...', 30);
    if (downloadItems.length > 0) {
      try {
        await this.downloadManager.downloadBatch(`quilt-${loaderVersion}`, downloadItems, {
          concurrency: 8,
          stepName: 'Downloading Quilt libraries',
        });
      } catch (err) {
        this.logger.warn('QuiltLoader', 'Error while downloading some Quilt libraries:', err);
      }
    }

    onProgress?.('Quilt installation complete.', 100);

    return {
      success: true,
      loaderType: 'quilt',
      loaderVersion,
      minecraftVersion: installation.minecraftVersion,
      installedLibrariesCount: downloadItems.length,
      message: `Quilt ${loaderVersion} installed successfully.`,
    };
  }

  public async validate(installation: Installation): Promise<boolean> {
    if (!installation.loaderVersion) return false;
    const quiltVersionId = `quilt-loader-${installation.loaderVersion}-${installation.minecraftVersion}`;
    const profilePath = path.join(this.pathManager.getVersionsDir(), quiltVersionId, `${quiltVersionId}.json`);
    try {
      await fs.access(profilePath);
      return true;
    } catch {
      return false;
    }
  }

  public async getLaunchInfo(installation: Installation): Promise<ModLoaderLaunchInfo> {
    const loaderVersion = installation.loaderVersion || '0.26.4';
    const quiltVersionId = `quilt-loader-${loaderVersion}-${installation.minecraftVersion}`;
    const profilePath = path.join(this.pathManager.getVersionsDir(), quiltVersionId, `${quiltVersionId}.json`);

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
      mainClass: profile.mainClass || 'org.quiltmc.loader.impl.launch.knot.KnotClient',
      jvmArguments: [],
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
      id: `quilt-loader-${loaderVersion}-${minecraftVersion}`,
      inheritsFrom: minecraftVersion,
      mainClass: 'org.quiltmc.loader.impl.launch.knot.KnotClient',
      libraries: [
        { name: `org.quiltmc:quilt-loader:${loaderVersion}`, url: 'https://maven.quiltmc.org/repository/release/' },
        { name: 'org.quiltmc:sponge-mixin:0.15.3+mixin.0.8.7', url: 'https://maven.quiltmc.org/repository/release/' },
        { name: 'org.quiltmc:intermediary:' + minecraftVersion, url: 'https://maven.quiltmc.org/repository/release/' },
        { name: 'org.ow2.asm:asm:9.7.1', url: 'https://repo1.maven.org/maven2/' },
      ],
    };
  }
}
