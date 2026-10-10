import * as fs from 'fs/promises';
import * as path from 'path';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { BlockEntry } from '../../../shared/models/social';

/**
 * Service managing global local block list.
 * Blocked users cannot send friend requests, cannot appear in friend discovery,
 * and cannot initiate interactions.
 */
export class BlockService {
  private blockFile: string;
  private blockedUsers: BlockEntry[] = [];
  private initialized = false;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger
  ) {
    this.blockFile = path.join(this.pathManager.getSocialDir(), 'blocks.json');
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.pathManager.getSocialDir(), { recursive: true });
      const raw = await fs.readFile(this.blockFile, 'utf-8');
      this.blockedUsers = JSON.parse(raw);
      this.initialized = true;
      this.logger.info('BlockService', `Loaded ${this.blockedUsers.length} blocked users.`);
    } catch {
      this.blockedUsers = [];
      await this.save();
      this.initialized = true;
    }
  }

  private async save(): Promise<void> {
    try {
      await fs.writeFile(this.blockFile, JSON.stringify(this.blockedUsers, null, 2), 'utf-8');
    } catch (err) {
      this.logger.error('BlockService', 'Failed to save blocked users:', err);
    }
  }

  public async getBlockedUsers(): Promise<BlockEntry[]> {
    if (!this.initialized) await this.initialize();
    return [...this.blockedUsers];
  }

  public async isBlocked(userId: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    return this.blockedUsers.some(b => b.blockedUserId === userId);
  }

  public async blockUser(userId: string, username: string, displayName?: string, reason?: string): Promise<BlockEntry> {
    if (!this.initialized) await this.initialize();

    const existing = this.blockedUsers.find(b => b.blockedUserId === userId);
    if (existing) {
      return existing;
    }

    const entry: BlockEntry = {
      id: `blk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      blockedUserId: userId,
      username,
      displayName: displayName || username,
      blockedAt: Date.now(),
      timestamp: Date.now(),
      reason,
    };

    this.blockedUsers.push(entry);
    await this.save();
    this.logger.info('BlockService', `Blocked user: @${username} (${userId})`);
    return entry;
  }

  public async unblockUser(userId: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();

    const initialLength = this.blockedUsers.length;
    this.blockedUsers = this.blockedUsers.filter(b => b.blockedUserId !== userId);

    if (this.blockedUsers.length !== initialLength) {
      await this.save();
      this.logger.info('BlockService', `Unblocked user: ${userId}`);
      return true;
    }
    return false;
  }
}
