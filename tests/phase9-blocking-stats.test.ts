import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { BlockService } from '../launcher/src/social/block-service';
import { StatisticsService } from '../launcher/src/social/statistics-service';
import { StatisticsCalculator } from '../shared/models/statistics';

describe('Phase 9: Blocking & Player Statistics Services', () => {
  let tempDir: string;
  let paths: FernPathManager;
  let logger: FernLogger;
  let blockService: BlockService;
  let statsService: StatisticsService;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fern-blk-stats-phase9-'));
    paths = new FernPathManager(tempDir);
    await paths.initializeDirectories();
    logger = new FernLogger(paths);

    blockService = new BlockService(paths, logger);
    await blockService.initialize();

    statsService = new StatisticsService(paths, logger);
    await statsService.initialize();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('blocks user, checks blocked status, and persists to disk', async () => {
    expect(await blockService.isBlocked('spammer_123')).toBe(false);

    const entry = await blockService.blockUser(
      'spammer_123',
      'SpamBot',
      'Spam Bot',
      'Sending unwanted requests'
    );
    expect(entry.blockedUserId).toBe('spammer_123');
    expect(await blockService.isBlocked('spammer_123')).toBe(true);

    const list = await blockService.getBlockedUsers();
    expect(list.length).toBe(1);
    expect(list[0].username).toBe('SpamBot');

    // Verify disk persistence
    const blkFile = path.join(paths.getSocialDir(), 'blocks.json');
    expect(fs.existsSync(blkFile)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(blkFile, 'utf-8'));
    expect(parsed[0].blockedUserId).toBe('spammer_123');
  });

  it('unblocks previously blocked user', async () => {
    await blockService.blockUser('user_to_unblock', 'UnblockMe');
    expect(await blockService.isBlocked('user_to_unblock')).toBe(true);

    const unblocked = await blockService.unblockUser('user_to_unblock');
    expect(unblocked).toBe(true);
    expect(await blockService.isBlocked('user_to_unblock')).toBe(false);
  });

  it('records gameplay sessions and computes statistics accurately', async () => {
    // Record 1st session: 3600s (1 hour) on 1.21.4 (Fern Survival)
    await statsService.recordSession('1.21.4', 'Fern Survival', 3600);

    // Record 2nd session: 1800s on 1.21.4 (Fern Survival)
    await statsService.recordSession('1.21.4', 'Fern Survival', 1800);

    // Record 3rd session: 600s on 1.20.1 (Fern PvP)
    await statsService.recordSession('1.20.1', 'Fern PvP', 600);

    const stats = await statsService.getStatistics();
    expect(stats.totalPlaytimeSeconds).toBe(6000);
    expect(stats.sessionCount).toBe(3);
    expect(stats.versionsPlayed['1.21.4']).toBe(5400);
    expect(stats.versionsPlayed['1.20.1']).toBe(600);
    expect(stats.favoriteInstallation).toBe('Fern Survival');
    expect(stats.favoriteVersion).toBe('1.21.4');

    expect(StatisticsCalculator.formatPlaytime(stats.totalPlaytimeSeconds)).toBe('1h 40m');
  });

  it('tracks live sessions with startSession and endSession', async () => {
    const sessId = statsService.startSession('1.21.4', 'Fern Speedrun');
    expect(sessId).toBeDefined();

    const result = await statsService.endSession(sessId);
    expect(result).toBeDefined();
    expect(result?.sessionCount).toBe(1);
    expect(result?.installationsPlayed['Fern Speedrun']).toBeGreaterThanOrEqual(1);
  });

  it('resets all statistics cleanly', async () => {
    await statsService.recordSession('1.21.4', 'Fern Main', 7200);
    const beforeReset = await statsService.getStatistics();
    expect(beforeReset.totalPlaytimeSeconds).toBe(7200);

    const afterReset = await statsService.resetStatistics();
    expect(afterReset.totalPlaytimeSeconds).toBe(0);
    expect(afterReset.sessionCount).toBe(0);
    expect(Object.keys(afterReset.versionsPlayed).length).toBe(0);
  });
});
