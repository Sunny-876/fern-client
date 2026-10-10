import * as os from 'os';
import { exec } from 'child_process';
import { SystemHardwareInfo } from '../../../../shared/models/performance';

export class GpuDetector {
  private cachedInfo: SystemHardwareInfo | null = null;

  public async getHardwareInfo(): Promise<SystemHardwareInfo> {
    if (this.cachedInfo) {
      return { ...this.cachedInfo };
    }

    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : 'Unknown CPU';
    const cpuCores = cpus.length;
    const totalRamMb = Math.round(os.totalmem() / (1024 * 1024));
    const freeRamMb = Math.round(os.freemem() / (1024 * 1024));
    const osPlatform = os.platform();
    const osRelease = os.release();

    let gpuRenderer: string | undefined;
    let gpuVramMb: number | undefined;

    if (osPlatform === 'win32') {
      try {
        const gpuData = await this.queryWindowsGpu();
        if (gpuData.name) {
          gpuRenderer = gpuData.name;
          gpuVramMb = gpuData.vramMb;
        }
      } catch {
        // Fallback silently if wmic/powershell is restricted
      }
    }

    this.cachedInfo = {
      cpuModel,
      cpuCores,
      totalRamMb,
      freeRamMb,
      osPlatform,
      osRelease,
      gpuRenderer: gpuRenderer || 'DirectX 12 / Vulkan Compatible GPU',
      gpuVramMb: gpuVramMb || 4096,
    };

    return { ...this.cachedInfo };
  }

  private queryWindowsGpu(): Promise<{ name?: string; vramMb?: number }> {
    return new Promise((resolve) => {
      exec('wmic path win32_VideoController get caption,AdapterRAM', { timeout: 3000 }, (err, stdout) => {
        if (err || !stdout) {
          return resolve({});
        }

        const lines = stdout.trim().split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length <= 1) return resolve({});

        // lines[0] is header "AdapterRAM Caption"
        const dataLine = lines[1];
        const match = dataLine.match(/^(\d+)?\s+(.+)$/);
        if (match) {
          const rawRam = parseInt(match[1], 10);
          const name = match[2];
          const vramMb = rawRam > 0 ? Math.round(rawRam / (1024 * 1024)) : undefined;
          return resolve({ name, vramMb });
        }

        resolve({ name: dataLine });
      });
    });
  }
}
