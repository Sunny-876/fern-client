import * as fs from 'fs';
import * as path from 'path';
import { NotificationManager } from '../../notifications/NotificationManager';
import { EventBus } from '../../events/EventBus';

export interface ScreenshotEntry {
  id: string;
  filename: string;
  fullPath: string;
  timestamp: number;
  sizeBytes: number;
  formattedDate: string;
}

export class ScreenshotManager {
  private screenshotsDir: string;
  private entries: Map<string, ScreenshotEntry> = new Map();

  constructor(
    instanceGameDir: string,
    private notificationManager?: NotificationManager,
    private eventBus?: EventBus
  ) {
    this.screenshotsDir = path.join(instanceGameDir, 'screenshots');
  }

  public getScreenshotDirectory(): string {
    return this.screenshotsDir;
  }

  public getAllScreenshots(): ScreenshotEntry[] {
    return Array.from(this.entries.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  public getScreenshot(idOrFilename: string): ScreenshotEntry | undefined {
    const direct = this.entries.get(idOrFilename);
    if (direct) return direct;
    return Array.from(this.entries.values()).find(
      (s) => s.filename.toLowerCase() === idOrFilename.toLowerCase()
    );
  }

  /**
   * Scans the screenshots directory on disk to populate history.
   */
  public async scanDirectory(): Promise<ScreenshotEntry[]> {
    if (!fs.existsSync(this.screenshotsDir)) {
      try {
        await fs.promises.mkdir(this.screenshotsDir, { recursive: true });
      } catch {
        return [];
      }
    }

    try {
      const files = await fs.promises.readdir(this.screenshotsDir);
      for (const file of files) {
        if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
        const fullPath = path.join(this.screenshotsDir, file);
        try {
          const stat = await fs.promises.stat(fullPath);
          const id = `ss_${file.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          if (!this.entries.has(id)) {
            this.entries.set(id, {
              id,
              filename: file,
              fullPath,
              timestamp: stat.mtimeMs,
              sizeBytes: stat.size,
              formattedDate: new Date(stat.mtimeMs).toLocaleString(),
            });
          }
        } catch {
          // File stat error ignored
        }
      }
    } catch (err) {
      console.warn('[ScreenshotManager] Failed to read screenshots dir:', err);
    }

    return this.getAllScreenshots();
  }

  /**
   * Records a newly taken screenshot and sends in-game notification.
   */
  public recordScreenshot(filenameOrPath: string, sizeBytes = 0, timestamp?: number): ScreenshotEntry {
    const filename = path.basename(filenameOrPath);
    const fullPath = path.isAbsolute(filenameOrPath)
      ? filenameOrPath
      : path.join(this.screenshotsDir, filename);

    const now = timestamp ?? Date.now();
    const id = `ss_${now}_${Math.random().toString(36).slice(2, 6)}`;
    const entry: ScreenshotEntry = {
      id,
      filename,
      fullPath,
      timestamp: now,
      sizeBytes,
      formattedDate: new Date(now).toLocaleString(),
    };

    this.entries.set(id, entry);

    if (this.notificationManager) {
      this.notificationManager.notify(`Screenshot saved: ${filename}`, 'success', 3000);
    }

    if (this.eventBus) {
      this.eventBus.emit('screenshot_taken', { entry });
    }

    return entry;
  }

  /**
   * Deletes a screenshot file locally.
   */
  public async deleteScreenshot(idOrFilename: string): Promise<boolean> {
    const entry = this.getScreenshot(idOrFilename);
    if (!entry) return false;

    this.entries.delete(entry.id);

    try {
      if (fs.existsSync(entry.fullPath)) {
        await fs.promises.unlink(entry.fullPath);
      }
      return true;
    } catch (err) {
      console.error(`[ScreenshotManager] Failed to delete file ${entry.fullPath}:`, err);
      return false;
    }
  }

  public clearHistory(): void {
    this.entries.clear();
  }
}
