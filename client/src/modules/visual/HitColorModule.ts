import { BaseModule } from '../IModule';
import { ColorSetting, IntegerSetting, FloatSetting } from '../../settings/Setting';
import { ColorPicker } from '../../theme/ColorPicker';

export class HitColorModule extends BaseModule {
  public readonly hitColorSetting: ColorSetting;
  public readonly flashDurationSetting: IntegerSetting;
  public readonly flashOpacitySetting: FloatSetting;

  private lastDamageTime = 0;

  constructor() {
    super(
      'hit_color',
      'Hit Color Effects',
      'Customizes entity and player damage flash tint and duration.',
      'Visual'
    );

    this.hitColorSetting = new ColorSetting(
      'hit_color',
      'Hit Tint Color',
      'Color of the flash when taking or dealing damage.',
      '#ef4444'
    );

    this.flashDurationSetting = new IntegerSetting(
      'duration',
      'Flash Duration',
      'Duration in milliseconds of the damage flash.',
      200,
      { min: 50, max: 600, step: 25 }
    );

    this.flashOpacitySetting = new FloatSetting(
      'opacity',
      'Flash Opacity',
      'Maximum intensity of the damage flash.',
      0.6,
      { min: 0.1, max: 1.0, step: 0.05 }
    );

    this.addSetting(this.hitColorSetting);
    this.addSetting(this.flashDurationSetting);
    this.addSetting(this.flashOpacitySetting);
  }

  public triggerDamageFlash(): void {
    if (!this.isEnabled()) return;
    this.lastDamageTime = Date.now();
  }

  public getActiveFlashTint(): string | null {
    if (!this.isEnabled()) return null;
    const elapsed = Date.now() - this.lastDamageTime;
    const duration = this.flashDurationSetting.value;
    if (elapsed >= duration) return null;

    const progress = 1.0 - elapsed / duration;
    const alpha = this.flashOpacitySetting.value * progress;
    return ColorPicker.withAlpha(this.hitColorSetting.value, alpha);
  }
}
