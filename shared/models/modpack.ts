import { ModLoaderType } from './installation';

export interface ModpackModItem {
  id: string;
  name: string;
  version: string;
  downloadUrl?: string;
  fileName: string;
  fileSize?: number;
  sha1?: string;
}

export interface ModpackManifest {
  formatVersion: number;
  game: 'minecraft';
  id: string;
  name: string;
  versionId: string;
  version: string;
  summary?: string;
  author?: string;
  minecraftVersion: string;
  loader: ModLoaderType;
  loaderVersion: string;
  mods: ModpackModItem[];
  resourcePacks?: string[];
  shaderPacks?: string[];
  configs?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface ModpackImportProgress {
  stage: 'extracting' | 'manifest' | 'minecraft' | 'loader' | 'mods' | 'dependencies' | 'complete';
  percentage: number;
  message: string;
  currentFile?: string;
  totalFiles?: number;
  completedFiles?: number;
}
