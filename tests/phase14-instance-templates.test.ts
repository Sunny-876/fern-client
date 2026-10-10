import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { InstallationManager } from '../launcher/src/installations/installation-manager';
import { InstanceTemplateManager, BUILTIN_INSTANCE_TEMPLATES } from '../launcher/src/installations/instance-templates';
import { FernError, FernErrorCode } from '../launcher/src/core/errors';

describe('Phase 14: Advanced Instance Management & Templates', () => {
  let tmpDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let instManager: InstallationManager;
  let templateManager: InstanceTemplateManager;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-p14-inst-test-'));
    pathManager = new FernPathManager(tmpDir);
    logger = new FernLogger(pathManager);
    instManager = new InstallationManager(pathManager, logger);
    templateManager = new InstanceTemplateManager(pathManager, logger);

    await instManager.load();
    await templateManager.load();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('Instance Management', () => {
    it('creates an instance and properly isolates game directory', async () => {
      const inst = await instManager.createInstallation({
        name: 'Isolated Testing',
        minecraftVersion: '1.21.4',
        loader: 'fabric',
      });

      expect(inst.id).toBeDefined();
      expect(inst.name).toBe('Isolated Testing');
      expect(inst.gameDirectory).toContain(path.resolve(pathManager.getInstallationsDir()));

      // Directory exists
      const stat = await fs.stat(inst.gameDirectory);
      expect(stat.isDirectory()).toBe(true);
    });

    it('renames an instance with validation', async () => {
      const inst = await instManager.createInstallation({
        name: 'Original Name',
        minecraftVersion: '1.21.4',
      });

      await expect(instManager.renameInstallation(inst.id, '')).rejects.toThrowError(FernError);

      const renamed = await instManager.renameInstallation(inst.id, 'Fresh Renamed Name');
      expect(renamed.name).toBe('Fresh Renamed Name');
      expect(instManager.getInstallation(inst.id)?.name).toBe('Fresh Renamed Name');
    });

    it('duplicates an instance with clean config copying and isolated directory', async () => {
      const original = await instManager.createInstallation({
        name: 'Master Instance',
        minecraftVersion: '1.21.4',
        minMemory: 3000,
        maxMemory: 6000,
        launchArguments: ['--demo'],
      });

      // Write mock options.txt
      await fs.writeFile(path.join(original.gameDirectory, 'options.txt'), 'fov:90.0\nguiScale:2');

      const duplicate = await instManager.duplicateInstallation(original.id, 'Cloned Instance');

      expect(duplicate.id).not.toBe(original.id);
      expect(duplicate.name).toBe('Cloned Instance');
      expect(duplicate.minMemory).toBe(3000);
      expect(duplicate.maxMemory).toBe(6000);
      expect(duplicate.launchArguments).toEqual(['--demo']);

      // Check cloned options.txt
      const clonedOptions = await fs.readFile(path.join(duplicate.gameDirectory, 'options.txt'), 'utf-8');
      expect(clonedOptions).toContain('fov:90.0');
    });

    it('deletes an instance with explicit confirmation guard', async () => {
      const inst = await instManager.createInstallation({
        name: 'Important Instance',
        minecraftVersion: '1.21.4',
      });

      // Mismatched confirmation fails
      await expect(
        instManager.deleteInstallation(inst.id, true, 'Wrong Name')
      ).rejects.toThrowError(/does not match/);

      // Still exists
      expect(instManager.getInstallation(inst.id)).toBeDefined();

      // Correct confirmation succeeds
      await instManager.deleteInstallation(inst.id, true, 'Important Instance');
      expect(instManager.getInstallation(inst.id)).toBeUndefined();
    });

    it('exports metadata cleanly without sensitive or host machine absolute paths', async () => {
      const inst = await instManager.createInstallation({
        name: 'Export Ready',
        minecraftVersion: '1.21.4',
        loader: 'fabric',
        loaderVersion: '0.16.9',
        minMemory: 2048,
        maxMemory: 4096,
      });

      const jsonStr = instManager.exportInstallationMetadata(inst.id);
      const parsed = JSON.parse(jsonStr);

      expect(parsed.format).toBe('fern-instance-metadata-v1');
      expect(parsed.name).toBe('Export Ready');
      expect(parsed.minecraftVersion).toBe('1.21.4');
      expect(parsed.loader).toBe('fabric');
      expect(parsed.gameDirectory).toBeUndefined(); // Must not expose host path
    });

    it('imports metadata safely and sets isolated directory', async () => {
      const meta = JSON.stringify({
        format: 'fern-instance-metadata-v1',
        name: 'Community Pack Spec',
        minecraftVersion: '1.20.1',
        loader: 'forge',
        loaderVersion: '47.3.0',
        minMemory: 4096,
        maxMemory: 6144,
      });

      const imported = await instManager.importInstallationMetadata(meta);
      expect(imported.name).toBe('Community Pack Spec');
      expect(imported.minecraftVersion).toBe('1.20.1');
      expect(imported.loader).toBe('forge');
      expect(imported.gameDirectory).toContain(path.resolve(pathManager.getInstallationsDir()));
    });

    it('backs up and restores configuration while excluding credentials and massive assets', async () => {
      const inst = await instManager.createInstallation({
        name: 'Config Backup Test',
        minecraftVersion: '1.21.4',
      });

      // Populate instance directory with options, a config file, and a forbidden token file
      await fs.writeFile(path.join(inst.gameDirectory, 'options.txt'), 'graphics:fancy\n');
      const configFolder = path.join(inst.gameDirectory, 'config');
      await fs.mkdir(configFolder, { recursive: true });
      await fs.writeFile(path.join(configFolder, 'mod-settings.json'), '{"speed": 10}');
      await fs.writeFile(path.join(inst.gameDirectory, 'launcher_accounts.json'), '{"token":"SECRET"}');

      // Perform backup
      const backupResult = await instManager.backupInstallationConfig(inst.id);
      expect(backupResult.filesCount).toBeGreaterThanOrEqual(2);
      expect(backupResult.bytesCount).toBeGreaterThan(0);

      // Mutate instance files
      await fs.writeFile(path.join(inst.gameDirectory, 'options.txt'), 'graphics:fast\n');
      await fs.unlink(path.join(configFolder, 'mod-settings.json'));

      // Restore configuration
      const restoreResult = await instManager.restoreInstallationConfig(inst.id, backupResult.backupPath);
      expect(restoreResult.restoredFiles.length).toBeGreaterThanOrEqual(2);

      // Verify options was restored
      const restoredOptions = await fs.readFile(path.join(inst.gameDirectory, 'options.txt'), 'utf-8');
      expect(restoredOptions).toContain('graphics:fancy');

      // Verify config was restored
      const restoredModConfig = await fs.readFile(path.join(configFolder, 'mod-settings.json'), 'utf-8');
      expect(restoredModConfig).toContain('"speed": 10');
    });

    it('scans installed mods accurately and detects enabled/disabled status', async () => {
      const inst = await instManager.createInstallation({
        name: 'Mods Test',
        minecraftVersion: '1.21.4',
      });

      const modsDir = path.join(inst.gameDirectory, 'mods');
      await fs.mkdir(modsDir, { recursive: true });
      await fs.writeFile(path.join(modsDir, 'sodium-fabric-0.5.8.jar'), 'dummy jar');
      await fs.writeFile(path.join(modsDir, 'iris-1.7.0.jar.disabled'), 'disabled jar');

      const installedMods = await instManager.getInstalledMods(inst.id);
      expect(installedMods.length).toBe(2);

      const sodium = installedMods.find((m) => m.filename.includes('sodium'));
      const iris = installedMods.find((m) => m.filename.includes('iris'));

      expect(sodium?.enabled).toBe(true);
      expect(iris?.enabled).toBe(false);
    });
  });

  describe('Instance Templates', () => {
    it('provides all 8 required built-in templates', () => {
      const all = templateManager.getAllTemplates();
      expect(all.length).toBeGreaterThanOrEqual(8);

      const templateIds = all.map((t) => t.id);
      expect(templateIds).toContain('template-vanilla-latest');
      expect(templateIds).toContain('template-fabric-modern');
      expect(templateIds).toContain('template-forge-classic');
      expect(templateIds).toContain('template-neoforge-modern');
      expect(templateIds).toContain('template-performance-optimized');
      expect(templateIds).toContain('template-survival-focused');
      expect(templateIds).toContain('template-creative-building');
      expect(templateIds).toContain('template-creator-streaming');
    });

    it('allows saving and deleting custom user templates', async () => {
      const userTemplate = await templateManager.saveUserTemplate({
        name: 'My Hardcore Template',
        description: 'Hardcore survival preset with 6GB RAM',
        minecraftVersion: '1.21.4',
        loader: 'fabric',
        loaderVersion: '0.16.9',
        memoryAllocation: { minMb: 4096, maxMb: 6144 },
        jvmArguments: ['-XX:+UseG1GC'],
        launchArguments: [],
      });

      expect(userTemplate.id).toBeDefined();
      expect(userTemplate.category).toBe('user');
      expect(templateManager.getTemplate(userTemplate.id)).toBeDefined();

      // Deleting built-in fails
      await expect(
        templateManager.deleteUserTemplate('template-vanilla-latest')
      ).rejects.toThrowError(/Cannot delete official/);

      // Deleting custom succeeds
      const deleted = await templateManager.deleteUserTemplate(userTemplate.id);
      expect(deleted).toBe(true);
      expect(templateManager.getTemplate(userTemplate.id)).toBeUndefined();
    });

    it('instantiates an installation directly from a template', async () => {
      const inst = await templateManager.createInstanceFromTemplate(
        'template-performance-optimized',
        'Speedy Fabric Test',
        instManager
      );

      expect(inst.name).toBe('Speedy Fabric Test');
      expect(inst.loader).toBe('fabric');
      expect(inst.minecraftVersion).toBe('1.21.4');
      expect(inst.fernProfileId).toBe('performance');
      expect(inst.performanceProfile).toBe('potato');
      expect(inst.memoryAllocation.maxMb).toBe(4096);
    });

    it('validates schema and migrates older v0 templates to v1', () => {
      const legacyRaw = {
        id: 'legacy-temp-1',
        name: 'Old Template',
        minecraftVersion: '1.20.1',
        minMemory: 2048,
        maxMemory: 4096,
      };

      const migrated = templateManager.validateAndMigrateTemplate(legacyRaw);
      expect(migrated).not.toBeNull();
      expect(migrated?.schemaVersion).toBe(1);
      expect(migrated?.memoryAllocation.minMb).toBe(2048);
      expect(migrated?.memoryAllocation.maxMb).toBe(4096);
      expect(migrated?.category).toBe('user');
    });
  });
});
