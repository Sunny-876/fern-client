import { ModLoaderType } from './installation';

export type ModDependencyType = 'required' | 'optional' | 'incompatible';

export interface ModDependency {
  id: string;
  name?: string;
  versionRequirement?: string;
  type: ModDependencyType;
  resolved?: boolean;
}

export interface Mod {
  id: string;
  name: string;
  version: string;
  summary?: string;
  minecraftVersions: string[];
  loaders: ModLoaderType[];
  filePath: string;
  fileName: string;
  enabled: boolean;
  source?: 'modrinth' | 'curseforge' | 'local';
  iconUrl?: string;
  dependencies?: ModDependency[];
  optionalDependencies?: ModDependency[];
  installedAt: number;
  fileSize?: number;
}

export interface ModSearchOptions {
  query?: string;
  minecraftVersion?: string;
  loader?: ModLoaderType;
  category?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'downloads' | 'follows' | 'newest' | 'updated';
}

export interface ModSearchResultItem {
  id: string;
  slug: string;
  name: string;
  summary: string;
  author: string;
  iconUrl?: string;
  downloads: number;
  follows: number;
  categories: string[];
  loaders: string[];
  gameVersions: string[];
  dateUpdated: string;
}

export interface ModSearchResult {
  totalHits: number;
  items: ModSearchResultItem[];
  offset: number;
  limit: number;
}

export interface ModVersionFile {
  url: string;
  filename: string;
  primary: boolean;
  size: number;
  sha1?: string;
  sha512?: string;
}

export interface ModVersionDetails {
  id: string;
  projectId: string;
  name: string;
  versionNumber: string;
  gameVersions: string[];
  loaders: string[];
  files: ModVersionFile[];
  dependencies: Array<{
    projectId?: string;
    versionId?: string;
    dependencyType: ModDependencyType;
  }>;
}

export interface ConflictValidationResult {
  hasConflicts: boolean;
  warnings: string[];
  incompatibleMods: Array<{
    modName: string;
    reason: string;
  }>;
  missingDependencies: Array<{
    modName: string;
    requiredDependency: string;
  }>;
}
