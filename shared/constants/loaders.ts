import { ModLoaderType } from '../models/installation';

export interface LoaderInfo {
  id: ModLoaderType;
  name: string;
  description: string;
  supported: boolean;
  minMinecraftVersion: string;
}

export const MOD_LOADERS: Record<ModLoaderType, LoaderInfo> = {
  vanilla: {
    id: 'vanilla',
    name: 'Vanilla',
    description: 'Official unmodified Minecraft Java Edition runtime',
    supported: true,
    minMinecraftVersion: '1.0.0',
  },
  fabric: {
    id: 'fabric',
    name: 'Fabric',
    description: 'Lightweight, experimental mod loader focused on speed and modern APIs',
    supported: true,
    minMinecraftVersion: '1.14.0',
  },
  forge: {
    id: 'forge',
    name: 'Minecraft Forge',
    description: 'Long-standing modding API powering thousands of classic mods',
    supported: true,
    minMinecraftVersion: '1.7.10',
  },
  neoforge: {
    id: 'neoforge',
    name: 'NeoForge',
    description: 'Modern community-driven fork of Minecraft Forge for 1.20.2+',
    supported: true,
    minMinecraftVersion: '1.20.2',
  },
  quilt: {
    id: 'quilt',
    name: 'Quilt',
    description: 'Community-driven modular mod loader compatible with Fabric mods',
    supported: true,
    minMinecraftVersion: '1.14.0',
  },
};
