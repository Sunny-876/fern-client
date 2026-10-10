import { BaseModule } from '../IModule';
import { FloatSetting, BooleanSetting } from '../../settings/Setting';

export class ItemPhysicsModule extends BaseModule {
  public readonly rotationSpeedSetting: FloatSetting;
  public readonly bounceFactorSetting: FloatSetting;
  public readonly scaleSetting: FloatSetting;
  public readonly showShadowSetting: BooleanSetting;

  constructor() {
    super(
      'item_physics',
      'Realistic Item Physics',
      'Client-side visual dropped item animations, rotation, and ground physics.',
      'Visual'
    );

    this.rotationSpeedSetting = new FloatSetting(
      'rotation_speed',
      'Rotation Speed',
      'Rate at which dropped items spin while falling.',
      1.5,
      { min: 0.0, max: 4.0, step: 0.1 }
    );

    this.bounceFactorSetting = new FloatSetting(
      'bounce_factor',
      'Bounce Intensity',
      'Elastic bounce amplitude upon hitting blocks.',
      0.4,
      { min: 0.0, max: 1.0, step: 0.05 }
    );

    this.scaleSetting = new FloatSetting(
      'scale',
      'Item Scale',
      'Visual size multiplier of dropped items on the ground.',
      1.0,
      { min: 0.5, max: 2.0, step: 0.1 }
    );

    this.showShadowSetting = new BooleanSetting(
      'shadow',
      'Ground Shadow',
      'Renders realistic ambient occlusion shadow beneath items.',
      true
    );

    this.addSetting(this.rotationSpeedSetting);
    this.addSetting(this.bounceFactorSetting);
    this.addSetting(this.scaleSetting);
    this.addSetting(this.showShadowSetting);
  }
}
