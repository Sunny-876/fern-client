import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import {
  LaunchConfiguration,
  LaunchResult,
  LaunchStatusUpdate,
} from '../../../shared/models/launch';
import {
  MinecraftVersionPackage,
  OSCompatibilityRule,
  ArgumentEntry,
} from '../../../shared/models/version';
import { FernPathManager } from './paths';
import { FernLogger } from './logger';
import { FernError, FernErrorCode } from './errors';
import { AccountManager } from '../accounts/account-manager';
import { InstallationManager } from '../installations/installation-manager';
import { ProfileManager } from '../installations/profile-manager';
import { JavaManager } from '../java/java-manager';
import { SettingsManager } from '../settings/settings-manager';
import { VersionService } from '../versions/version-service';
import { MinecraftInstallerService } from '../installations/installer-service';
import { MinecraftProcessManager } from './process';
import { ModLoaderManager } from '../loaders/loader-manager';
import { LauncherPerformanceManager } from '../performance/performance-manager';
import { CrashAnalyzer } from './crash-analyzer';
import { CompatibilityEngine, CompatibilityReport } from '../compatibility/compatibility-engine';
import { LaunchArgumentValidator } from './launch-arguments';

export type LaunchStatusListener = (status: LaunchStatusUpdate) => void;

export class FernLauncherService {
  private statusListeners: Set<LaunchStatusListener> = new Set();

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger,
    private accountManager: AccountManager,
    private installationManager: InstallationManager,
    private profileManager: ProfileManager,
    private javaManager: JavaManager,
    private settingsManager: SettingsManager,
    private versionService: VersionService,
    private installerService: MinecraftInstallerService,
    private processManager: MinecraftProcessManager,
    private loaderManager?: ModLoaderManager,
    private performanceManager?: LauncherPerformanceManager
  ) {}

  public onStatusChange(listener: LaunchStatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private emitStatus(update: LaunchStatusUpdate): void {
    for (const listener of this.statusListeners) {
      try {
        listener(update);
      } catch (err) {
        this.logger.error('LauncherService', 'Error in status listener:', err);
      }
    }
  }

  /**
   * Orchestrates the complete Minecraft launch pipeline:
   * 1. Validate Account
   * 2. Validate Installation & Prevent Duplicates
   * 3. Validate Java Runtime & Compatibility
   * 4. Validate Required Files
   * 5. Prepare Classpath
   * 6. Prepare JVM & Game Arguments
   * 7. Spawn & Track Process
   */
  public async launch(config: LaunchConfiguration): Promise<LaunchResult> {
    this.logger.info('LauncherService', `Initiating launch sequence for installation: ${config.installationId}`);
    this.performanceManager?.startupTimer.markPreparationStart();

    // Step 1: Validate account
    this.emitStatus({ stage: 'validating_account', message: 'Validating player profile...', percentage: 10 });
    const account = config.accountId
      ? this.accountManager.getAccount(config.accountId)
      : this.accountManager.getActiveAccount();

    if (!account) {
      const err = new FernError(
        FernErrorCode.ACCOUNT_NOT_FOUND,
        'No active player account selected.',
        'Please add or select a player profile on the Accounts page before launching.'
      );
      this.emitStatus({ stage: 'error', message: err.message, percentage: 10, error: err.message });
      throw err;
    }

    // Step 2: Validate installation
    this.emitStatus({ stage: 'validating_installation', message: 'Validating installation configuration...', percentage: 20 });
    const installation = this.installationManager.getInstallation(config.installationId);
    if (!installation) {
      const err = new FernError(
        FernErrorCode.INSTALLATION_NOT_FOUND,
        `Installation "${config.installationId}" was not found.`
      );
      this.emitStatus({ stage: 'error', message: err.message, percentage: 20, error: err.message });
      throw err;
    }

    // Prevent duplicate launch
    if (this.processManager.isInstallationRunning(installation.id)) {
      const err = new FernError(
        FernErrorCode.LAUNCH_FAILED,
        `Installation "${installation.name}" is already running.`,
        'Close the currently running Minecraft instance before launching again.'
      );
      this.emitStatus({ stage: 'error', message: err.message, percentage: 20, error: err.message });
      throw err;
    }

    const versionId = installation.versionId || installation.minecraftVersion;

    // Step 3: Validate Java Runtime
    this.emitStatus({ stage: 'validating_java', message: 'Verifying Java runtime compatibility...', percentage: 35 });
    const settings = this.settingsManager.getSettings();
    let javaPath = installation.javaPath || settings.java.defaultJavaPath;
    let detectedMajorVersion = 21;
    if (versionId.startsWith('1.8') || versionId.startsWith('1.12') || versionId.startsWith('1.16')) {
      detectedMajorVersion = 8;
    } else if (versionId.startsWith('1.17') || versionId.startsWith('1.18') || versionId.startsWith('1.19') || versionId.startsWith('1.20.')) {
      detectedMajorVersion = 17;
    }

    if (!javaPath) {
      const detected = await this.javaManager.detectRuntimes();
      if (detected.recommendedPath) {
        javaPath = detected.recommendedPath;
      } else if (detected.runtimes.length > 0) {
        javaPath = detected.runtimes[0].path;
      } else {
        javaPath = process.platform === 'win32' ? 'java.exe' : 'java';
      }
    }

    // Probe Java version and check compatibility
    if (javaPath && javaPath !== 'java.exe' && javaPath !== 'java') {
      if (!fs.existsSync(javaPath)) {
        const err = new FernError(
          FernErrorCode.JAVA_NOT_FOUND,
          `The specified Java runtime was not found at "${javaPath}".`,
          'Please verify the Java executable path in installation settings or select a valid Java runtime.',
          { javaPath }
        );
        this.emitStatus({ stage: 'error', message: err.message, percentage: 35, error: err.message });
        throw err;
      }

      const probed = await this.javaManager.probeJavaExecutable(javaPath);
      if (probed && probed.isValid) {
        detectedMajorVersion = probed.majorVersion;
        const compat = this.javaManager.isCompatible(probed.majorVersion, versionId);
        if (!compat.compatible) {
          const err = new FernError(
            FernErrorCode.JAVA_INCOMPATIBLE,
            `Java ${probed.majorVersion} is incompatible with Minecraft ${versionId}.`,
            `Minecraft ${versionId} requires Java ${compat.requiredVersion} or higher. Please select a compatible Java runtime in Settings.`,
            {
              selectedJavaVersion: probed.majorVersion,
              requiredJavaVersion: compat.requiredVersion,
              javaPath,
            }
          );
          this.emitStatus({ stage: 'error', message: err.message, percentage: 35, error: err.message });
          throw err;
        }
      } else if (!config.dryRun) {
        const err = new FernError(
          FernErrorCode.JAVA_NOT_FOUND,
          `The file at "${javaPath}" is not a valid Java executable.`,
          'Please select a valid Java runtime in settings.',
          { javaPath }
        );
        this.emitStatus({ stage: 'error', message: err.message, percentage: 35, error: err.message });
        throw err;
      }
    } else if (!config.dryRun) {
      const probed = await this.javaManager.probeJavaExecutable(javaPath);
      if (!probed || !probed.isValid) {
        const err = new FernError(
          FernErrorCode.JAVA_NOT_FOUND,
          'No valid Java runtime was detected on this computer.',
          'Please install Java (Eclipse Temurin / OpenJDK 21 recommended) or select a valid Java path in Settings.',
          { javaPath }
        );
        this.emitStatus({ stage: 'error', message: err.message, percentage: 35, error: err.message });
        throw err;
      } else {
        detectedMajorVersion = probed.majorVersion;
        const compat = this.javaManager.isCompatible(probed.majorVersion, versionId);
        if (!compat.compatible) {
          const err = new FernError(
            FernErrorCode.JAVA_INCOMPATIBLE,
            `System Java ${probed.majorVersion} is incompatible with Minecraft ${versionId}.`,
            `Minecraft ${versionId} requires Java ${compat.requiredVersion} or higher.`,
            {
              selectedJavaVersion: probed.majorVersion,
              requiredJavaVersion: compat.requiredVersion,
              javaPath,
            }
          );
          this.emitStatus({ stage: 'error', message: err.message, percentage: 35, error: err.message });
          throw err;
        }
      }
    }

    // Step 4: Validate required files on disk
    this.emitStatus({ stage: 'preparing_directories', message: 'Validating installed Minecraft files...', percentage: 50 });
    const versionDir = path.join(this.pathManager.getVersionsDir(), versionId);
    const clientJar = path.join(versionDir, `${versionId}.jar`);

    if (!config.dryRun && !fs.existsSync(clientJar)) {
      const err = new FernError(
        FernErrorCode.VALIDATION_ERROR,
        `Minecraft files for version ${versionId} are not installed yet.`,
        'Click the "Install" button to download required game files first.'
      );
      this.emitStatus({ stage: 'error', message: err.message, percentage: 50, error: err.message });
      throw err;
    }

    // Step 5: Load Version Package Metadata
    let pkg: MinecraftVersionPackage;
    try {
      pkg = await this.versionService.getVersionPackage(versionId);
    } catch {
      // If offline and mock or fallback
      pkg = this.buildMinimalFallbackPackage(versionId);
    }

    // Step 6: Ensure Instance Game Directory
    const gameDir = installation.gameDirectory || this.pathManager.getInstanceDir(installation.id);
    if (!fs.existsSync(gameDir)) {
      await fs.promises.mkdir(gameDir, { recursive: true });
    }
    // Initialize standard instance subdirectories
    for (const sub of ['mods', 'config', 'resourcepacks', 'shaderpacks', 'saves', 'logs']) {
      const subPath = path.join(gameDir, sub);
      if (!fs.existsSync(subPath)) {
        await fs.promises.mkdir(subPath, { recursive: true });
      }
    }

    // Sync performance settings into instance options.txt
    if (this.performanceManager) {
      try {
        const perfSettings = await this.performanceManager.getEffectiveSettingsForInstallation(installation.id);
        await this.performanceManager.optionsSyncer.syncOptions(gameDir, perfSettings);
      } catch (err) {
        this.logger.warn('LauncherService', 'Error syncing performance options to options.txt:', err);
      }
    }

    // Natives Directory
    const nativesDir = path.join(versionDir, 'natives');
    if (!fs.existsSync(nativesDir)) {
      await fs.promises.mkdir(nativesDir, { recursive: true });
    }

    // Step 7: Construct Classpath
    this.emitStatus({ stage: 'preparing_libraries', message: 'Constructing game classpath...', percentage: 65 });
    const currentOs = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
    const classpathEntries: string[] = [];

    // Incorporate Mod Loader launch info if applicable
    let mainClass = pkg.mainClass || 'net.minecraft.client.main.Main';
    const loaderJvmArgs: string[] = [];
    const loaderGameArgs: string[] = [];

    if (installation.loader && installation.loader !== 'vanilla' && this.loaderManager) {
      try {
        const loaderInfo = await this.loaderManager.getLaunchInfo(installation);
        if (loaderInfo.mainClass) {
          mainClass = loaderInfo.mainClass;
        }
        if (loaderInfo.libraries && loaderInfo.libraries.length > 0) {
          const librariesDir = this.pathManager.getLibrariesDir();
          for (const lib of loaderInfo.libraries) {
            const relPath = this.mavenCoordinateToPath(lib.name);
            classpathEntries.push(path.join(librariesDir, relPath));
          }
        }
        if (loaderInfo.jvmArguments) {
          loaderJvmArgs.push(...loaderInfo.jvmArguments);
        }
        if (loaderInfo.gameArguments) {
          loaderGameArgs.push(...loaderInfo.gameArguments);
        }
      } catch (err) {
        this.logger.warn('LauncherService', 'Error loading mod loader launch info:', err);
      }
    }

    if (pkg.libraries && Array.isArray(pkg.libraries)) {
      const librariesDir = this.pathManager.getLibrariesDir();
      for (const lib of pkg.libraries) {
        if (!this.installerService.isLibraryAllowed(lib.rules, currentOs)) {
          continue;
        }
        if (lib.downloads?.artifact) {
          const relPath = lib.downloads.artifact.path || '';
          if (relPath) {
            classpathEntries.push(path.join(librariesDir, relPath));
          }
        }
      }
    }

    // Add Client JAR to classpath
    classpathEntries.push(clientJar);
    const classpathSeparator = process.platform === 'win32' ? ';' : ':';
    const fullClasspath = classpathEntries.join(classpathSeparator);

    // Step 8: Construct JVM Arguments
    this.emitStatus({ stage: 'building_arguments', message: 'Building JVM and game arguments...', percentage: 80 });
    const minRam = installation.minMemory || installation.memoryAllocation?.minMb || 2048;
    const maxRam = installation.maxMemory || installation.memoryAllocation?.maxMb || 4096;

    const jvmArgs: string[] = [];

    if (this.performanceManager) {
      try {
        const perfSettings = await this.performanceManager.getEffectiveSettingsForInstallation(installation.id);
        const synthArgs = this.performanceManager.jvmSynthesizer.generateArgumentList({
          javaMajorVersion: detectedMajorVersion,
          allocatedRamMb: maxRam,
          minecraftVersion: versionId,
          isSafeMode: perfSettings.safeMode,
        });
        jvmArgs.push(...synthArgs);
      } catch (err) {
        this.logger.warn('LauncherService', 'Error synthesizing JVM arguments, falling back:', err);
        jvmArgs.push(`-Xms${minRam}M`, `-Xmx${maxRam}M`);
      }
    } else {
      jvmArgs.push(`-Xms${minRam}M`, `-Xmx${maxRam}M`);
    }

    if (loaderJvmArgs.length > 0) {
      jvmArgs.push(...loaderJvmArgs);
    }

    // Evaluate JVM arguments from version JSON
    const jvmArgEntries = pkg.arguments?.jvm;
    if (jvmArgEntries && Array.isArray(jvmArgEntries)) {
      for (const entry of jvmArgEntries) {
        const val = this.extractArgumentValue(entry, currentOs);
        if (val) {
          if (Array.isArray(val)) {
            jvmArgs.push(...val.map((v) => this.interpolateJvmArgs(v, nativesDir, fullClasspath)));
          } else {
            jvmArgs.push(this.interpolateJvmArgs(val, nativesDir, fullClasspath));
          }
        }
      }
    } else {
      // Legacy fallback JVM args
      jvmArgs.push(`-Djava.library.path=${nativesDir}`);
      jvmArgs.push('-cp', fullClasspath);
      jvmArgs.push('-XX:+UseG1GC', '-XX:+ParallelRefProcEnabled');
    }

    // Add custom JVM arguments from settings and installation with strict security validation
    const customArgs: string[] = [
      ...(settings.java.customJvmArgs || []),
      ...(installation.jvmArguments || []),
    ];
    if (customArgs.length > 0) {
      const validation = LaunchArgumentValidator.validateArgs(customArgs, detectedMajorVersion);
      if (!validation.isValid) {
        const err = new FernError(
          FernErrorCode.SECURITY_VIOLATION,
          `Invalid or unsafe custom JVM arguments detected: ${validation.warnings.join('; ')}`,
          'Please remove forbidden control characters (; & | > < ` $) from your custom JVM arguments in Settings or Instance configuration.'
        );
        this.emitStatus({ stage: 'error', message: err.message, percentage: 80, error: err.message });
        throw err;
      }
      jvmArgs.push(...customArgs);
    }

    // Step 9: Construct Game Arguments
    const gameArgs: string[] = [];
    const gameArgEntries = pkg.arguments?.game;

    if (gameArgEntries && Array.isArray(gameArgEntries)) {
      for (const entry of gameArgEntries) {
        const val = this.extractArgumentValue(entry, currentOs);
        if (val) {
          if (Array.isArray(val)) {
            gameArgs.push(...val.map((v) => this.interpolateGameArgs(v, account, pkg, installation, gameDir, settings)));
          } else {
            gameArgs.push(this.interpolateGameArgs(val, account, pkg, installation, gameDir, settings));
          }
        }
      }
    } else if (pkg.minecraftArguments) {
      // Legacy string format
      const tokens = pkg.minecraftArguments.split(/\s+/);
      for (const token of tokens) {
        gameArgs.push(this.interpolateGameArgs(token, account, pkg, installation, gameDir, settings));
      }
    } else {
      // Standard fallback game args
      gameArgs.push(
        '--username', account.displayName,
        '--version', versionId,
        '--gameDir', gameDir,
        '--assetsDir', this.pathManager.getAssetsDir(),
        '--assetIndex', pkg.assetIndex?.id || versionId,
        '--uuid', account.uuid,
        '--accessToken', account.accessToken || '0',
        '--userType', account.type === 'microsoft' ? 'msa' : 'legacy',
        '--versionType', 'FernClient'
      );
    }

    // Append resolution and window args
    if (settings.minecraft.fullscreen) {
      if (!gameArgs.includes('--fullscreen')) gameArgs.push('--fullscreen');
    } else {
      const w = settings.minecraft.defaultResolution.width || 1920;
      const h = settings.minecraft.defaultResolution.height || 1080;
      if (!gameArgs.includes('--width')) gameArgs.push('--width', String(w));
      if (!gameArgs.includes('--height')) gameArgs.push('--height', String(h));
    }

    // Installation custom game arguments
    if (installation.launchArguments) {
      gameArgs.push(...installation.launchArguments);
    }

    // Phase 8 Safe Mode launch: isolates crashes by disabling optional modifications
    if (config.safeMode) {
      jvmArgs.push('-Dfern.safemode=true');
      gameArgs.push('--fernSafeMode');
      this.logger.warn('LauncherService', 'Launching in Fern Safe Mode (optional shaders and modules disabled).');
    }

    const fullArgs = [...jvmArgs, mainClass, ...gameArgs];

    // Dry Run Simulation (used for unit tests and pipeline validation)
    if (config.dryRun) {
      this.logger.info('LauncherService', 'Dry run verified successfully. Formatted command arguments:', fullArgs);
      this.emitStatus({ stage: 'running', message: 'Dry run execution validated successfully.', percentage: 100 });
      return {
        success: true,
        command: javaPath,
        args: fullArgs,
        workingDirectory: gameDir,
      };
    }

    // Step 10: Spawn Minecraft Process
    this.emitStatus({ stage: 'spawning_process', message: 'Launching Minecraft client...', percentage: 95 });
    await this.installationManager.setInstallationStatus(installation.id, 'RUNNING');
    this.performanceManager?.startupTimer.markProcessSpawn();

    try {
      const child = spawn(javaPath, fullArgs, {
        cwd: gameDir,
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.processManager.trackProcess(
        child,
        installation.id,
        javaPath,
        fullArgs,
        async (exitCode, signal, durationSeconds) => {
          this.performanceManager?.startupTimer.markClientReady();
          await this.installationManager.updateInstallation(installation.id, {
            status: 'INSTALLED',
            lastSessionDurationSeconds: durationSeconds,
          });

          if (exitCode !== 0 && exitCode !== null) {
            const crashAnalysis = await CrashAnalyzer.analyze(gameDir, exitCode);
            this.logger.warn('LauncherService', `Minecraft closed with crash code ${exitCode}. Possible cause: ${crashAnalysis.possibleCause}`);
            this.emitStatus({
              stage: 'error',
              message: `Minecraft closed unexpectedly. Possible cause: ${crashAnalysis.possibleCause}`,
              percentage: 0,
              pid: child.pid,
              crashAnalysis,
            });
          } else {
            this.emitStatus({
              stage: 'exited',
              message: `Minecraft closed (Session duration: ${this.processManager.formatDuration(durationSeconds)})`,
              percentage: 0,
              pid: child.pid,
            });
          }
        }
      );

      this.emitStatus({
        stage: 'running',
        message: `Minecraft is running (PID: ${child.pid})`,
        percentage: 100,
        pid: child.pid,
      });

      return {
        success: true,
        pid: child.pid,
        command: javaPath,
        args: fullArgs,
        workingDirectory: gameDir,
      };
    } catch (spawnErr: any) {
      await this.installationManager.setInstallationStatus(installation.id, 'ERROR');
      const err = new FernError(
        FernErrorCode.LAUNCH_FAILED,
        `Failed to spawn Minecraft process: ${spawnErr.message}`,
        'Verify your Java runtime configuration in Settings.',
        { originalError: spawnErr.message }
      );
      this.emitStatus({ stage: 'error', message: err.message, percentage: 95, error: err.message });
      throw err;
    }
  }

  private extractArgumentValue(entry: ArgumentEntry, currentOs: string): string | string[] | null {
    if (typeof entry === 'string') {
      return entry;
    }
    if (this.installerService.isLibraryAllowed(entry.rules, currentOs)) {
      return entry.value;
    }
    return null;
  }

  private interpolateJvmArgs(arg: string, nativesDir: string, classpath: string): string {
    return arg
      .replace(/\${natives_directory}/g, nativesDir)
      .replace(/\${launcher_name}/g, 'FernClient')
      .replace(/\${launcher_version}/g, '1.0.0')
      .replace(/\${classpath}/g, classpath);
  }

  private interpolateGameArgs(
    arg: string,
    account: any,
    pkg: MinecraftVersionPackage,
    installation: any,
    gameDir: string,
    settings: any
  ): string {
    return arg
      .replace(/\${auth_player_name}/g, account.displayName)
      .replace(/\${version_name}/g, pkg.id)
      .replace(/\${game_directory}/g, gameDir)
      .replace(/\${assets_root}/g, this.pathManager.getAssetsDir())
      .replace(/\${assets_index_name}/g, pkg.assetIndex?.id || pkg.id)
      .replace(/\${auth_uuid}/g, account.uuid)
      .replace(/\${auth_access_token}/g, account.accessToken || '0')
      .replace(/\${user_type}/g, account.type === 'microsoft' ? 'msa' : 'legacy')
      .replace(/\${version_type}/g, 'FernClient')
      .replace(/\${resolution_width}/g, String(settings.minecraft.defaultResolution.width || 1920))
      .replace(/\${resolution_height}/g, String(settings.minecraft.defaultResolution.height || 1080));
  }

  private buildMinimalFallbackPackage(versionId: string): MinecraftVersionPackage {
    return {
      id: versionId,
      type: 'release',
      mainClass: 'net.minecraft.client.main.Main',
      assetIndex: {
        id: versionId,
        sha1: '',
        size: 0,
        totalSize: 0,
        url: '',
      },
      assets: versionId,
      complianceLevel: 1,
      downloads: {
        client: {
          sha1: '',
          size: 0,
          url: '',
        },
      },
      libraries: [],
      releaseTime: new Date().toISOString(),
      time: new Date().toISOString(),
    };
  }

  private mavenCoordinateToPath(coordinate: string): string {
    const parts = coordinate.split(':');
    if (parts.length < 3) return coordinate.replace(/[:]/g, '/') + '.jar';
    const group = parts[0].replace(/\./g, '/');
    const artifact = parts[1];
    const version = parts[2];
    const classifier = parts[3] ? `-${parts[3]}` : '';
    return `${group}/${artifact}/${version}/${artifact}-${version}${classifier}.jar`;
  }

  /**
   * Pre-flight compatibility evaluation for an installation.
   */
  public checkCompatibility(installation: any, javaMajorVersion: number = 21): CompatibilityReport {
    const engine = new CompatibilityEngine();
    return engine.evaluate({
      minecraftVersion: installation.minecraftVersion,
      javaMajorVersion,
      loader: installation.loader || 'vanilla',
      loaderVersion: installation.loaderVersion,
      minRamMb: installation.minMemoryMb,
      allocatedRamMb: installation.maxMemoryMb,
    });
  }
}
