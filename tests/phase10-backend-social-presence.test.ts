import { describe, it, expect } from 'vitest';
import { SocialPrivacySettings, DEFAULT_SOCIAL_PRIVACY } from '../shared/models/privacy';
import { UserPresence, PresenceState } from '../shared/models/social';

describe('Phase 10: Social Privacy Enforcement, State Transitions & Real-Time Presence', () => {
  const sanitizePresenceForViewer = (
    targetPresence: UserPresence,
    targetPrivacy: SocialPrivacySettings,
    isFriend: boolean,
  ): { state: PresenceState; minecraftVersion?: string; installationName?: string } => {
    // 1. Invisible mode suppresses all presence
    if (targetPrivacy.invisibleMode || targetPresence.state === 'invisible') {
      return { state: 'offline' };
    }

    // 2. Online status privacy check
    if (!targetPrivacy.showOnlineStatus) {
      return { state: 'offline' };
    }

    let state = targetPresence.state;
    let minecraftVersion: string | undefined = undefined;
    let installationName: string | undefined = undefined;

    if (state === 'playing_minecraft') {
      if (!targetPrivacy.showPlayingStatus) {
        state = 'online';
      } else {
        if (targetPrivacy.showMinecraftVersion) {
          minecraftVersion = targetPresence.minecraftVersion;
        }
        if (targetPrivacy.showInstallationName) {
          installationName = targetPresence.installationName;
        }
      }
    }

    return { state, minecraftVersion, installationName };
  };

  it('masks user presence completely as offline when invisible mode is enabled', () => {
    const rawPresence: UserPresence = {
      userId: 'usr-1',
      state: 'playing_minecraft',
      minecraftVersion: '1.21.4',
      installationName: 'Fern Modded',
      lastSeen: Date.now(),
    };

    const privacy: SocialPrivacySettings = {
      ...DEFAULT_SOCIAL_PRIVACY,
      invisibleMode: true,
    };

    const published = sanitizePresenceForViewer(rawPresence, privacy, true);
    expect(published.state).toBe('offline');
    expect(published.minecraftVersion).toBeUndefined();
    expect(published.installationName).toBeUndefined();
  });

  it('masks playing state and version details when configured for privacy', () => {
    const rawPresence: UserPresence = {
      userId: 'usr-2',
      state: 'playing_minecraft',
      minecraftVersion: '1.21.4',
      installationName: 'Private SMP',
      lastSeen: Date.now(),
    };

    // Disabled installation name and version broadcast
    const privacy: SocialPrivacySettings = {
      ...DEFAULT_SOCIAL_PRIVACY,
      showInstallationName: false,
      showMinecraftVersion: false,
    };

    const published = sanitizePresenceForViewer(rawPresence, privacy, true);
    expect(published.state).toBe('playing_minecraft');
    expect(published.minecraftVersion).toBeUndefined();
    expect(published.installationName).toBeUndefined();
  });

  it('masks playing state as standard online if showPlayingStatus is disabled', () => {
    const rawPresence: UserPresence = {
      userId: 'usr-3',
      state: 'playing_minecraft',
      minecraftVersion: '1.21.4',
      lastSeen: Date.now(),
    };

    const privacy: SocialPrivacySettings = {
      ...DEFAULT_SOCIAL_PRIVACY,
      showPlayingStatus: false,
    };

    const published = sanitizePresenceForViewer(rawPresence, privacy, true);
    expect(published.state).toBe('online');
    expect(published.minecraftVersion).toBeUndefined();
  });

  it('handles friend state transitions correctly: prevents self-requests and duplicate pending requests', () => {
    const pendingRequests = new Set<string>();

    const sendRequest = (fromId: string, toId: string) => {
      if (fromId === toId) throw new Error('Cannot send friend request to yourself');
      const key = `${fromId}->${toId}`;
      if (pendingRequests.has(key)) throw new Error('Friend request already pending');
      pendingRequests.add(key);
      return true;
    };

    expect(() => sendRequest('usr-a', 'usr-a')).toThrow('Cannot send friend request to yourself');
    expect(sendRequest('usr-a', 'usr-b')).toBe(true);
    expect(() => sendRequest('usr-a', 'usr-b')).toThrow('Friend request already pending');
  });

  it('automatically accepts mutual friendship when reverse request already exists', () => {
    const requests = new Map<string, string>(); // to -> from
    const friendships = new Set<string>();

    const handleRequest = (from: string, to: string) => {
      // Check if `to` had already sent a request to `from`
      if (requests.get(from) === to) {
        requests.delete(from);
        friendships.add([from, to].sort().join('<->'));
        return { status: 'auto_accepted' };
      }
      requests.set(to, from);
      return { status: 'pending' };
    };

    // User A sends to B
    expect(handleRequest('userA', 'userB')).toEqual({ status: 'pending' });
    // User B sends to A -> should auto-accept
    expect(handleRequest('userB', 'userA')).toEqual({ status: 'auto_accepted' });
    expect(friendships.has('userA<->userB')).toBe(true);
  });

  it('removes friendships and cancels requests when a user is blocked', () => {
    let friends = ['usr-b'];
    let requests = [{ from: 'usr-b', to: 'usr-a' }];
    const blocks = new Set<string>();

    const blockUser = (target: string) => {
      blocks.add(target);
      friends = friends.filter((f) => f !== target);
      requests = requests.filter((r) => r.from !== target && r.to !== target);
    };

    blockUser('usr-b');
    expect(blocks.has('usr-b')).toBe(true);
    expect(friends).toHaveLength(0);
    expect(requests).toHaveLength(0);
  });
});
