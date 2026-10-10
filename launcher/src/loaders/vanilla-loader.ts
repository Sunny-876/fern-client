import { IModLoader } from './loader-interface';
import { ModLoaderType, Installation } from '../../../shared/models/installation';
import {
  LoaderVersionInfo,
  ModLoaderLaunchInfo,
  ModLoaderInstallResult,
} from '../../../shared/models/loader';

export class VanillaLoader implements IModLoader {
  public readonly id: ModLoaderType = 'vanilla';
  public readonly name = 'Vanilla';

  public async getCompatibleVersions(_minecraftVersion: string): Promise<LoaderVersionInfo[]> {
    return [];
  }

  public async install(
    installation: Installation,
    _loaderVersion: string
  ): Promise<ModLoaderInstallResult> {
    return {
      success: true,
      loaderType: 'vanilla',
      loaderVersion: 'vanilla',
      minecraftVersion: installation.minecraftVersion,
      installedLibrariesCount: 0,
      message: 'Vanilla requires no extra loader installation.',
    };
  }

  public async validate(_installation: Installation): Promise<boolean> {
    return true;
  }

  public async getLaunchInfo(_installation: Installation): Promise<ModLoaderLaunchInfo> {
    return {
      libraries: [],
      mainClass: 'net.minecraft.client.main.Main',
    };
  }
}
