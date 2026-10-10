import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ScreenshotManager } from '../client/src/modules/utility/ScreenshotManager';
import { NotificationManager } from '../client/src/notifications/NotificationManager';
import { EventBus } from '../client/src/events/EventBus';

describe('Phase 7 - Screenshot Manager', () => {
  let tempDir: string;
  let notifManager: NotificationManager;
  let eventBus: EventBus;
  let screenshotManager: ScreenshotManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fern-screenshot-test-'));
    notifManager = new NotificationManager();
    eventBus = new EventBus();
    screenshotManager = new ScreenshotManager(tempDir, notifManager, eventBus);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignored
    }
  });

  it('records screenshots with metadata and emits notification', () => {
    let notifiedMessage = '';
    notifManager.onNotification((n) => {
      notifiedMessage = n.message;
    });

    const entry = screenshotManager.recordScreenshot('2026-10-09_12.00.00.png', 1048576);

    expect(entry.id).toBeDefined();
    expect(entry.filename).toBe('2026-10-09_12.00.00.png');
    expect(entry.sizeBytes).toBe(1048576);
    expect(entry.timestamp).toBeGreaterThan(0);
    expect(entry.fullPath).toContain('screenshots');
    expect(notifiedMessage).toContain('Screenshot saved: 2026-10-09_12.00.00.png');
  });

  it('scans screenshots directory for existing image files', async () => {
    const dir = screenshotManager.getScreenshotDirectory();
    fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(path.join(dir, 'mc_screenshot_1.png'), 'fake-image-bytes-1');
    fs.writeFileSync(path.join(dir, 'mc_screenshot_2.png'), 'fake-image-bytes-2');
    fs.writeFileSync(path.join(dir, 'ignore_me.txt'), 'text file');

    const scanned = await screenshotManager.scanDirectory();

    expect(scanned.length).toBe(2);
    expect(scanned.some((s) => s.filename === 'mc_screenshot_1.png')).toBe(true);
    expect(scanned.some((s) => s.filename === 'mc_screenshot_2.png')).toBe(true);
    expect(scanned.some((s) => s.filename === 'ignore_me.txt')).toBe(false);
  });

  it('deletes screenshots from history and disk', async () => {
    const dir = screenshotManager.getScreenshotDirectory();
    fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, 'delete_test.png');
    fs.writeFileSync(filePath, 'test-data');

    const entry = screenshotManager.recordScreenshot(filePath, 9);
    expect(fs.existsSync(filePath)).toBe(true);

    const deleted = await screenshotManager.deleteScreenshot(entry.id);
    expect(deleted).toBe(true);
    expect(fs.existsSync(filePath)).toBe(false);
    expect(screenshotManager.getScreenshot(entry.id)).toBeUndefined();
  });

  it('returns sorted screenshots in descending order of capture time', () => {
    screenshotManager.recordScreenshot('ss_old.png', 0, 1000);
    screenshotManager.recordScreenshot('ss_new.png', 0, 2000);

    const all = screenshotManager.getAllScreenshots();
    expect(all[0].filename).toBe('ss_new.png');
    expect(all[1].filename).toBe('ss_old.png');
  });
});
