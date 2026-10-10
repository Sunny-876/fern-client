import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { CrashAnalyzer } from '../launcher/src/core/crash-analyzer';
import { SettingsManager } from '../launcher/src/settings/settings-manager';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { MinecraftProcessManager } from '../launcher/src/core/process';
import { FernLauncherService } from '../launcher/src/core/launcher-service';
import { InstallationManager } from '../launcher/src/installations/installation-manager';
import { AccountManager } from '../launcher/src/accounts/account-manager';
import { JavaManager } from '../launcher/src/java/java-manager';
import { VersionService } from '../launcher/src/versions/version-service';
import { MinecraftInstallerService } from '../launcher/src/installations/installer-service';
import { ProfileManager } from '../launcher/src/installations/profile-manager';
import { DownloadManager } from '../launcher/src/downloads/download-manager';

describe('Phase 11 - Safe Mode & Crash Recovery', () => {
  let tempDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let settingsManager: SettingsManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-safemode-test-'));
    pathManager = new FernPathManager(tempDir);
    await pathManager.initializeDirectories();
    logger = new FernLogger(pathManager);
    settingsManager = new SettingsManager(pathManager, logger);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe('Crash Log Diagnostic Detection', () => {
    it('detects Java version incompatibility and suggests appropriate action', () => {
      const log = 'Exception in thread "main" java.lang.UnsupportedClassVersionError: net/minecraft/client/main/Main has been compiled by a more recent version of the Java Runtime (class file version 65.0), this version of the Java Runtime only recognizes class file versions up to 61.0';
      const result = CrashAnalyzer.parseLogContent(log, 1);

      expect(result.hasCrash).toBe(true);
      expect(result.category).toBe('java_version');
      expect(result.possibleCause).toContain('Java version incompatible');
      expect(result.suggestedAction).toContain('Open Java Settings and select a compatible Java runtime');
    });

    it('detects OutOfMemory errors and suggests RAM increase', () => {
      const log = 'Exception in thread "Client thread" java.lang.OutOfMemoryError: Java heap space\n\tat java.base/java.nio.ByteBuffer.allocateDirect(ByteBuffer.java:330)';
      const result = CrashAnalyzer.parseLogContent(log, 1);

      expect(result.hasCrash).toBe(true);
      expect(result.category).toBe('out_of_memory');
      expect(result.possibleCause).toContain('Out of memory');
      expect(result.suggestedAction).toContain('Increase allocated RAM');
    });

    it('detects mod and Mixin application conflicts and suggests Safe Mode', () => {
      const log = 'net.fabricmc.loader.impl.FormattedException: org.spongepowered.asm.mixin.transformer.throwables.MixinApplyError: Mixin [sodium.mixins.json:features.buffer_builder.MixinBufferBuilder] from mod [sodium] failed injection';
      const result = CrashAnalyzer.parseLogContent(log, 1);

      expect(result.hasCrash).toBe(true);
      expect(result.category).toBe('mod_conflict');
      expect(result.suggestedAction).toContain('Safe Mode');
    });

    it('detects missing dependencies and required libraries', () => {
      const log = 'java.lang.NoClassDefFoundError: net/fabricmc/fabric/api/client/rendering/v1/HudRenderCallback';
      const result = CrashAnalyzer.parseLogContent(log, 1);

      expect(result.hasCrash).toBe(true);
      expect(result.category).toBe('missing_dependency');
      expect(result.suggestedAction).toContain('Fabric API');
    });
  });

  describe('Configuration Corruption Recovery', () => {
    it('gracefully recovers from corrupted settings.json without crashing', async () => {
      const settingsPath = pathManager.getSettingsFilePath();
      await fs.writeFile(settingsPath, '{ "corruptedJson": true, unexpected_token', 'utf-8');

      const loaded = await settingsManager.load();
      expect(loaded).toBeDefined();
      expect(loaded.version).toBe(1);
      expect(loaded.general.keepLauncherOpen).toBe('keep');
    });
  });

  describe('Safe Mode Launch Execution', () => {
    it('injects Safe Mode JVM arguments and game flags during dry-run', async () => {
      await settingsManager.load();
      const accountManager = new AccountManager(pathManager, logger);
      const installationManager = new InstallationManager(pathManager, logger);
      const javaManager = new JavaManager(pathManager, logger);
      const downloadManager = new DownloadManager(logger);
      const versionService = new VersionService(pathManager, logger);
      const installerService = new MinecraftInstallerService(pathManager, versionService, downloadManager, logger);
      const profileManager = new ProfileManager(pathManager, logger);

      await accountManager.load();
      await installationManager.load();
      await profileManager.load();

      const acc = await accountManager.createLocalAccount({ displayName: 'SafePlayer' });
      const inst = await installationManager.createInstallation({
        name: 'SafeTest',
        minecraftVersion: '1.21.4',
        loader: 'vanilla',
      });

      const processManager = new MinecraftProcessManager(logger);
      const launcherService = new FernLauncherService(
        pathManager,
        logger,
        accountManager,
        installationManager,
        profileManager,
        javaManager,
        settingsManager,
        versionService,
        installerService,
        processManager
      );

      const result = await launcherService.launch({
        accountId: acc.id,
        installationId: inst.id,
        dryRun: true,
        safeMode: true,
      });

      expect(result.success).toBe(true);
      expect(result.args).toContain('-Dfern.safemode=true');
      expect(result.args).toContain('--fernSafeMode');
    }, 15000);
  });
});
