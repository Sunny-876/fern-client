import * as fs from 'fs';
import * as path from 'path';
import { PerformanceSettings } from '../../../../shared/models/performance';
import { FernLogger } from '../../core/logger';

export class OptionsSyncer {
  constructor(private logger?: FernLogger) {}

  /**
   * Synchronizes Fern performance settings with Minecraft's options.txt file in the instance directory.
   * Preserves all other user options (keybinds, sensitivity, audio, fov, etc.).
   */
  public async syncOptions(gameDir: string, settings: PerformanceSettings): Promise<void> {
    const optionsPath = path.join(gameDir, 'options.txt');
    let lines: string[] = [];

    if (fs.existsSync(optionsPath)) {
      try {
        const raw = await fs.promises.readFile(optionsPath, 'utf8');
        lines = raw.split(/\r?\n/);
      } catch (err) {
        this.logger?.warn('OptionsSyncer', 'Failed to read existing options.txt, creating fresh:', err);
      }
    }

    // Convert lines to a map for easy key-value updates
    const optionsMap: Map<string, string> = new Map();
    for (const line of lines) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        optionsMap.set(key, value);
      }
    }

    // Map Fern performance settings to Minecraft standard options
    optionsMap.set('renderDistance', String(settings.chunkRenderDistance));
    optionsMap.set('simulationDistance', String(settings.simulationDistance));
    optionsMap.set('enableVsync', settings.vsync ? 'true' : 'false');
    optionsMap.set('maxFps', String(settings.fpsLimit));
    optionsMap.set('entityDistanceScaling', settings.entityDistanceScaling.toFixed(1));

    // Particle setting: 0 = all, 1 = decreased, 2 = minimal
    let particleVal = '0';
    if (settings.particles === 'minimal') particleVal = '2';
    else if (settings.particles === 'decreased') particleVal = '1';
    optionsMap.set('particles', particleVal);

    // Clouds
    optionsMap.set('clouds', settings.clouds ? 'true' : 'false');

    // Graphics mode: 1 = fast, 2 = fancy
    if (settings.profile === 'potato') {
      optionsMap.set('graphicsMode', '1'); // fast
      optionsMap.set('ambientOcclusion', '0'); // off
    } else if (settings.profile === 'balanced') {
      optionsMap.set('graphicsMode', '2'); // fancy
      optionsMap.set('ambientOcclusion', '2');
    }

    // Rebuild options file
    const outputLines: string[] = [];
    for (const [k, v] of optionsMap.entries()) {
      outputLines.push(`${k}:${v}`);
    }

    try {
      await fs.promises.writeFile(optionsPath, outputLines.join('\n') + '\n', 'utf8');
      this.logger?.info('OptionsSyncer', `Synchronized performance options for profile: ${settings.profile}`);
    } catch (err) {
      this.logger?.warn('OptionsSyncer', 'Failed to write options.txt:', err);
    }
  }
}
