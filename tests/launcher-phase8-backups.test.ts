import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BackupService } from '../launcher/src/core/backup-service';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { InstallationManager } from '../launcher/src/installations/installation-manager';
import { SettingsManager } from '../launcher/src/settings/settings-manager';
import { ProfileManager } from '../launcher/src/installations/profile-manager';

describe('Phase 8: Backup & Recovery System', () => {
  let tempDir: string;
  let paths: FernPathManager;
  let logger: FernLogger;
  let instManager: InstallationManager;
  let settingsManager: SettingsManager;
  let profileManager: ProfileManager;
  let backupService: BackupService;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fern-backups-phase8-'));
    paths = new FernPathManager(tempDir);
    await paths.initializeDirectories();
    logger = new FernLogger(paths);

    instManager = new InstallationManager(paths, logger);
    await instManager.load();

    settingsManager = new SettingsManager(paths, logger);
    await settingsManager.load();

    profileManager = new ProfileManager(paths, logger);
    await profileManager.load();

    backupService = new BackupService(paths, logger, instManager, settingsManager, profileManager);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('creates configuration backup and strictly excludes authentication tokens', async () => {
    const backup = await backupService.createConfigBackup('My Settings Backup');

    expect(backup.id).toBeDefined();
    expect(backup.type).toBe('config');
    expect(backup.name).toBe('My Settings Backup');

    // Backup archive file exists
    const manifestPath = path.join(paths.getBaseDir(), 'backups', backup.id, 'backup-manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const rawBackupContent = fs.readFileSync(manifestPath, 'utf8');
    const parsed = JSON.parse(rawBackupContent);

    // Metadata is present
    expect(parsed.id).toBe(backup.id);
    expect(parsed.type).toBe('config');
    expect(parsed.files).toContain('settings.json');

    // STRICT PRIVACY ASSERTION: No auth tokens or passwords
    expect(rawBackupContent).not.toContain('accessToken');
    expect(rawBackupContent).not.toContain('refreshToken');
    expect(rawBackupContent).not.toContain('password');
  });

  it('lists and validates existing backups', async () => {
    await backupService.createConfigBackup('Backup 1');
    await backupService.createConfigBackup('Backup 2');

    const list = await backupService.listBackups();
    expect(list.length).toBe(2);

    // Validate a valid backup
    const validation = await backupService.validateBackup(list[0].id);
    expect(validation.isValid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });

  it('detects corrupted or tampered backup files gracefully', async () => {
    const corruptedId = 'corrupted-backup-xyz';
    const corruptedDir = path.join(paths.getBaseDir(), 'backups', corruptedId);
    fs.mkdirSync(corruptedDir, { recursive: true });
    const corruptedPath = path.join(corruptedDir, 'backup-manifest.json');
    fs.writeFileSync(corruptedPath, '{ invalid-json-content-no-manifest', 'utf8');

    const validation = await backupService.validateBackup(corruptedId);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('safely restores configuration from a backup', async () => {
    // Change a setting
    await settingsManager.updateSettings({
      general: { ...settingsManager.getSettings().general, keepLauncherOpen: 'close' },
    });
    expect(settingsManager.getSettings().general.keepLauncherOpen).toBe('close');

    // Create backup with this state
    const backup = await backupService.createConfigBackup('State With Close');

    // Change setting to something else
    await settingsManager.updateSettings({
      general: { ...settingsManager.getSettings().general, keepLauncherOpen: 'keep' },
    });
    expect(settingsManager.getSettings().general.keepLauncherOpen).toBe('keep');

    // Restore backup
    const restored = await backupService.restoreBackup(backup.id);
    expect(restored.success).toBe(true);

    // Reload settings and assert original state was restored
    await settingsManager.load();
    expect(settingsManager.getSettings().general.keepLauncherOpen).toBe('close');
  });
});
