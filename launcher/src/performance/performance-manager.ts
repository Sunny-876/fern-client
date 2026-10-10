import { FernLogger } from '../core/logger';
import { SettingsManager } from '../settings/settings-manager';
import { InstallationManager } from '../installations/installation-manager';
import {
  PerformanceSettings,
  PerformanceProfileType,
  RamRecommendation,
  BenchmarkReport,
  ComparisonReport,
  SystemHardwareInfo,
  JvmArgumentSpec,
} from '../../../shared/models/performance';
import { DEFAULT_PERFORMANCE_SETTINGS, getProfilePreset } from '../../../shared/constants/performance-profiles';
import { JvmSynthesizer } from './jvm/jvm-synthesizer';
import { RamAdvisor } from './memory/ram-advisor';
import { BackgroundTaskManager } from './background/background-task-manager';
import { CacheOptimizer } from './cache/cache-optimizer';
import { StartupTimer } from './startup/startup-timer';
import { GpuDetector } from './gpu/gpu-detector';
import { BenchmarkRunner } from './benchmarking/benchmark-runner';
import { OptionsSyncer } from './options/options-syncer';

export class LauncherPerformanceManager {
  public readonly jvmSynthesizer: JvmSynthesizer;
  public readonly ramAdvisor: RamAdvisor;
  public readonly backgroundTasks: BackgroundTaskManager;
  public readonly cacheOptimizer: CacheOptimizer;
  public readonly startupTimer: StartupTimer;
  public readonly gpuDetector: GpuDetector;
  public readonly benchmarkRunner: BenchmarkRunner;
  public readonly optionsSyncer: OptionsSyncer;

  constructor(
    private logger: FernLogger,
    private settingsManager: SettingsManager,
    private installationManager: InstallationManager
  ) {
    this.jvmSynthesizer = new JvmSynthesizer();
    this.ramAdvisor = new RamAdvisor();
    this.backgroundTasks = new BackgroundTaskManager(this.logger);
    this.cacheOptimizer = new CacheOptimizer(this.logger);
    this.startupTimer = new StartupTimer();
    this.gpuDetector = new GpuDetector();
    this.benchmarkRunner = new BenchmarkRunner(this.gpuDetector);
    this.optionsSyncer = new OptionsSyncer(this.logger);
  }

  public getGlobalSettings(): PerformanceSettings {
    const settings = this.settingsManager.getSettings();
    return settings.performance || DEFAULT_PERFORMANCE_SETTINGS;
  }

  public async updateGlobalSettings(partial: Partial<PerformanceSettings>): Promise<PerformanceSettings> {
    const current = this.getGlobalSettings();
    const updated: PerformanceSettings = {
      ...current,
      ...partial,
    };

    // If profile changed to a preset, apply preset values
    if (partial.profile && partial.profile !== 'custom' && partial.profile !== current.profile) {
      const preset = getProfilePreset(partial.profile);
      Object.assign(updated, preset);
    }

    await this.settingsManager.updateSettings({
      performance: updated,
    });

    this.logger.info('PerformanceManager', `Updated global performance profile: ${updated.profile}`);
    return updated;
  }

  public async getEffectiveSettingsForInstallation(installationId: string): Promise<PerformanceSettings> {
    const globalSettings = this.getGlobalSettings();
    const inst = this.installationManager.getInstallation(installationId);
    if (!inst) {
      return globalSettings;
    }

    if (inst.performanceProfile && inst.performanceProfile !== 'custom') {
      const preset = getProfilePreset(inst.performanceProfile);
      return {
        ...preset,
        ...(inst.performanceSettings || {}),
        profile: inst.performanceProfile,
      };
    }

    if (inst.performanceSettings) {
      return {
        ...globalSettings,
        ...inst.performanceSettings,
      };
    }

    return globalSettings;
  }

  public getRamRecommendation(installationId?: string): RamRecommendation {
    let modCount = 0;
    let loader: any = 'vanilla';
    let mcVersion = '1.21.4';

    if (installationId) {
      const inst = this.installationManager.getInstallation(installationId);
      if (inst) {
        loader = inst.loader;
        mcVersion = inst.minecraftVersion;
        // Check mod count if instance directory exists
        // (will be computed accurately from disk or default 0)
      }
    }

    return this.ramAdvisor.calculateRecommendation({
      minecraftVersion: mcVersion,
      loader,
      modCount,
    });
  }

  public getJvmArgumentSpecs(installationId: string, javaMajorVersion: number = 21): JvmArgumentSpec[] {
    const inst = this.installationManager.getInstallation(installationId);
    const allocatedRamMb = inst?.maxMemory || inst?.memoryAllocation?.maxMb || 4096;
    const globalSettings = this.getGlobalSettings();

    return this.jvmSynthesizer.synthesizeArguments({
      javaMajorVersion,
      allocatedRamMb,
      minecraftVersion: inst?.minecraftVersion || '1.21.4',
      isSafeMode: globalSettings.safeMode,
    });
  }

  public async runBenchmark(
    installationId: string,
    profile: PerformanceProfileType,
    durationSeconds: number = 15
  ): Promise<BenchmarkReport> {
    const inst = this.installationManager.getInstallation(installationId);
    const name = inst ? inst.name : 'Fern Installation';

    return this.benchmarkRunner.runBenchmark({
      installationId,
      installationName: name,
      profile,
      durationSeconds,
    });
  }

  public getBenchmarkHistory(): BenchmarkReport[] {
    return this.benchmarkRunner.getHistory();
  }

  public compareBenchmarks(baselineId: string, optimizedId: string): ComparisonReport | null {
    const history = this.benchmarkRunner.getHistory();
    const baseline = history.find((b) => b.id === baselineId);
    const optimized = history.find((b) => b.id === optimizedId);

    if (!baseline || !optimized) {
      return null;
    }

    return this.benchmarkRunner.compareReports(baseline, optimized);
  }

  public async getHardwareInfo(): Promise<SystemHardwareInfo> {
    return this.gpuDetector.getHardwareInfo();
  }
}
