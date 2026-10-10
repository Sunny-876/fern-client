import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { calculateFileHash } from '../../../shared/utilities/hash-utils';
import { FernLogger } from '../core/logger';
import { FernError, FernErrorCode } from '../core/errors';

export interface BatchDownloadItem {
  id: string;
  url: string;
  destination: string;
  size?: number;
  expectedSha1?: string;
  category?: string; // 'client' | 'libraries' | 'assets'
}

export interface BatchProgressUpdate {
  batchId: string;
  step: string;
  totalFiles: number;
  completedFiles: number;
  totalBytes: number;
  transferredBytes: number;
  percentage: number;
  speedFormatted: string;
  etaFormatted: string;
  status: 'downloading' | 'completed' | 'cancelled' | 'failed';
  error?: string;
}

export type BatchProgressListener = (update: BatchProgressUpdate) => void;

export class DownloadManager {
  private activeControllers: Map<string, AbortController> = new Map();
  private listeners: Set<BatchProgressListener> = new Set();
  private downloadQueue: BatchDownloadItem[] = [];

  constructor(private logger: FernLogger) {}

  public enqueue(items: BatchDownloadItem | BatchDownloadItem[]): void {
    const list = Array.isArray(items) ? items : [items];
    for (const item of list) {
      // Deduplicate by URL or Destination path
      const exists = this.downloadQueue.some(
        (q) => q.url === item.url || path.normalize(q.destination) === path.normalize(item.destination)
      );
      if (!exists) {
        this.downloadQueue.push(item);
      }
    }
  }

  public getQueue(): BatchDownloadItem[] {
    return [...this.downloadQueue];
  }

  public clearQueue(): void {
    this.downloadQueue = [];
  }

  public getQueueSummary(): {
    totalItems: number;
    totalSizeBytes: number;
    categories: Record<string, number>;
  } {
    const categories: Record<string, number> = {
      minecraft: 0,
      libraries: 0,
      mods: 0,
      resourcepacks: 0,
      java: 0,
    };
    let totalSizeBytes = 0;

    for (const item of this.downloadQueue) {
      totalSizeBytes += item.size || 0;
      const cat = (item.category || 'minecraft').toLowerCase();
      categories[cat] = (categories[cat] || 0) + 1;
    }

    return {
      totalItems: this.downloadQueue.length,
      totalSizeBytes,
      categories,
    };
  }

  public onBatchProgress(listener: BatchProgressListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public cancelBatch(batchId: string): void {
    const controller = this.activeControllers.get(batchId);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(batchId);
      this.logger.info('DownloadManager', `Cancelled batch download: ${batchId}`);
      this.notify({
        batchId,
        step: 'Cancelled by user',
        totalFiles: 0,
        completedFiles: 0,
        totalBytes: 0,
        transferredBytes: 0,
        percentage: 0,
        speedFormatted: '0 KB/s',
        etaFormatted: '--',
        status: 'cancelled',
      });
    }
  }

  public isBatchActive(batchId: string): boolean {
    return this.activeControllers.has(batchId);
  }

