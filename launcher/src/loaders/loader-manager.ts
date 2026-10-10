import { IModLoader } from './loader-interface';
import { VanillaLoader } from './vanilla-loader';
import { FabricLoader } from './fabric-loader';
import { QuiltLoader } from './quilt-loader';
import { ForgeLoader } from './forge-loader';
import { NeoForgeLoader } from './neoforge-loader';
import { ModLoaderType, Installation } from '../../../shared/models/installation';
import {
  LoaderVersionInfo,
  ModLoaderLaunchInfo,
  ModLoaderInstallResult,
} from '../../../shared/models/loader';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { DownloadManager } from '../downloads/download-manager';

export class ModLoaderManager {
  private loaders: Map<ModLoaderType, IModLoader> = new Map();

  constructor(
    pathManager: FernPathManager,
    logger: FernLogger,
    downloadManager: DownloadManager
  ) {
    this.registerLoader(new VanillaLoader());
    this.registerLoader(new FabricLoader(pathManager, logger, downloadManager));
    this.registerLoader(new QuiltLoader(pathManager, logger, downloadManager));
    this.registerLoader(new ForgeLoader(pathManager, logger, downloadManager));
    this.registerLoader(new NeoForgeLoader(pathManager, logger, downloadManager));
  }

  public registerLoader(loader: IModLoader): void {
    this.loaders.set(loader.id, loader);
  }

  public getLoader(type: ModLoaderType): IModLoader {
    const loader = this.loaders.get(type);
    if (!loader) {
      throw new Error(`Unsupported mod loader type: ${type}`);
    }
    return loader;
  }

  public getAvailableLoaders(): Array<{ id: ModLoaderType; name: string }> {
    return Array.from(this.loaders.values()).map((l) => ({
      id: l.id,
      name: l.name,
    }));
  }

  public async getCompatibleVersions(
    type: ModLoaderType,
    minecraftVersion: string
  ): Promise<LoaderVersionInfo[]> {
    if (type === 'vanilla') {
      return [];
    }
    const loader = this.getLoader(type);
    return loader.getCompatibleVersions(minecraftVersion);
  }

  public async installLoader(
    installation: Installation,
    loaderVersion: string,
    onProgress?: (step: string, percentage: number) => void
  ): Promise<ModLoaderInstallResult> {
    const loader = this.getLoader(installation.loader);
    return loader.install(installation, loaderVersion, onProgress);
  }

  public async validateLoader(installation: Installation): Promise<boolean> {
    if (installation.loader === 'vanilla') return true;
    const loader = this.getLoader(installation.loader);
    return loader.validate(installation);
  }

  public async getLaunchInfo(installation: Installation): Promise<ModLoaderLaunchInfo> {
    const loader = this.getLoader(installation.loader);
    return loader.getLaunchInfo(installation);
  }

  /**
   * Validates whether a Minecraft version and mod loader combination is fundamentally viable.
   */
  public checkCompatibility(
    minecraftVersion: string,
    loader: ModLoaderType,
    _loaderVersion?: string
  ): { compatible: boolean; reason?: string } {
    if (loader === 'vanilla') {
      return { compatible: true };
    }

    // NeoForge primarily targets MC 1.20.2+
    if (loader === 'neoforge') {
      const parts = minecraftVersion.split('.');
      const minor = parseInt(parts[1] || '0', 10);
      const patch = parseInt(parts[2] || '0', 10);
      if (minor < 20 || (minor === 20 && patch < 2)) {
        return {
          compatible: false,
          reason: `NeoForge requires Minecraft 1.20.2 or higher. Selected Minecraft is ${minecraftVersion}.`,
        };
      }
    }

    return { compatible: true };
  }
}
