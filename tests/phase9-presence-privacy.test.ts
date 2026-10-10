import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { PrivacyService } from '../launcher/src/social/privacy-service';
import { PresenceService } from '../launcher/src/social/presence-service';
import { UserPresence } from '../shared/models/social';

describe('Phase 9: Presence & Privacy Redaction System', () => {
  let tempDir: string;
  let paths: FernPathManager;
  let logger: FernLogger;
  let privacyService: PrivacyService;
  let presenceService: PresenceService;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fern-privacy-phase9-'));
    paths = new FernPathManager(tempDir);
    await paths.initializeDirectories();
    logger = new FernLogger(paths);

    privacyService = new PrivacyService(paths, logger);
    await privacyService.initialize();

    presenceService = new PresenceService('test_user_1', privacyService, logger);
  });

  afterEach(() => {
    presenceService.destroy();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('manages privacy settings updates and disk persistence', async () => {
    const initial = await privacyService.getSettings();
    expect(initial.allowFriendRequests).toBe(true);
    expect(initial.invisibleMode).toBe(false);

    const updated = await privacyService.updateSettings({
      invisibleMode: true,
      showInstallationName: false,
    });

    expect(updated.invisibleMode).toBe(true);
    expect(privacyService.isInvisible()).toBe(true);

    const privFile = path.join(paths.getSocialDir(), 'privacy.json');
    expect(fs.existsSync(privFile)).toBe(true);
  });

  it('publishes playing presence with sanitized metadata', () => {
    presenceService.setPlaying('1.21.4', 'Fern Performance');
    const published = presenceService.getPublishedPresence();

    expect(published.state).toBe('playing_minecraft');
    expect(published.minecraftVersion).toBe('1.21.4');
    expect(published.sessionStartTime).toBeDefined();
  });

  it('completely redacts presence to offline when Invisible Mode is active', async () => {
    presenceService.setPlaying('1.21.4', 'Fern PvP');
    await privacyService.updateSettings({ invisibleMode: true });

    const published = presenceService.getPublishedPresence();
    expect(published.state).toBe('offline');
    expect(published.minecraftVersion).toBeUndefined();
    expect(published.installationName).toBeUndefined();
    expect(published.sessionStartTime).toBeUndefined();
  });

  it('redacts Minecraft version when showMinecraftVersion is disabled', async () => {
    presenceService.setPlaying('1.21.4', 'Fern Vanilla');
    await privacyService.updateSettings({ showMinecraftVersion: false });

    const published = presenceService.getPublishedPresence();
    expect(published.state).toBe('playing_minecraft');
    expect(published.minecraftVersion).toBeUndefined();
  });

  it('redacts playing status to launcher when showPlayingStatus is disabled', async () => {
    presenceService.setPlaying('1.21.4', 'Fern Modded');
    await privacyService.updateSettings({ showPlayingStatus: false });

    const published = presenceService.getPublishedPresence();
    expect(published.state).toBe('in_launcher');
    expect(published.minecraftVersion).toBeUndefined();
    expect(published.sessionStartTime).toBeUndefined();
  });

  it('notifies listeners when presence changes', () => {
    let notifiedPresence: UserPresence | null = null;
    const unsub = presenceService.subscribe((p) => {
      notifiedPresence = p;
    });

    expect(notifiedPresence).toBeDefined();
    expect((notifiedPresence as UserPresence | null)?.userId).toBe('test_user_1');

    unsub();
  });
});