  /**
   * Downloads multiple files with parallel concurrency, live aggregated progress,
   * verification, and cancellation.
   */
  public async downloadBatch(
    batchId: string,
    items: BatchDownloadItem[],
    options: {
      concurrency?: number;
      stepName?: string;
      maxRetries?: number;
    } = {}
  ): Promise<void> {
    const concurrency = options.concurrency ?? 10;
    const stepName = options.stepName ?? 'Downloading files';
    const maxRetries = options.maxRetries ?? 3;

    const abortController = new AbortController();
    this.activeControllers.set(batchId, abortController);

    // Calculate total size
    let totalBytes = items.reduce((acc, it) => acc + (it.size || 0), 0);
    let transferredBytes = 0;
    let completedFiles = 0;
    const totalFiles = items.length;

    // Pre-flight disk space safety verification
    if (items.length > 0 && totalBytes > 0) {
      try {
        const destSample = items[0].destination;
        let checkDir = path.dirname(destSample);
        while (checkDir && !fs.existsSync(checkDir)) {
          const parent = path.dirname(checkDir);
          if (parent === checkDir) break;
          checkDir = parent;
        }
        if (checkDir && fs.existsSync(checkDir)) {
          const stats = await fs.promises.statfs(checkDir);
          const availableBytes = stats.bavail * stats.bsize;
          if (availableBytes < totalBytes + 20 * 1024 * 1024) {
            const availMb = Math.round(availableBytes / (1024 * 1024));
            const reqMb = Math.round(totalBytes / (1024 * 1024));
            throw new FernError(
              FernErrorCode.FILE_SYSTEM_ERROR,
              `Insufficient disk space to download files. Required: ${reqMb} MB, Available: ${availMb} MB.`,
              'Please free up disk space on your drive before downloading.'
            );
          }
        }
      } catch (err: any) {
        if (err instanceof FernError) throw err;
      }
    }

    let startTime = Date.now();
    let lastProgressTime = Date.now();
    let bytesSinceLast = 0;

    const notifyProgress = (status: 'downloading' | 'completed' | 'cancelled' | 'failed', error?: string) => {
      const now = Date.now();
      const elapsedTotalSec = Math.max(0.1, (now - startTime) / 1000);
      const overallSpeed = transferredBytes / elapsedTotalSec;

      let speedFormatted = '0 KB/s';
      if (overallSpeed > 1024 * 1024) {
        speedFormatted = `${(overallSpeed / (1024 * 1024)).toFixed(1)} MB/s`;
      } else if (overallSpeed > 1024) {
        speedFormatted = `${(overallSpeed / 1024).toFixed(0)} KB/s`;
      }

      let etaFormatted = '--';
      if (overallSpeed > 0 && totalBytes > transferredBytes) {
        const remainingSec = Math.round((totalBytes - transferredBytes) / overallSpeed);
        if (remainingSec < 60) {
          etaFormatted = `${remainingSec}s`;
        } else {
          const mins = Math.floor(remainingSec / 60);
          const secs = remainingSec % 60;
          etaFormatted = `${mins}m ${secs}s`;
        }
      }

      const percentage = totalBytes > 0
        ? Math.min(100, Math.round((transferredBytes / totalBytes) * 100))
        : totalFiles > 0
        ? Math.min(100, Math.round((completedFiles / totalFiles) * 100))
        : 100;

      this.notify({
        batchId,
        step: `${stepName} (${completedFiles}/${totalFiles})`,
        totalFiles,
        completedFiles,
        totalBytes,
        transferredBytes,
        percentage,
        speedFormatted,
        etaFormatted,
        status,
        error,
      });
    };

    // Filter items: skip files that already exist and match size/hash
    const pendingItems: BatchDownloadItem[] = [];
    for (const item of items) {
      if (fs.existsSync(item.destination)) {
        try {
          const stat = fs.statSync(item.destination);
          if (item.size && stat.size === item.size) {
            // Already cached and matching size
            transferredBytes += stat.size;
            completedFiles++;
            continue;
          }
        } catch {
          // File check error, keep in pending
        }
      }
      pendingItems.push(item);
    }

    if (pendingItems.length === 0) {
      notifyProgress('completed');
      this.activeControllers.delete(batchId);
      return;
    }

    notifyProgress('downloading');

    // Concurrency Worker Queue
    let currentIndex = 0;
    let fatalError: Error | null = null;

    const worker = async (): Promise<void> => {
      while (currentIndex < pendingItems.length) {
        if (abortController.signal.aborted) {
          throw new Error('Download cancelled');
        }

        const item = pendingItems[currentIndex++];
        if (!item) break;

        let attempt = 0;
        let downloaded = false;

        while (attempt < maxRetries && !downloaded) {
          if (abortController.signal.aborted) throw new Error('Download cancelled');
          attempt++;

          try {
            await this.downloadSingleFile(item, abortController.signal, (chunkBytes) => {
              transferredBytes += chunkBytes;
              bytesSinceLast += chunkBytes;
              const now = Date.now();
              if (now - lastProgressTime >= 250) {
                lastProgressTime = now;
                bytesSinceLast = 0;
                notifyProgress('downloading');
              }
            });
            downloaded = true;
            completedFiles++;
            notifyProgress('downloading');
          } catch (err: any) {
            if (abortController.signal.aborted) throw err;
            if (attempt >= maxRetries) {
              fatalError = err;
              throw err;
            }
            await new Promise((r) => setTimeout(r, Math.min(500 * Math.pow(2, attempt - 1), 3000)));
          }
        }
      }
    };

    try {
      const workers = Array.from({ length: Math.min(concurrency, pendingItems.length) }, () => worker());
      await Promise.all(workers);

      this.activeControllers.delete(batchId);
      notifyProgress('completed');
    } catch (err: any) {
      this.activeControllers.delete(batchId);
      const isAbort = abortController.signal.aborted || err.message?.includes('aborted') || err.message?.includes('cancelled');
      if (isAbort) {
        notifyProgress('cancelled');
        throw new FernError(FernErrorCode.UNKNOWN_ERROR, 'Download operation was cancelled.');
      } else {
        notifyProgress('failed', err.message);
        throw new FernError(
          FernErrorCode.DOWNLOAD_FAILED,
          `Batch download failed: ${err.message}`,
          'Check internet connectivity and retry the installation.'
        );
      }
    }
  }

