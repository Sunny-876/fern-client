export type ModLoaderType = 'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt';

export type InstallationStatus = 'NOT_INSTALLED' | 'INSTALLING' | 'INSTALLED' | 'RUNNING' | 'ERROR';

export interface MemoryAllocation {
  minMb: number;
  maxMb: number;
}

export interface InstallationProgressInfo {
  percentage: number;
  step: string;
  speed?: string;
  eta?: string;
  error?: string;
}

import { PerformanceProfileType, PerformanceSettings } from './performance';

export interface Installation {
  id: string;
  name: string;
  minecraftVersion: string;
  versionId?: string; // Reference to official Minecraft version manifest ID
  loader: ModLoaderType;
  loaderVersion?: string;
  gameDirectory: string;
  javaPath?: string;
  memoryAllocation: MemoryAllocation;
  minMemory?: number; // Shortcut accessor (MB)
  maxMemory?: number; // Shortcut accessor (MB)
  launchArguments: string[];
  jvmArguments?: string[];
  fernProfileId?: string; // Attached Fern Client Profile (HUD/Theme/Modules)
  performanceProfile?: PerformanceProfileType;
  performanceSettings?: Partial<PerformanceSettings>;
  icon?: string;
  status: InstallationStatus;
  installProgress?: InstallationProgressInfo;
  createdAt: number;
  updatedAt: number;
  lastPlayedAt?: number;
  lastPlayed?: number;
  lastSessionDurationSeconds?: number;
}

export interface CreateInstallationDTO {
  name: string;
  minecraftVersion: string;
  versionId?: string;
  loader?: ModLoaderType;
  loaderVersion?: string;
  gameDirectory?: string;
  javaPath?: string;
  memoryAllocation?: Partial<MemoryAllocation>;
  minMemory?: number;
  maxMemory?: number;
  launchArguments?: string[];
  jvmArguments?: string[];
  fernProfileId?: string;
  performanceProfile?: PerformanceProfileType;
  performanceSettings?: Partial<PerformanceSettings>;
}

export interface UpdateInstallationDTO {
  name?: string;
  minecraftVersion?: string;
  versionId?: string;
  loader?: ModLoaderType;
  loaderVersion?: string;
  gameDirectory?: string;
  javaPath?: string;
  memoryAllocation?: Partial<MemoryAllocation>;
  minMemory?: number;
  maxMemory?: number;
  launchArguments?: string[];
  jvmArguments?: string[];
  fernProfileId?: string;
  performanceProfile?: PerformanceProfileType;
  performanceSettings?: Partial<PerformanceSettings>;
  status?: InstallationStatus;
  lastPlayedAt?: number;
  lastSessionDurationSeconds?: number;
}
