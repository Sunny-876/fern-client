import * as os from 'os';
import { RamRecommendation } from '../../../../shared/models/performance';
import { ModLoaderType } from '../../../../shared/models/installation';

export interface RamAdvisorInput {
  systemTotalRamMb?: number;
  minecraftVersion: string;
  loader: ModLoaderType;
  modCount: number;
}

export class RamAdvisor {
  public calculateRecommendation(input: RamAdvisorInput): RamRecommendation {
    const systemTotalMb = input.systemTotalRamMb || Math.round(os.totalmem() / (1024 * 1024));
    const modCount = Math.max(0, input.modCount || 0);
    const isVanilla = input.loader === 'vanilla' && modCount === 0;

    let category: 'vanilla' | 'light_modded' | 'medium_modded' | 'heavy_modded';
    let minMb: number;
    let maxMb: number;
    let reason: string;

    if (isVanilla) {
      category = 'vanilla';
      minMb = 2048;
      maxMb = 4096;
      reason = 'Vanilla Minecraft runs optimally with 3-4 GB RAM. Allocating more than 4 GB on vanilla often causes unnecessary GC overhead.';
    } else if (modCount <= 20) {
      category = 'light_modded';
      minMb = 3072;
      maxMb = 5120;
      reason = `Light mod setup (${modCount} mods). 4-5 GB RAM provides plenty of heap for mod assets and block entities while maintaining low GC pause times.`;
    } else if (modCount <= 60) {
      category = 'medium_modded';
      minMb = 4096;
      maxMb = 6144;
      reason = `Medium modpack (${modCount} mods). 5-6 GB RAM is recommended to support custom dimensions, entity models, and item registries.`;
    } else {
      category = 'heavy_modded';
      minMb = 6144;
      maxMb = 8192;
      reason = `Heavy modpack (${modCount} mods). 6-8 GB RAM is recommended to handle extensive worldgen, hundreds of mod dependencies, and large texture caches.`;
    }

    // Safety boundary: reserve at least 2500 MB or 25% of system RAM for the operating system and GPU buffers
    const maxSafeSystemAllocationMb = Math.max(2048, Math.min(Math.round(systemTotalMb * 0.75), systemTotalMb - 2500));
    let isConstrained = false;

    if (maxMb > maxSafeSystemAllocationMb) {
      maxMb = maxSafeSystemAllocationMb;
      minMb = Math.min(minMb, Math.max(1536, maxMb - 1024));
      isConstrained = true;
      reason += ` (Constrained by total system memory: ${Math.round(systemTotalMb / 1024)} GB detected; leaving sufficient headroom for Windows).`;
    }

    return {
      recommendedMinMb: minMb,
      recommendedMaxMb: maxMb,
      systemTotalMb,
      modCount,
      category,
      reason,
      isConstrained,
    };
  }
}
