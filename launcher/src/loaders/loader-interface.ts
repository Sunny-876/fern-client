import { ModLoaderType, Installation } from '../../../shared/models/installation';
import {
  LoaderVersionInfo,
  ModLoaderLaunchInfo,
  ModLoaderInstallResult,
} from '../../../shared/models/loader';

export interface IModLoader {
  readonly id: ModLoaderType;
  readonly name: string;

  /**
   * Retrieves compatible versions of this loader for the given Minecraft version.
   */
  getCompatibleVersions(minecraftVersion: string): Promise<LoaderVersionInfo[]>;

  /**
   * Installs necessary loader files (libraries, manifests) for the given installation.
   */
  install(
    installation: Installation,
    loaderVersion: string,
    onProgress?: (step: string, percentage: number) => void
  ): Promise<ModLoaderInstallResult>;

  /**
   * Validates whether the loader components are properly installed and ready.
   */
  validate(installation: Installation): Promise<boolean>;

  /**
   * Returns launch classpath libraries, mainClass, and launch arguments for this loader.
   */
  getLaunchInfo(installation: Installation): Promise<ModLoaderLaunchInfo>;
}
