import { BaseModule } from '../IModule';
import { FloatSetting, BooleanSetting, KeybindSetting } from '../../settings/Setting';
import { KeyPressEvent } from '../../events/ClientEvents';

export class ZoomModule extends BaseModule {
  public readonly zoomLevelSetting: FloatSetting;
  public readonly smoothZoomSetting: BooleanSetting;
  public readonly slowSensitivitySetting: BooleanSetting;
  public readonly zoomKeySetting: KeybindSetting;

  private isZooming = false;
  private currentZoomProgress = 0; // 0.0 (unzoomed) to 1.0 (fully zoomed)

  constructor() {
    super(
      'zoom',
      'Cinematic Zoom',
      'Client-side optical zoom with smooth transition and sensitivity scaling.',
      'Visual'
    );

    this.zoomLevelSetting = new FloatSetting(
      'zoom_level',
      'Zoom Factor',
      'Magnification level when holding the zoom key.',
      4.0,
      { min: 2.0, max: 10.0, step: 0.5 }
    );

    this.smoothZoomSetting = new BooleanSetting(
      'smooth_zoom',
      'Smooth Transition',
      'Smoothly interpolates FOV transition when zooming in and out.',
      true
    );

    this.slowSensitivitySetting = new BooleanSetting(
      'slow_sensitivity',
      'Adjust Sensitivity',
      'Reduces mouse sensitivity proportionally while zoomed in.',
      true
    );

    this.zoomKeySetting = new KeybindSetting(
      'zoom_key',
      'Zoom Keybind',
      'Keyboard key held down to activate zoom.',
      'C'
    );

    this.addSetting(this.zoomLevelSetting);
    this.addSetting(this.smoothZoomSetting);
    this.addSetting(this.slowSensitivitySetting);
    this.addSetting(this.zoomKeySetting);
  }

  public onEnable(): void {
    this.listen('key_press', (evt: KeyPressEvent) => {
      const targetKey = this.zoomKeySetting.value.toLowerCase();
      if (evt.key.toLowerCase() === targetKey) {
        if (evt.action === 'down') {
          this.isZooming = true;
        } else if (evt.action === 'up') {
          this.isZooming = false;
        }
      }
    });

    this.listen('client_tick', () => {
      if (!this.smoothZoomSetting.value) {
        this.currentZoomProgress = this.isZooming ? 1.0 : 0.0;
        return;
      }
      // Lerp transition
      const target = this.isZooming ? 1.0 : 0.0;
      this.currentZoomProgress += (target - this.currentZoomProgress) * 0.35;
      if (Math.abs(this.currentZoomProgress - target) < 0.01) {
        this.currentZoomProgress = target;
      }
    });
  }

  public onDisable(): void {
    this.isZooming = false;
    this.currentZoomProgress = 0;
  }

  public isZoomActive(): boolean {
    return this.isZooming || this.currentZoomProgress > 0.05;
  }

  /**
   * Returns current FOV divisor for camera rendering (1.0 = normal, 4.0 = 4x zoom).
   */
  public getFovMultiplier(): number {
    if (!this.isEnabled()) return 1.0;
    const factor = this.zoomLevelSetting.value;
    const zoomProgress = this.smoothZoomSetting.value ? this.currentZoomProgress : (this.isZooming ? 1.0 : 0.0);
    // 1.0 to factor
    return 1.0 / (1.0 + (factor - 1.0) * zoomProgress);
  }

  public getSensitivityMultiplier(): number {
    if (!this.isEnabled() || !this.slowSensitivitySetting.value || !this.isZoomActive()) {
      return 1.0;
    }
    return this.getFovMultiplier();
  }
}
