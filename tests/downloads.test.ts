import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as http from 'http';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { DownloadService } from '../launcher/src/downloads/download-service';
import { calculateFileHash } from '../shared/utilities/hash-utils';
import { FernErrorCode } from '../launcher/src/core/errors';

describe('DownloadService & Hash Verification', () => {
  let tempDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let downloadService: DownloadService;
  let server: http.Server;
  let serverUrl: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-dl-test-'));
    pathManager = new FernPathManager(tempDir);
    logger = new FernLogger(pathManager);
    downloadService = new DownloadService(logger);

    // Setup local HTTP test server
    server = http.createServer((req, res) => {
      if (req.url === '/test.txt') {
        res.writeHead(200, { 'Content-Type': 'text/plain', 'Content-Length': 11 });
        res.end('Hello Fern!');
      } else if (req.url === '/slow.txt') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        // Delay response
        setTimeout(() => {
          res.end('Slow response');
        }, 1000);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        serverUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('downloads file with progress reporting and checksum verification', async () => {
    const destination = path.join(tempDir, 'output.txt');
    const expectedSha1 = '585dfd0ef54c26d128cd1be2df8825a29b6c2b97'; // sha1('Hello Fern!')

    let progressCalls = 0;
    downloadService.onProgress((p) => {
      progressCalls++;
      expect(p.destination).toBe(destination);
    });

    const downloadedPath = await downloadService.downloadFile({
      url: `${serverUrl}/test.txt`,
      destination,
      expectedHash: expectedSha1,
      hashAlgorithm: 'sha1',
    });

    expect(downloadedPath).toBe(destination);
    const content = await fs.readFile(destination, 'utf-8');
    expect(content).toBe('Hello Fern!');
    expect(progressCalls).toBeGreaterThan(0);
  });

  it('detects checksum mismatch and removes invalid temp file', async () => {
    const destination = path.join(tempDir, 'corrupt.txt');

    await expect(
      downloadService.downloadFile({
        url: `${serverUrl}/test.txt`,
        destination,
        expectedHash: 'badhash1234567890badhash1234567890badh',
        hashAlgorithm: 'sha1',
        maxRetries: 1,
      })
    ).rejects.toThrow();

    // Corrupt destination should not exist
    const exists = await fs.access(destination).then(() => true).catch(() => false);
    expect(exists).toBe(false);
  });

  it('handles cancellation properly', async () => {
    const destination = path.join(tempDir, 'slow.txt');

    const downloadPromise = downloadService.downloadFile({
      id: 'task-cancel',
      url: `${serverUrl}/slow.txt`,
      destination,
      maxRetries: 1,
    });

    // Cancel after short delay
    setTimeout(() => {
      downloadService.cancel('task-cancel');
    }, 50);

    await expect(downloadPromise).rejects.toThrow();
  });
});
