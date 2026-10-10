import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { DownloadProgress, DownloadTaskOptions } from '../../../shared/models/download';
import { calculateFileHash } from '../../../shared/utilities/hash-utils';
import { FernLogger } from '../core/logger';
import { FernError, FernErrorCode } from '../core/errors';

export type DownloadListener = (progress: DownloadProgress) => void;

interface ActiveTask {
  options: DownloadTaskOptions;
  abortController: AbortController;
  progress: DownloadProgress;
}

export class DownloadService {
  private activeTasks: Map<string, ActiveTask> = new Map();
  private listeners: Set<DownloadListener> = new Set();

  constructor(private logger: FernLogger) {}

  public onProgress(listener: DownloadListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getActiveDownloads(): DownloadProgress[] {
    return Array.from(this.activeTasks.values()).map((t) => ({ ...t.progress }));
  }

  public cancel(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (task) {
      task.abortController.abort();
      task.progress.status = 'cancelled';
      this.notifyListeners(task.progress);
      this.activeTasks.delete(taskId);
      this.logger.info('DownloadService', `Cancelled download task: ${taskId}`);
    }
  }

  public cancelAll(): void {
    for (const taskId of this.activeTasks.keys()) {
      this.cancel(taskId);
    }
  }

  public async downloadFile(options: DownloadTaskOptions): Promise<string> {
    const taskId = options.id || `dl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const maxRetries = options.maxRetries ?? 3;
    const timeoutMs = options.timeoutMs ?? 30000;

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxRetries) {
      attempt++;
      try {
        const result = await this.performSingleDownload(taskId, options, timeoutMs);
        return result;
      } catch (err: unknown) {
        lastError = err as Error;
        this.logger.warn(
          'DownloadService',
          `Download attempt ${attempt}/${maxRetries} failed for ${options.url}: ${lastError.message}`
        );

        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt - 1), 5000)));
        }
      }
    }

    const fernErr = new FernError(
      FernErrorCode.DOWNLOAD_FAILED,
      `Failed to download file after ${maxRetries} attempts: ${lastError?.message || 'Unknown network error'}`
    );
    throw fernErr;
  }

  private performSingleDownload(
    taskId: string,
    options: DownloadTaskOptions,
    timeoutMs: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const abortController = new AbortController();
      const tempPath = `${options.destination}.part.${Date.now()}`;

      const progress: DownloadProgress = {
        id: taskId,
        url: options.url,
        destination: options.destination,
        totalBytes: 0,
        transferredBytes: 0,
        percentage: 0,
        speedBytesPerSec: 0,
        status: 'downloading',
      };

      const task: ActiveTask = {
        options,
        abortController,
        progress,
      };

      this.activeTasks.set(taskId, task);
      this.notifyListeners(progress);

      // Ensure target directory exists
      const targetDir = path.dirname(options.destination);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const parsedUrl = new URL(options.url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const request = client.get(
        options.url,
        {
          signal: abortController.signal,
          timeout: timeoutMs,
          headers: {
            'User-Agent': 'FernClient/1.0.0 (Windows; x64)',
          },
        },
        async (response) => {
          // Handle redirects
          if (response.statusCode && [301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
            try {
              const redirectUrl = new URL(response.headers.location, options.url).toString();
              this.activeTasks.delete(taskId);
              const result = await this.performSingleDownload(
                taskId,
                { ...options, url: redirectUrl },
                timeoutMs
              );
              resolve(result);
            } catch (redirErr) {
              reject(redirErr);
            }
            return;
          }

          if (response.statusCode && (response.statusCode < 200 || response.statusCode >= 300)) {
            reject(new Error(`Server returned HTTP ${response.statusCode}: ${response.statusMessage}`));
            return;
          }

          const contentLength = parseInt(response.headers['content-length'] || '0', 10);
          progress.totalBytes = contentLength;

          const fileStream = fs.createWriteStream(tempPath);
          let lastTime = Date.now();
          let bytesSinceLastTime = 0;

          response.on('data', (chunk: Buffer) => {
            progress.transferredBytes += chunk.length;
            bytesSinceLastTime += chunk.length;

            if (contentLength > 0) {
              progress.percentage = Math.min(100, Math.round((progress.transferredBytes / contentLength) * 100));
            }

            const now = Date.now();
            const elapsed = (now - lastTime) / 1000;
            if (elapsed >= 0.5) {
              progress.speedBytesPerSec = Math.round(bytesSinceLastTime / elapsed);
              bytesSinceLastTime = 0;
              lastTime = now;
              this.notifyListeners(progress);
            }
          });

          response.pipe(fileStream);

          fileStream.on('finish', async () => {
            fileStream.close();

            try {
              // Verify Checksum if expected
              if (options.expectedHash) {
                progress.status = 'verifying';
                this.notifyListeners(progress);

                const algo = options.hashAlgorithm || 'sha1';
                const actualHash = await calculateFileHash(tempPath, algo);

                if (actualHash.toLowerCase() !== options.expectedHash.toLowerCase()) {
                  if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                  throw new FernError(
                    FernErrorCode.DOWNLOAD_CHECKSUM_MISMATCH,
                    `Checksum mismatch for ${path.basename(options.destination)}. Expected: ${options.expectedHash}, Got: ${actualHash}`
                  );
                }
              }

              // Replace destination file atomically
              if (fs.existsSync(options.destination)) {
                fs.unlinkSync(options.destination);
              }
              fs.renameSync(tempPath, options.destination);

              progress.status = 'completed';
              progress.percentage = 100;
              this.notifyListeners(progress);
              this.activeTasks.delete(taskId);
              this.logger.debug('DownloadService', `Finished downloading ${options.destination}`);
              resolve(options.destination);
            } catch (postErr) {
              if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
              this.activeTasks.delete(taskId);
              reject(postErr);
            }
          });

          fileStream.on('error', (fsErr) => {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            this.activeTasks.delete(taskId);
            reject(fsErr);
          });
        }
      );

      request.on('error', (reqErr) => {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        this.activeTasks.delete(taskId);
        reject(reqErr);
      });

      request.on('timeout', () => {
        request.destroy(new Error(`Download timed out after ${timeoutMs}ms`));
      });
    });
  }

  private notifyListeners(progress: DownloadProgress): void {
    for (const listener of this.listeners) {
      try {
        listener({ ...progress });
      } catch (err) {
        this.logger.error('DownloadService', 'Error in download progress listener:', err);
      }
    }
  }
}
