import * as fs from 'fs/promises';
import * as path from 'path';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import {
  PlayerStatistics,
  DEFAULT_PLAYER_STATISTICS,
  StatisticsCalculator,
} from '../../../shared/models/statistics';

interface ActiveSession {
  version: string;
  installationName: string;
  startTime: number;
}

/**
 * Local-only player statistics service.
 * Tracks Minecraft playtime, versions, installations, and session frequency.
 * Completely local, zero unnecessary telemetry or tracking.
 */
export class StatisticsService {
  private statsFile: string;
  private stats: PlayerStatistics = { ...DEFAULT_PLAYER_STATISTICS };
  private activeSessions: Map<string, ActiveSession> = new Map();
  private initialized = false;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger
  ) {
    this.statsFile = path.join(this.pathManager.getSocialDir(), 'statistics.json');
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.pathManager.getSocialDir(), { recursive: true });
      const raw = await fs.readFile(this.statsFile, 'utf-8');
      const loaded = JSON.parse(raw);
      this.stats = {
        ...DEFAULT_PLAYER_STATISTICS,
        ...loaded,
      };
      this.initialized = true;
      this.logger.info('StatisticsService', 'Loaded player statistics.');
    } catch {
      this.stats = {
        ...DEFAULT_PLAYER_STATISTICS,
        firstLaunch: Date.now(),
        lastPlayed: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await this.save();
      this.initialized = true;
    }
  }

  private async save(): Promise<void> {
    try {
      await fs.writeFile(this.statsFile, JSON.stringify(this.stats, null, 2), 'utf-8');
    } catch (err) {
      this.logger.error('StatisticsService', 'Failed to save statistics:', err);
    }
  }

  public async getStatistics(): Promise<PlayerStatistics> {
    if (!this.initialized) await this.initialize();
    return { ...this.stats };
  }

  /**
   * Starts tracking an active Minecraft playing session.
   */
  public startSession(version: string, installationName: string): string {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.activeSessions.set(sessionId, {
      version: version || '1.21.4',
      installationName: installationName || 'Default',
      startTime: Date.now(),
    });
    return sessionId;
  }

  /**
   * Ends an active session and commits duration to statistics.
   */
  public async endSession(sessionId: string): Promise<PlayerStatistics | null> {
    if (!this.initialized) await this.initialize();

    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    this.activeSessions.delete(sessionId);
    const durationSeconds = Math.max(1, Math.round((Date.now() - session.startTime) / 1000));

    return this.recordSession(session.version, session.installationName, durationSeconds);
  }

  /**
   * Records a completed session directly.
   */
  public async recordSession(
    version: string,
    installationName: string,
    durationSeconds: number
  ): Promise<PlayerStatistics> {
    if (!this.initialized) await this.initialize();

    const vKey = version || 'Unknown';
    const iKey = installationName || 'Default';

    this.stats.totalPlaytimeSeconds += durationSeconds;
    this.stats.sessionCount += 1;
    this.stats.lastPlayed = Date.now();
    this.stats.updatedAt = Date.now();

    this.stats.versionsPlayed[vKey] = (this.stats.versionsPlayed[vKey] || 0) + durationSeconds;
    this.stats.installationsPlayed[iKey] =
      (this.stats.installationsPlayed[iKey] || 0) + durationSeconds;

    const favorites = StatisticsCalculator.determineFavorites(this.stats);
    this.stats.favoriteInstallation = favorites.favoriteInstallation;
    this.stats.favoriteVersion = favorites.favoriteVersion;

    await this.save();
    return { ...this.stats };
  }

  /**
   * Completely resets player statistics.
   */
  public async resetStatistics(): Promise<PlayerStatistics> {
    this.stats = {
      totalPlaytimeSeconds: 0,
      sessionCount: 0,
      firstLaunch: Date.now(),
      lastPlayed: Date.now(),
      versionsPlayed: {},
      installationsPlayed: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await this.save();
    this.logger.info('StatisticsService', 'Player statistics reset.');
    return { ...this.stats };
  }
}
