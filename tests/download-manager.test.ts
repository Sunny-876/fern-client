import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as http from 'http';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { DownloadManager, BatchDownloadItem } from '../launcher/src/downloads/download-manager';

describe('DownloadManager Batch Downloader', () => {
  let tempDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let downloadManager: DownloadManager;
  let server: http.Server;
  let serverUrl: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-batch-test-'));
    pathManager = new FernPathManager(tempDir);
    logger = new FernLogger(pathManager);
    downloadManager = new DownloadManager(logger);

    server = http.createServer((req, res) => {
      if (req.url === '/file1.jar') {
        res.writeHead(200, { 'Content-Length': 5 });
        res.end('jar01');
      } else if (req.url === '/file2.jar') {
        res.writeHead(200, { 'Content-Length': 5 });
        res.end('jar02');
      } else {
        res.writeHead(404);
        res.end('Not found');
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

  it('downloads batch of items with aggregated progress', async () => {
    const items: BatchDownloadItem[] = [
      {
        id: '1',
        url: `${serverUrl}/file1.jar`,
        destination: path.join(tempDir, 'libs', 'file1.jar'),
        size: 5,
        expectedSha1: 'e47777c6fecd8bee7d7de7299cdfeeaee59baecd', // sha1('jar01')
      },
      {
        id: '2',
        url: `${serverUrl}/file2.jar`,
        destination: path.join(tempDir, 'libs', 'file2.jar'),
        size: 5,
        expectedSha1: '42b55a91bf705f9bbf16e54256df441b3d2bc165', // sha1('jar02')
      },
    ];

    let progressReports = 0;
    downloadManager.onBatchProgress((update) => {
      if (update.batchId === 'test-batch') {
        progressReports++;
        expect(update.totalFiles).toBe(2);
      }
    });

    await downloadManager.downloadBatch('test-batch', items, { concurrency: 2 });

    expect(progressReports).toBeGreaterThan(0);
    const content1 = await fs.readFile(items[0].destination, 'utf-8');
    const content2 = await fs.readFile(items[1].destination, 'utf-8');
    expect(content1).toBe('jar01');
    expect(content2).toBe('jar02');
  });

  it('skips downloading when file already exists and matches size', async () => {
    const dest = path.join(tempDir, 'cached.jar');
    await fs.writeFile(dest, 'jar01');

    const items: BatchDownloadItem[] = [
      {
        id: 'cached',
        url: `${serverUrl}/file1.jar`,
        destination: dest,
        size: 5,
      },
    ];

    await downloadManager.downloadBatch('cached-batch', items);
    const content = await fs.readFile(dest, 'utf-8');
    expect(content).toBe('jar01');
  });
});
