export type MinecraftVersionType = 'release' | 'snapshot' | 'old_beta' | 'old_alpha';

export interface MinecraftVersionSummary {
  id: string;
  type: MinecraftVersionType;
  url: string;
  time: string;
  releaseTime: string;
  sha1: string;
  complianceLevel: number;
  isInstalled?: boolean;
}

export interface MinecraftVersionManifest {
  latest: {
    release: string;
    snapshot: string;
  };
  versions: MinecraftVersionSummary[];
}

export interface DownloadArtifact {
  path?: string;
  sha1: string;
  size: number;
  url: string;
}

export interface OSCompatibilityRule {
  action: 'allow' | 'disallow';
  os?: {
    name?: 'windows' | 'osx' | 'linux';
    version?: string;
    arch?: string;
  };
  features?: Record<string, boolean>;
}

export interface LibraryDownloads {
  artifact?: DownloadArtifact;
  classifiers?: Record<string, DownloadArtifact>;
}

export interface MinecraftLibrary {
  name: string;
  downloads?: LibraryDownloads;
  rules?: OSCompatibilityRule[];
  natives?: Record<string, string>;
  extract?: {
    exclude?: string[];
  };
}

export interface AssetIndexInfo {
  id: string;
  sha1: string;
  size: number;
  totalSize: number;
  url: string;
}

export interface AssetObject {
  hash: string;
  size: number;
}

export interface AssetIndexPayload {
  objects: Record<string, AssetObject>;
}

export interface ArgumentRule {
  rules: OSCompatibilityRule[];
  value: string | string[];
}

export type ArgumentEntry = string | ArgumentRule;

export interface MinecraftArgumentsStructure {
  game?: ArgumentEntry[];
  jvm?: ArgumentEntry[];
}

export interface MinecraftVersionPackage {
  id: string;
  type: MinecraftVersionType;
  mainClass: string;
  minecraftArguments?: string;
  arguments?: MinecraftArgumentsStructure;
  assetIndex: AssetIndexInfo;
  assets: string;
  complianceLevel: number;
  downloads: {
    client: DownloadArtifact;
    client_mappings?: DownloadArtifact;
    server?: DownloadArtifact;
    server_mappings?: DownloadArtifact;
  };
  javaVersion?: {
    component: string;
    majorVersion: number;
  };
  libraries: MinecraftLibrary[];
  releaseTime: string;
  time: string;
}
