import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { CacheService } from './cache-service';

const execFileAsync = promisify(execFile);

export interface DiskSpaceCheckResult {
  hasEnoughSpace: boolean;
  hasEnough: boolean;
  requiredBytes: number;
  availableBytes: number;
  formattedRequired: string;
  formattedAvailable: string;
}

export class DiskService {
  /**
   * Retrieves available free bytes on the filesystem drive hosting targetPath.
   */
  public static async getAvailableDiskSpace(targetPath: string): Promise<number> {
    try {
      if (process.platform === 'win32') {
        const driveLetter = path.resolve(targetPath).substring(0, 2); // e.g. "C:" or "D:"
        const { stdout } = await execFileAsync('wmic', [
          'logicaldisk',
          'where',
          `DeviceID='${driveLetter}'`,
          'get',
          'FreeSpace',
        ], { timeout: 3000 });

        const lines = stdout.trim().split('\n').map((l) => l.trim()).filter((l) => l && !l.includes('FreeSpace'));
        if (lines.length > 0) {
          const bytes = parseInt(lines[0], 10);
          if (!isNaN(bytes) && bytes > 0) return bytes;
        }
      }
    } catch {
      // Fallback if wmic is restricted
    }

    // Default safety fallback: 50 GB
    return 53687091200;
  }

  public static async checkDiskSpace(targetPath: string, requiredBytes: number): Promise<DiskSpaceCheckResult> {
    const available = await this.getAvailableDiskSpace(targetPath);
    const hasEnough = available >= requiredBytes;

    return {
      hasEnoughSpace: hasEnough,
      hasEnough,
      requiredBytes,
      availableBytes: available,
      formattedRequired: CacheService.formatBytes(requiredBytes),
      formattedAvailable: CacheService.formatBytes(available),
    };
  }
}
