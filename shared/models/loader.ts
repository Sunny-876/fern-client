import { ModLoaderType } from './installation';

export interface LoaderVersionInfo {
  id: string;
  version: string;
  gameVersion: string;
  stable: boolean;
  releaseTime?: string;
  mavenCoordinate?: string;
}

export interface ModLoaderLibrary {
  name: string;
  url?: string;
  sha1?: string;
  size?: number;
}

export interface ModLoaderLaunchInfo {
  libraries: ModLoaderLibrary[];
  mainClass: string;
  jvmArguments?: string[];
  gameArguments?: string[];
}

export interface ModLoaderInstallResult {
  success: boolean;
  loaderType: ModLoaderType;
  loaderVersion: string;
  minecraftVersion: string;
  installedLibrariesCount: number;
  message?: string;
}
