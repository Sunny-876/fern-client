import { BaseModule } from '../IModule';
import { BooleanSetting, EnumSetting, IntegerSetting } from '../../settings/Setting';
import { FernPerformanceEngine } from '../../performance/core/FernPerformanceEngine';
import { PerformanceProfileType } from '../../../../shared/models/performance';

export class PerformanceControlsModule extends BaseModule {
  public readonly profileSetting: EnumSetting<PerformanceProfileType>;
  public readonly fpsLimitSetting: IntegerSetting;
  public readonly vsyncSetting: BooleanSetting;
  public readonly dynamicOptimizationSetting: BooleanSetting;

  constructor(private performanceEngine?: FernPerformanceEngine) {
    super(
      'performance_controls',
      'In-Game Performance Controls',
      'Allows switching performance profiles and frame limits directly within Minecraft.',
      'Performance'
    );

    this.profileSetting = new EnumSetting(
      'profile',
      'Performance Profile',
      'Selects visual and background workload presets.',
      'balanced',
      ['potato', 'balanced', 'quality', 'custom'] as const
    );

    this.fpsLimitSetting = new IntegerSetting('fps_limit', 'FPS Limit', 'Target maximum FPS (0 = Unlimited).', 0, {
      min: 0,
      max: 240,
      step: 30,
    });

    this.vsyncSetting = new BooleanSetting('vsync', 'VSync', 'Synchronize frame presentation with monitor refresh.', false);
    this.dynamicOptimizationSetting = new BooleanSetting('dynamic_opt', 'Dynamic Optimization', 'Scale visual load if FPS drops below target.', true);

    this.addSetting(this.profileSetting);
    this.addSetting(this.fpsLimitSetting);
    this.addSetting(this.vsyncSetting);
    this.addSetting(this.dynamicOptimizationSetting);

    // Sync changes to Phase 4 engine
    this.profileSetting.onChange((newVal) => {
      this.performanceEngine?.applyProfile(newVal);
    });
    this.fpsLimitSetting.onChange((newVal) => {
      this.performanceEngine?.applySettings({ fpsLimit: newVal });
    });
    this.vsyncSetting.onChange((newVal) => {
      this.performanceEngine?.applySettings({ vsync: newVal });
    });
    this.dynamicOptimizationSetting.onChange((newVal) => {
      this.performanceEngine?.applySettings({ dynamicOptimization: newVal });
    });
  }

  public onEnable(): void {
    if (this.performanceEngine) {
      this.performanceEngine.applySettings({
        fpsLimit: this.fpsLimitSetting.value,
        vsync: this.vsyncSetting.value,
        dynamicOptimization: this.dynamicOptimizationSetting.value,
      });
      this.performanceEngine.applyProfile(this.profileSetting.value);
    }
  }
}
