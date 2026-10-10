export interface FernProfile {
  id: string;
  name: string;
  accountId?: string;
  installationId: string;
  minecraftVersion: string;
  javaPath?: string;
  ramMb: number;
  mods: string[];
  resourcePacks: string[];
  shaderPacks: string[];
  settings: Record<string, unknown>;
  launchArguments: string[];
  createdAt: number;
  updatedAt: number;
}

export interface CreateProfileDTO {
  name: string;
  accountId?: string;
  installationId: string;
  minecraftVersion: string;
  javaPath?: string;
  ramMb?: number;
  mods?: string[];
  resourcePacks?: string[];
  shaderPacks?: string[];
  settings?: Record<string, unknown>;
  launchArguments?: string[];
}
