import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { LocalSocialProvider } from '../launcher/src/social/api/local-social-provider';

describe('Phase 9: Friend System & Social Interactions', () => {
  let tempDir: string;
  let paths: FernPathManager;
  let logger: FernLogger;
  let provider: LocalSocialProvider;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fern-friends-phase9-'));
    paths = new FernPathManager(tempDir);
    await paths.initializeDirectories();
    logger = new FernLogger(paths);
    provider = new LocalSocialProvider(paths, logger);
    await provider.initialize();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('lists existing friends with presence data', async () => {
    const res = await provider.friends.getFriends();
    expect(res.success).toBe(true);
    expect(res.data!.length).toBeGreaterThan(0);

    const alex = res.data!.find(f => f.username === 'AlexBuilder');
    expect(alex).toBeDefined();
    expect(alex?.presence?.state).toBe('playing_minecraft');
    expect(alex?.presence?.minecraftVersion).toBe('1.21.4');
  });

  it('sends outgoing friend request and prevents duplicates', async () => {
    const sendRes = await provider.friends.sendFriendRequest('CreeperWhisperer');
    expect(sendRes.success).toBe(true);
    expect(sendRes.data?.toUsername).toBe('CreeperWhisperer');
    expect(sendRes.data?.direction).toBe('outgoing');

    // Duplicate attempt
    const dupRes = await provider.friends.sendFriendRequest('CreeperWhisperer');
    expect(dupRes.success).toBe(false);
    expect(dupRes.error).toMatch(/already/i);
  });

  it('accepts incoming friend request and adds to friends list', async () => {
    // Check initial incoming request from 'EnderKnight' (req_ender)
    const reqsRes = await provider.friends.getFriendRequests();
    const req = reqsRes.data!.find(r => r.fromUsername === 'EnderKnight');
    expect(req).toBeDefined();

    const acceptRes = await provider.friends.respondToRequest(req!.id, true);
    expect(acceptRes.success).toBe(true);

    // Verify request is removed from pending
    const updatedReqs = await provider.friends.getFriendRequests();
    expect(updatedReqs.data!.some(r => r.id === req!.id)).toBe(false);

    // Verify user is now a friend
    const friendsRes = await provider.friends.getFriends();
    const newFriend = friendsRes.data!.find(f => f.username === 'EnderKnight');
    expect(newFriend).toBeDefined();
    expect(newFriend?.status).toBe('accepted');
  });

  it('declines incoming friend request without adding to friends', async () => {
    const reqsRes = await provider.friends.getFriendRequests();
    const req = reqsRes.data!.find(r => r.id === 'req_ender');
    expect(req).toBeDefined();

    const declineRes = await provider.friends.respondToRequest(req!.id, false);
    expect(declineRes.success).toBe(true);

    const friendsRes = await provider.friends.getFriends();
    expect(friendsRes.data!.some(f => f.username === 'EnderKnight')).toBe(false);
  });

  it('cancels an outgoing friend request', async () => {
    const sendRes = await provider.friends.sendFriendRequest('DiamondMiner');
    expect(sendRes.success).toBe(true);

    const cancelRes = await provider.friends.cancelFriendRequest(sendRes.data!.id);
    expect(cancelRes.success).toBe(true);

    const reqs = await provider.friends.getFriendRequests();
    expect(reqs.data!.some(r => r.id === sendRes.data!.id)).toBe(false);
  });

  it('removes an existing friend from list', async () => {
    const initialFriends = await provider.friends.getFriends();
    const target = initialFriends.data![0];

    const removeRes = await provider.friends.removeFriend(target.id);
    expect(removeRes.success).toBe(true);

    const updatedFriends = await provider.friends.getFriends();
    expect(updatedFriends.data!.some(f => f.id === target.id)).toBe(false);
  });

  it('searches users by username query', async () => {
    const searchRes = await provider.friends.searchUsers('Alex');
    expect(searchRes.success).toBe(true);
    expect(searchRes.data!.length).toBeGreaterThan(0);
    expect(searchRes.data![0].username).toMatch(/Alex/i);
  });
});
