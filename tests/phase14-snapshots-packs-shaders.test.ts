import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { ConfigurationSnapshotService } from '../launcher/src/snapshots/configuration-snapshot-service';
import { SettingsManager } from '../launcher/src/settings/settings-manager';
import {
  ResourcePackProfileService,
  checkPackFormatCompatibility,
} from '../launcher/src/packs/resource-pack-profiles';
import {
  ShaderPresetService,
  BUILTIN_SHADER_PRESETS,
} from '../launcher/src/packs/shader-preset-service';

describe('Phase 14: Snapshots, Resource-Pack Profiles & Shader Presets', () => {
  let tmpDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let settingsManager: SettingsManager;
  let snapshotService: ConfigurationSnapshotService;
  let packProfileService: ResourcePackProfileService;
  let shaderPresetService: ShaderPresetService;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-p14-snap-pack-test-'));
    pathManager = new FernPathManager(tmpDir);
    logger = new FernLogger(pathManager);
    settingsManager = new SettingsManager(pathManager, logger);
    await settingsManager.load();

    snapshotService = new ConfigurationSnapshotService(pathManager, logger, settingsManager);
    packProfileService = new ResourcePackProfileService(pathManager, logger);
    shaderPresetService = new ShaderPresetService(pathManager, logger);

    await packProfileService.load();
    await shaderPresetService.load();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('Configuration Snapshots', () => {
    it('creates a configuration snapshot and scrubs authentication tokens and passwords', async () => {
      const snap = await snapshotService.createSnapshot({
        name: 'Pre-Benchmark Snapshot',
        description: 'Clean state before testing custom mods',
        settingsOverride: {
          theme: 'fern_dark',
          secret_token: 'SUPER_SECRET_123',
          authData: {
            accessToken: 'TOKEN_XYZ',
            userId: 'user_1',
          },
        },
      });

      expect(snap.id).toBeDefined();
      expect(snap.type).toBe('configuration_only');
      expect(snap.name).toBe('Pre-Benchmark Snapshot');

      // Retrieve content and verify scrubbing
      const content = await snapshotService.getSnapshot(snap.id);
      expect(content.settings.secret_token).toBe('[REDACTED_CREDENTIAL]');
      expect(content.settings.authData.accessToken).toBe('[REDACTED_CREDENTIAL]');
      expect(content.settings.authData.userId).toBe('user_1');
    });

    it('compares two snapshots and outputs structured differences', async () => {
      const snap1 = await snapshotService.createSnapshot({
        name: 'State 1',
        settingsOverride: {
          ui: { scale: 1.0, animations: true },
          theme: 'fern_dark',
        },
      });

      const snap2 = await snapshotService.createSnapshot({
        name: 'State 2',
        settingsOverride: {
          ui: { scale: 1.25, animations: false },
          theme: 'oled_midnight',
          extraFeature: true,
        },
      });

      const comparison = await snapshotService.compareSnapshots(snap1.id, snap2.id);
      expect(comparison.diffs.length).toBeGreaterThanOrEqual(3);

      const themeDiff = comparison.diffs.find((d) => d.path.includes('theme'));
      expect(themeDiff?.status).toBe('modified');
      expect(themeDiff?.previousValue).toBe('fern_dark');
      expect(themeDiff?.currentValue).toBe('oled_midnight');

      const extraDiff = comparison.diffs.find((d) => d.path.includes('extraFeature'));
      expect(extraDiff?.status).toBe('added');
    });

    it('restores a snapshot into settings manager safely', async () => {
      const snap = await snapshotService.createSnapshot({
        name: 'Restore Target',
        settingsOverride: {
          appearance: { theme: 'oled' },
          general: { checkUpdatesAutomatically: false },
        },
      });

      const result = await snapshotService.restoreSnapshot(snap.id);
      expect(result.restoredSettings).toBe(true);

      const activeSettings = settingsManager.getSettings();
      expect(activeSettings.appearance.theme).toBe('oled');
      expect(activeSettings.general.checkUpdatesAutomatically).toBe(false);
    });

    it('deletes a snapshot', async () => {
      const snap = await snapshotService.createSnapshot({ name: 'Disposable' });
      const deleted = await snapshotService.deleteSnapshot(snap.id);
      expect(deleted).toBe(true);

      const list = await snapshotService.listSnapshots();
      expect(list.some((s) => s.id === snap.id)).toBe(false);
    });
  });

  describe('Resource Pack Profiles & Compatibility', () => {
    it('creates, updates, and deletes pack profiles', async () => {
      const profile = await packProfileService.createProfile(
        'PvP Low-Res Loadout',
        '16x pack order for higher frame rate',
        ['faithful16x.zip', 'clean_particles.zip', 'vanilla']
      );

      expect(profile.id).toBeDefined();
      expect(profile.packNames.length).toBe(3);

      const updated = await packProfileService.updateProfile(profile.id, {
        name: 'Competitive PvP Loadout',
      });
      expect(updated.name).toBe('Competitive PvP Loadout');

      const deleted = await packProfileService.deleteProfile(profile.id);
      expect(deleted).toBe(true);
      expect(packProfileService.getProfile(profile.id)).toBeUndefined();
    });

    it('tracks favorites, notes, and tags per pack', async () => {
      const isFav1 = await packProfileService.toggleFavorite('faithful64x.zip');
      expect(isFav1).toBe(true);
      expect(packProfileService.isFavorite('faithful64x.zip')).toBe(true);

      await packProfileService.setNote('faithful64x.zip', 'High clarity textures for building');
      expect(packProfileService.getNote('faithful64x.zip')).toContain('High clarity');

      await packProfileService.setTags('faithful64x.zip', ['64x', 'faithful', 'clear']);
      expect(packProfileService.getTags('faithful64x.zip')).toContain('faithful');
    });

    it('accurately verifies pack format compatibility across Minecraft versions', () => {
      // 1.21.4 expects format 46
      const checkValid = checkPackFormatCompatibility(46, '1.21.4');
      expect(checkValid.isCompatible).toBe(true);

      // 1.21.4 with older pack format 15 (1.20)
      const checkOutdated = checkPackFormatCompatibility(15, '1.21.4');
      expect(checkOutdated.isCompatible).toBe(false);
      expect(checkOutdated.message).toContain('older Minecraft version');

      // 1.20.1 with newer pack format 46
      const checkNewer = checkPackFormatCompatibility(46, '1.20.1');
      expect(checkNewer.isCompatible).toBe(false);
      expect(checkNewer.message).toContain('newer Minecraft version');
    });

    it('applies resource pack loadout order into instance options.txt', async () => {
      const dummyGameDir = path.join(tmpDir, 'instance-dummy');
      await fs.mkdir(dummyGameDir, { recursive: true });

      const profile = await packProfileService.createProfile('Applied Profile', 'Testing apply', [
        'custom_ui.zip',
        'vanilla',
      ]);

      await packProfileService.applyProfileToInstance(dummyGameDir, profile.id);

      const optionsContent = await fs.readFile(path.join(dummyGameDir, 'options.txt'), 'utf-8');
      expect(optionsContent).toContain('resourcePacks:');
      expect(optionsContent).toContain('custom_ui.zip');
    });
  });

  describe('Shader & Visual Presets', () => {
    it('provides all 3 built-in shader presets', () => {
      const presets = shaderPresetService.getAllPresets();
      expect(presets.length).toBeGreaterThanOrEqual(3);

      const ids = presets.map((p) => p.id);
      expect(ids).toContain('shader-preset-vanilla-fast');
      expect(ids).toContain('shader-preset-balanced-iris');
      expect(ids).toContain('shader-preset-cinematic-ultra');
    });

    it('creates, renames, duplicates, and deletes user shader presets', async () => {
      const preset = await shaderPresetService.createPreset({
        name: 'BSL Soft Lighting',
        description: 'BSL shaders tuned for warm lighting',
        shaderPackName: 'BSL_v8.2.zip',
        performanceImpact: 'HIGH',
        options: {
          shaderPack: 'BSL_v8.2.zip',
          shadowDistance: 160,
        },
      });

      expect(preset.id).toBeDefined();
      expect(preset.performanceImpact).toBe('HIGH');

      const renamed = await shaderPresetService.renamePreset(preset.id, 'BSL Ultra Warm');
      expect(renamed.name).toBe('BSL Ultra Warm');

      const duplicate = await shaderPresetService.duplicatePreset(preset.id, 'BSL Copy');
      expect(duplicate.name).toBe('BSL Copy');
      expect(duplicate.options.shadowDistance).toBe(160);

      const deleted = await shaderPresetService.deletePreset(preset.id);
      expect(deleted).toBe(true);
      expect(shaderPresetService.getPreset(preset.id)).toBeUndefined();
    });

    it('validates shader loader compatibility in instance mods folder', async () => {
      const dummyGameDir = path.join(tmpDir, 'instance-shaders');
      const modsDir = path.join(dummyGameDir, 'mods');
      await fs.mkdir(modsDir, { recursive: true });

      // No mods -> incompatible
      const checkEmpty = await shaderPresetService.validateCompatibility(dummyGameDir);
      expect(checkEmpty.hasShaderLoader).toBe(false);
      expect(checkEmpty.warning).toBeDefined();

      // Add Iris mod -> compatible
      await fs.writeFile(path.join(modsDir, 'iris-1.7.0.jar'), 'dummy');
      const checkIris = await shaderPresetService.validateCompatibility(dummyGameDir);
      expect(checkIris.hasShaderLoader).toBe(true);
      expect(checkIris.detectedPipeline).toContain('Iris');
    });

    it('applies shader preset safely to optionsshaders.txt', async () => {
      const dummyGameDir = path.join(tmpDir, 'instance-shaders-apply');
      await fs.mkdir(dummyGameDir, { recursive: true });

      await shaderPresetService.applyPresetToInstance(
        dummyGameDir,
        'shader-preset-balanced-iris'
      );

      const content = await fs.readFile(path.join(dummyGameDir, 'optionsshaders.txt'), 'utf-8');
      expect(content).toContain('shaderPack=ComplementaryReimagined.zip');
      expect(content).toContain('shadowDistance=120');
    });
  });
});
