import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as http from 'http';
import { FernLogger } from '../launcher/src/core/logger';
import { FernPathManager } from '../launcher/src/core/paths';
import { DownloadManager } from '../launcher/src/downloads/download-manager';
import { ModrinthProvider } from '../launcher/src/mods/providers/modrinth-provider';

describe('ModrinthProvider', () => {
  let logger: FernLogger;
  let downloadManager: DownloadManager;
  let provider: ModrinthProvider;

  beforeEach(() => {
    const pathManager = new FernPathManager();
    logger = new FernLogger(pathManager);
    downloadManager = new DownloadManager(logger);
    provider = new ModrinthProvider(logger, downloadManager);
  });

  it('exposes correct provider metadata', () => {
    expect(provider.id).toBe('modrinth');
    expect(provider.name).toBe('Modrinth');
  });

  it('handles search query options gracefully without exceptions', async () => {
    // When offline or invalid response, returns empty result set instead of crashing
    const results = await provider.search({
      query: 'sodium',
      minecraftVersion: '1.21.4',
      loader: 'fabric',
      limit: 5,
    });

    expect(results).toBeDefined();
    expect(Array.isArray(results.items)).toBe(true);
  });
});