  private downloadSingleFile(
    item: BatchDownloadItem,
    signal: AbortSignal,
    onChunk: (bytes: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const targetDir = path.dirname(item.destination);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const tempFile = `${item.destination}.part.${Date.now()}`;
      const parsedUrl = new URL(item.url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const req = client.get(
        item.url,
        {
          signal,
          timeout: 20000,
          headers: {
            'User-Agent': 'FernClient/1.0.0 (Windows; x64)',
          },
        },
        async (res) => {
          // Handle redirects
          if (res.statusCode && [301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
            try {
              const redirectUrl = new URL(res.headers.location, item.url).toString();
              await this.downloadSingleFile({ ...item, url: redirectUrl }, signal, onChunk);
              resolve();
            } catch (redirErr) {
              reject(redirErr);
            }
            return;
          }

          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            reject(new Error(`Server returned HTTP ${res.statusCode} for ${item.url}`));
            return;
          }

          const fileStream = fs.createWriteStream(tempFile);

          res.on('data', (chunk: Buffer) => {
            onChunk(chunk.length);
          });

          res.pipe(fileStream);

          fileStream.on('finish', async () => {
            fileStream.close();

            try {
              // Verify SHA-1 if expected
              if (item.expectedSha1) {
                const actualSha1 = await calculateFileHash(tempFile, 'sha1');
                if (actualSha1.toLowerCase() !== item.expectedSha1.toLowerCase()) {
                  if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                  reject(new Error(`SHA-1 mismatch on ${path.basename(item.destination)}. Expected ${item.expectedSha1}, got ${actualSha1}`));
                  return;
                }
              }

              if (fs.existsSync(item.destination)) {
                fs.unlinkSync(item.destination);
              }
              fs.renameSync(tempFile, item.destination);
              resolve();
            } catch (postErr) {
              if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
              reject(postErr);
            }
          });

          fileStream.on('error', (fsErr) => {
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            reject(fsErr);
          });
        }
      );

      req.on('error', (reqErr) => {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        reject(reqErr);
      });

      req.on('timeout', () => {
        req.destroy(new Error(`Download timeout: ${item.url}`));
      });
    });
  }

  private notify(update: BatchProgressUpdate): void {
    for (const listener of this.listeners) {
      try {
        listener(update);
      } catch (err) {
        this.logger.error('DownloadManager', 'Error in batch progress listener:', err);
      }
    }
  }
}
