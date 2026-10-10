import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { InstallationManager } from '../launcher/src/installations/installation-manager';
import { ProfileManager } from '../launcher/src/installations/profile-manager';

describe('InstallationManager & ProfileManager', () => {
  let tempDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let instManager: InstallationManager;
  let profileManager: ProfileManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-inst-test-'));
    pathManager = new FernPathManager(tempDir);
    logger = new FernLogger(pathManager);
    instManager = new InstallationManager(pathManager, logger);
    profileManager = new ProfileManager(pathManager, logger);
    await instManager.load();
    await profileManager.load();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('populates default installations when none exist', () => {
    const installations = instManager.getInstallations();
    expect(installations.length).toBeGreaterThan(0);
    const fabric = installations.find((i) => i.loader === 'fabric');
    expect(fabric).toBeDefined();
    expect(fabric?.minecraftVersion).toBe('1.21.4');
  });

  it('creates custom installations with specified loaders', async () => {
    const inst = await instManager.createInstallation({
      name: 'NeoForge Testing',
      minecraftVersion: '1.20.4',
      loader: 'neoforge',
      memoryAllocation: { minMb: 3072, maxMb: 8192 },
    });

    expect(inst.id).toBeDefined();
    expect(inst.name).toBe('NeoForge Testing');
    expect(inst.loader).toBe('neoforge');
    expect(inst.memoryAllocation.maxMb).toBe(8192);

    const retrieved = instManager.getInstallation(inst.id);
    expect(retrieved?.id).toBe(inst.id);
  });

  it('deletes installation and updates active pointer', async () => {
    const inst = await instManager.createInstallation({
      name: 'To Delete',
      minecraftVersion: '1.21.1',
      loader: 'vanilla',
    });

    await instManager.selectInstallation(inst.id);
    expect(instManager.getActiveInstallation()?.id).toBe(inst.id);

    await instManager.deleteInstallation(inst.id);
    expect(instManager.getInstallation(inst.id)).toBeUndefined();
    expect(instManager.getActiveInstallation()?.id).not.toBe(inst.id);
  });

  it('creates and manages Fern profiles', async () => {
    const profile = await profileManager.createProfile({
      name: 'PvP Ultra Profile',
      installationId: 'fabric-1-21-4',
      minecraftVersion: '1.21.4',
      ramMb: 6144,
      mods: ['sodium', 'lithium', 'iris'],
      launchArguments: ['--fast-render'],
    });

    expect(profile.id).toBeDefined();
    expect(profile.name).toBe('PvP Ultra Profile');
    expect(profile.mods).toContain('sodium');

    await profileManager.selectProfile(profile.id);
    expect(profileManager.getActiveProfile()?.id).toBe(profile.id);
  });

  it('updates installation properties', async () => {
    const inst = await instManager.createInstallation({
      name: 'Old Name',
      minecraftVersion: '1.21.1',
      maxMemory: 4096,
    });

    const updated = await instManager.updateInstallation(inst.id, {
      name: 'New Custom Name',
      maxMemory: 8192,
      minMemory: 2048,
    });

    expect(updated.name).toBe('New Custom Name');
    expect(updated.maxMemory).toBe(8192);
    expect(updated.minMemory).toBe(2048);

    const reloaded = instManager.getInstallation(inst.id);
    expect(reloaded?.name).toBe('New Custom Name');
  });

  it('duplicates installation with copy suffix', async () => {
    const inst = await instManager.createInstallation({
      name: 'Base Survival',
      minecraftVersion: '1.21.4',
      maxMemory: 6144,
    });

    const duplicate = await instManager.duplicateInstallation(inst.id);
    expect(duplicate.id).not.toBe(inst.id);
    expect(duplicate.name).toBe('Base Survival (Copy)');
    expect(duplicate.minecraftVersion).toBe('1.21.4');
    expect(duplicate.maxMemory).toBe(6144);
    expect(duplicate.status).toBe('NOT_INSTALLED');
  });

  it('updates installation lifecycle status', async () => {
    const inst = await instManager.createInstallation({
      name: 'Status Test',
      minecraftVersion: '1.21.4',
    });

    expect(inst.status).toBe('NOT_INSTALLED');

    await instManager.setInstallationStatus(inst.id, 'INSTALLING');
    expect(instManager.getInstallation(inst.id)?.status).toBe('INSTALLING');

    await instManager.setInstallationStatus(inst.id, 'INSTALLED');
    expect(instManager.getInstallation(inst.id)?.status).toBe('INSTALLED');
  });
});
