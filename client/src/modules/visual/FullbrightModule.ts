import { BaseModule } from '../IModule';
import { EnumSetting } from '../../settings/Setting';

export type FullbrightLevel = 'Off' | 'Vanilla' | 'Bright' | 'Maximum';

export class FullbrightModule extends BaseModule {
  public readonly levelSetting: EnumSetting<FullbrightLevel>;

  constructor() {
    super(
      'fullbright',
      'Fullbright',
      'Client-side visual brightness adjustment for dark caves and night vision.',
      'Visual'
    );

    this.levelSetting = new EnumSetting(
      'level',
      'Brightness Level',
      'Gamma enhancement intensity.',
      'Bright',
      ['Off', 'Vanilla', 'Bright', 'Maximum'] as const
    );

    this.addSetting(this.levelSetting);
  }

  public getGammaMultiplier(): number {
    if (!this.isEnabled()) return 1.0;
    switch (this.levelSetting.value) {
      case 'Off':
        return 1.0;
      case 'Vanilla':
        return 1.5;
      case 'Bright':
        return 5.0;
      case 'Maximum':
        return 15.0;
      default:
        return 1.0;
    }
  }

  public getEffectiveGamma(baseGamma = 1.0): number {
    return baseGamma * this.getGammaMultiplier();
  }
}
