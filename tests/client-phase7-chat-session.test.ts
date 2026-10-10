import { describe, it, expect, beforeEach } from 'vitest';
import { ChatCustomizerModule } from '../client/src/modules/chat/ChatCustomizerModule';
import { SessionTracker } from '../client/src/modules/utility/SessionTracker';

describe('Phase 7 - Chat Customization & Session Tracker', () => {
  describe('ChatCustomizerModule', () => {
    let chatMod: ChatCustomizerModule;

    beforeEach(() => {
      chatMod = new ChatCustomizerModule();
      chatMod.setEnabled(true);
    });

    it('formats messages with timestamp badges', () => {
      const fixedDate = new Date(2026, 9, 8, 14, 30, 45);
      const res = chatMod.processMessage('<Player1> Hello Fern!', fixedDate);

      expect(res.display).toBe(true);
      expect(res.formattedText).toBe('§8[14:30:45]§r <Player1> Hello Fern!');
    });

    it('supports alternative [HH:mm] timestamp format', () => {
      chatMod.timestampFormatSetting.set('[HH:mm]');
      const fixedDate = new Date(2026, 9, 8, 9, 5, 20);
      const res = chatMod.processMessage('<Steve> Good morning', fixedDate);

      expect(res.formattedText).toBe('§8[09:05]§r <Steve> Good morning');
    });

    it('filters join/leave messages when enabled', () => {
      chatMod.hideJoinMessagesSetting.set(true);
      chatMod.hideLeaveMessagesSetting.set(true);

      const joinRes = chatMod.processMessage('Alex joined the game');
      expect(joinRes.display).toBe(false);
      expect(joinRes.isFiltered).toBe(true);

      const leaveRes = chatMod.processMessage('Bob left the game');
      expect(leaveRes.display).toBe(false);
      expect(leaveRes.isFiltered).toBe(true);

      const chatRes = chatMod.processMessage('<Alex> I am here');
      expect(chatRes.display).toBe(true);
    });

    it('filters system noise divider spam when enabled', () => {
      chatMod.hideSystemNoiseSetting.set(true);

      const noiseRes = chatMod.processMessage('========================================');
      expect(noiseRes.display).toBe(false);
      expect(noiseRes.isFiltered).toBe(true);
    });

    it('NEVER filters server moderation messages even when filters are active', () => {
      chatMod.hideJoinMessagesSetting.set(true);
      chatMod.hideLeaveMessagesSetting.set(true);
      chatMod.hideSystemNoiseSetting.set(true);

      const banMsg = 'Player Alex was banned by Staff for cheating';
      const res = chatMod.processMessage(banMsg);
      expect(res.display).toBe(true);
      expect(res.isFiltered).toBe(false);

      const muteMsg = 'You have been muted for 10 minutes';
      const muteRes = chatMod.processMessage(muteMsg);
      expect(muteRes.display).toBe(true);
    });
  });

  describe('SessionTracker', () => {
    let sessionTracker: SessionTracker;

    beforeEach(() => {
      sessionTracker = new SessionTracker();
    });

    it('tracks session duration and formatted readout', () => {
      sessionTracker.startSession({ serverAddress: 'mc.hypixel.net' });
      expect(sessionTracker.isTracking()).toBe(true);

      const snap = sessionTracker.getSessionSnapshot();
      expect(snap.sessionActive).toBe(true);
      expect(snap.serverAddress).toBe('mc.hypixel.net');
      expect(snap.durationSeconds).toBeGreaterThanOrEqual(0);
      expect(typeof snap.formattedDuration).toBe('string');
    });

    it('supports privacy opt-out which immediately stops tracking', () => {
      sessionTracker.startSession({ worldName: 'Survival World' });
      expect(sessionTracker.isTracking()).toBe(true);

      // Disable tracking
      sessionTracker.setTrackingEnabled(false);
      expect(sessionTracker.isTracking()).toBe(false);
      expect(sessionTracker.getSessionDurationSeconds()).toBe(0);

      const snap = sessionTracker.getSessionSnapshot();
      expect(snap.trackingEnabled).toBe(false);
      expect(snap.sessionActive).toBe(false);
      expect(snap.serverAddress).toBeNull();
      expect(snap.worldName).toBeNull();
    });

    it('ends session cleanly on world/server disconnect', () => {
      sessionTracker.startSession({ worldName: 'Lobby' });
      sessionTracker.endSession();
      expect(sessionTracker.isTracking()).toBe(false);
      expect(sessionTracker.getSessionDurationSeconds()).toBe(0);
    });
  });
});
