import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { ScreenshotManager } from '../launcher/src/creator/screenshot-manager';
import { ReplaySessionService } from '../launcher/src/creator/replay-service';
import { WorkspaceManager, BUILTIN_WORKSPACES } from '../launcher/src/workspaces/workspace-manager';
import { GlobalSearchService } from '../launcher/src/search/global-search-service';
import { ProfileManager } from '../client/src/profiles/ProfileManager';
import { HUDManager } from '../client/src/hud/HUDManager';
import { ModuleManager } from '../client/src/modules/ModuleManager';
import { EventBus } from '../client/src/events/EventBus';
import { KeybindManager } from '../client/src/keybinds/KeybindManager';
import { ThemeManager } from '../client/src/theme/ThemeManager';
import { createZipArchive } from '../launcher/src/utils/zip';

describe('Phase 14: Creator Workflows, Replay, Profiles, Workspaces & Search', () => {
  let tmpDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let screenshotManager: ScreenshotManager;
  let replayService: ReplaySessionService;
  let workspaceManager: WorkspaceManager;
  let searchService: GlobalSearchService;
  let profileManager: ProfileManager;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-p14-creator-test-'));
    pathManager = new FernPathManager(tmpDir);
    logger = new FernLogger(pathManager);

    screenshotManager = new ScreenshotManager(pathManager, logger);
    replayService = new ReplaySessionService(logger);
    workspaceManager = new WorkspaceManager(pathManager, logger);
    searchService = new GlobalSearchService();

    const hudManager = new HUDManager();
    const eventBus = new EventBus();
    const moduleManager = new ModuleManager(eventBus);
    const keybindManager = new KeybindManager(eventBus);
    const themeManager = new ThemeManager();
    profileManager = new ProfileManager(hudManager, moduleManager, keybindManager, themeManager);

    await screenshotManager.load();
    await workspaceManager.load();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('Creator Workflows & Screenshot Browser', () => {
    it('scans screenshots, parses metadata, and filters by query and tags', async () => {
      const globalShotsDir = pathManager.getScreenshotsDir();
      await fs.mkdir(globalShotsDir, { recursive: true });

      const shot1Path = path.join(globalShotsDir, '2026-10-09_12.00.00.png');
      const shot2Path = path.join(globalShotsDir, '2026-10-09_14.30.00.png');
      await fs.writeFile(shot1Path, 'fake-png-1');
      await fs.writeFile(shot2Path, 'fake-png-2');

      const scanned = await screenshotManager.scanScreenshots();
      expect(scanned.length).toBe(2);

      // Add tag and mark favorite
      await screenshotManager.addTag('2026-10-09_12.00.00.png', 'Base');
      await screenshotManager.toggleFavorite('2026-10-09_12.00.00.png');

      const rescanned = await screenshotManager.scanScreenshots();
      const filteredFav = screenshotManager.filterScreenshots(rescanned, { favoriteOnly: true });
      expect(filteredFav.length).toBe(1);
      expect(filteredFav[0].filename).toBe('2026-10-09_12.00.00.png');

      const filteredTag = screenshotManager.filterScreenshots(rescanned, { tag: 'Base' });
      expect(filteredTag.length).toBe(1);
    });

    it('verifies screenshot existence and handles missing files gracefully', async () => {
      const validPath = path.join(tmpDir, 'valid.png');
      await fs.writeFile(validPath, 'img');

      const checkValid = await screenshotManager.verifyScreenshotFile(validPath);
      expect(checkValid.exists).toBe(true);

      const checkMissing = await screenshotManager.verifyScreenshotFile(path.join(tmpDir, 'nonexistent.png'));
      expect(checkMissing.exists).toBe(false);
    });

    it('exports a selected collection of screenshots to a zip archive', async () => {
      const shot1 = path.join(tmpDir, 'shot1.png');
      const shot2 = path.join(tmpDir, 'shot2.png');
      await fs.writeFile(shot1, 'image-data-1');
      await fs.writeFile(shot2, 'image-data-2');

      const zipDest = path.join(tmpDir, 'exports', 'collection.zip');
      const result = await screenshotManager.exportCollection([shot1, shot2], zipDest);

      expect(result.filesExported).toBe(2);
      expect(result.totalBytes).toBeGreaterThan(0);

      const exists = await fs.stat(zipDest);
      expect(exists.isFile()).toBe(true);
    });
  });

  describe('Replay Integration Architecture', () => {
    it('detects ReplayMod in instance mods directory', async () => {
      const instDir = path.join(tmpDir, 'inst-replay');
      const modsDir = path.join(instDir, 'mods');
      await fs.mkdir(modsDir, { recursive: true });

      // Missing
      const emptyCheck = await replayService.detectReplaySupport(instDir);
      expect(emptyCheck.installed).toBe(false);

      // Present
      await fs.writeFile(path.join(modsDir, 'replaymod-1.21.4-2.6.20.jar'), 'dummy');
      const presentCheck = await replayService.detectReplaySupport(instDir);
      expect(presentCheck.installed).toBe(true);
      expect(presentCheck.compatible).toBe(true);
    });

    it('scans .mcpr files, parses metadata safely, and correlates with screenshots', async () => {
      const instDir = path.join(tmpDir, 'inst-recordings');
      const recDir = path.join(instDir, 'replay_recordings');
      await fs.mkdir(recDir, { recursive: true });

      const recordedTime = Date.now() - 300000;
      const durationMs = 120000; // 2 minutes

      // Construct a mock .mcpr archive with recording.json
      const metaContent = JSON.stringify({
        duration: durationMs,
        date: recordedTime,
        mcversion: '1.21.4',
        players: ['PlayerOne', 'FernTester'],
        serverName: 'mc.fernclient.com',
      });

      const mcprBuffer = createZipArchive([
        { relativePath: 'recording.json', content: metaContent },
      ]);

      const mcprPath = path.join(recDir, 'session_2026_10_09.mcpr');
      await fs.writeFile(mcprPath, mcprBuffer);

      const scanned = await replayService.scanRecordings(instDir);
      expect(scanned.length).toBe(1);
      expect(scanned[0].metadata?.minecraftVersion).toBe('1.21.4');
      expect(scanned[0].metadata?.players).toContain('PlayerOne');
      expect(scanned[0].metadata?.durationMs).toBe(durationMs);

      // Correlate with mock screenshots
      const mockScreenshots = [
        {
          id: 's1',
          filename: 'during_session.png',
          fullPath: '/during.png',
          sizeBytes: 100,
          capturedAt: recordedTime + 30000, // inside session window
          favorite: false,
          tags: [],
          available: true,
        },
        {
          id: 's2',
          filename: 'hours_later.png',
          fullPath: '/later.png',
          sizeBytes: 100,
          capturedAt: recordedTime + 1000000, // outside session window
          favorite: false,
          tags: [],
          available: true,
        },
      ];

      const linked = replayService.correlateWithScreenshots(scanned[0], mockScreenshots);
      expect(linked.length).toBe(1);
      expect(linked[0].filename).toBe('during_session.png');
    });

    it('exposes licensing and constraint boundaries', () => {
      const doc = replayService.getDocumentation();
      expect(doc.license).toContain('GPLv3');
      expect(doc.distributionConstraint).toBeDefined();
    });
  });

  describe('Context-Aware Client Profiles', () => {
    it('provides all 6 required context-aware profile presets', () => {
      const all = profileManager.getAllProfiles();
      const ids = all.map((p) => p.id);

      expect(ids).toContain('minimal');
      expect(ids).toContain('performance');
      expect(ids).toContain('pvp');
      expect(ids).toContain('survival');
      expect(ids).toContain('building');
      expect(ids).toContain('streaming');
    });

    it('previews differences before applying a profile', () => {
      profileManager.switchProfile('default');
      const preview = profileManager.previewProfile('performance');

      expect(preview).not.toBeNull();
      expect(preview?.targetProfileId).toBe('performance');
      expect(preview?.performanceDiff.to).toBe('potato');
      expect(preview?.moduleDiff.enabled).toBeDefined();
    });

    it('saves previous configuration and restores it cleanly on demand', () => {
      profileManager.switchProfile('default');
      expect(profileManager.getActiveProfileId()).toBe('default');

      // Switch to survival with rollback capture
      profileManager.switchProfile('survival');
      expect(profileManager.getActiveProfileId()).toBe('survival');

      // Rollback to previous profile
      const restored = profileManager.restorePreviousProfile();
      expect(restored).toBe(true);
      expect(profileManager.getActiveProfileId()).toBe('default');
    });
  });

  describe('Contextual Workspaces', () => {
    it('initializes with all 4 built-in workspaces', () => {
      const workspaces = workspaceManager.getWorkspaces();
      expect(workspaces.length).toBeGreaterThanOrEqual(4);

      const ids = workspaces.map((w) => w.id);
      expect(ids).toContain('ws-main');
      expect(ids).toContain('ws-survival');
      expect(ids).toContain('ws-performance');
      expect(ids).toContain('ws-creator');
    });

    it('creates, switches, and deletes workspaces safely', async () => {
      const created = await workspaceManager.createWorkspace({
        name: 'Timelapse Setup',
        description: 'Workspace for recording timelapse sequences',
        installationId: 'fabric-1-21-4',
        fernProfileId: 'streaming',
        activeTab: 'creator',
      });

      expect(created.id).toBeDefined();
      expect(workspaceManager.getWorkspace(created.id)).toBeDefined();

      const switched = await workspaceManager.switchWorkspace(created.id);
      expect(switched.name).toBe('Timelapse Setup');
      expect(workspaceManager.getActiveWorkspaceId()).toBe(created.id);

      const deleted = await workspaceManager.deleteWorkspace(created.id);
      expect(deleted).toBe(true);
      expect(workspaceManager.getActiveWorkspaceId()).toBe('ws-main'); // Fell back safely
    });

    it('validates and auto-repairs workspace references when targets are removed', async () => {
      await workspaceManager.createWorkspace({
        name: 'Orphaned Workspace',
        description: 'References an instance that will be deleted',
        installationId: 'deleted-instance-id',
        fernProfileId: 'deleted-profile-id',
      });

      const audit = await workspaceManager.validateReferences(['fabric-1-21-4'], ['default']);
      expect(audit.repairedCount).toBeGreaterThan(0);
      expect(audit.warnings.length).toBeGreaterThan(0);

      const repaired = workspaceManager.getWorkspaces().find((w) => w.name === 'Orphaned Workspace');
      expect(repaired?.installationId).toBe('fabric-1-21-4');
      expect(repaired?.fernProfileId).toBe('default');
    });
  });

  describe('Global Search Service', () => {
    it('searches accurately across modules, HUD, settings, themes, and docs', () => {
      const fpsResults = searchService.search('fps');
      expect(fpsResults.length).toBeGreaterThan(0);
      expect(fpsResults[0].title).toContain('FPS');

      const ramResults = searchService.search('memory');
      expect(ramResults.length).toBeGreaterThan(0);
      expect(ramResults[0].category).toBe('setting');

      const themeResults = searchService.search('oled');
      expect(themeResults.length).toBeGreaterThan(0);
      expect(themeResults[0].category).toBe('theme');

      const shortcutResults = searchService.search('shortcuts');
      expect(shortcutResults.length).toBeGreaterThan(0);
      expect(shortcutResults[0].category).toBe('docs');
    });

    it('ranks exact and prefix keyword matches higher', () => {
      const results = searchService.search('coordinates');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBe('Coordinates HUD');
    });
  });
});
