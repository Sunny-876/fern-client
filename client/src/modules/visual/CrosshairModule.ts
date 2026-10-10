import { BaseModule } from '../IModule';
import { EnumSetting, IntegerSetting, FloatSetting, ColorSetting, BooleanSetting } from '../../settings/Setting';
import { HudRenderContext } from '../../hud/IHudElement';

export type CrosshairStyle = 'Cross' | 'Dot' | 'Circle' | 'Plus';

export class CrosshairModule extends BaseModule {
  public readonly styleSetting: EnumSetting<CrosshairStyle>;
  public readonly sizeSetting: IntegerSetting;
  public readonly thicknessSetting: IntegerSetting;
  public readonly gapSetting: IntegerSetting;
  public readonly colorSetting: ColorSetting;
  public readonly opacitySetting: FloatSetting;
  public readonly outlineSetting: BooleanSetting;

  constructor() {
    super(
      'custom_crosshair',
      'Custom Crosshair',
      'Configurable in-game crosshair with custom styles, thickness, and colors.',
      'Visual'
    );

    this.styleSetting = new EnumSetting(
      'style',
      'Style',
      'Geometry of the crosshair.',
      'Cross',
      ['Cross', 'Dot', 'Circle', 'Plus'] as const
    );

    this.sizeSetting = new IntegerSetting('size', 'Size', 'Length of the crosshair arms in pixels.', 6, {
      min: 2,
      max: 30,
      step: 1,
    });

    this.thicknessSetting = new IntegerSetting('thickness', 'Thickness', 'Line thickness in pixels.', 2, {
      min: 1,
      max: 6,
      step: 1,
    });

    this.gapSetting = new IntegerSetting('gap', 'Center Gap', 'Spacing away from screen center in pixels.', 3, {
      min: 0,
      max: 20,
      step: 1,
    });

    this.colorSetting = new ColorSetting('color', 'Color', 'Color of the crosshair lines.', '#22c55e');
    this.opacitySetting = new FloatSetting('opacity', 'Opacity', 'Transparency level.', 0.9, {
      min: 0.1,
      max: 1.0,
      step: 0.05,
    });
    this.outlineSetting = new BooleanSetting('outline', 'Black Outline', 'Renders a subtle 1px border around crosshair elements.', true);

    this.addSetting(this.styleSetting);
    this.addSetting(this.sizeSetting);
    this.addSetting(this.thicknessSetting);
    this.addSetting(this.gapSetting);
    this.addSetting(this.colorSetting);
    this.addSetting(this.opacitySetting);
    this.addSetting(this.outlineSetting);
  }

  public onEnable(): void {
    this.listen('render_2d', (evt) => {
      this.renderCrosshair(evt);
    });
  }

  public renderCrosshair(context: HudRenderContext): void {
    if (!this.isEnabled() || !context.drawRect) return;

    const centerX = Math.round(context.screenWidth / 2);
    const centerY = Math.round(context.screenHeight / 2);

    const size = this.sizeSetting.value;
    const thickness = this.thicknessSetting.value;
    const gap = this.gapSetting.value;
    const color = this.colorSetting.value;
    const outline = this.outlineSetting.value;
    const style = this.styleSetting.value;

    const drawLineWithOutline = (x: number, y: number, w: number, h: number) => {
      if (outline) {
        context.drawRect!(x - 1, y - 1, w + 2, h + 2, 'rgba(0, 0, 0, 0.6)');
      }
      context.drawRect!(x, y, w, h, color);
    };

    const halfThick = Math.floor(thickness / 2);

    if (style === 'Dot') {
      const dotSize = Math.max(2, thickness * 2);
      drawLineWithOutline(centerX - Math.floor(dotSize / 2), centerY - Math.floor(dotSize / 2), dotSize, dotSize);
      return;
    }

    if (style === 'Circle') {
      const radius = size;
      // Draw 4 corner points or approximation
      drawLineWithOutline(centerX - radius, centerY - halfThick, thickness, thickness);
      drawLineWithOutline(centerX + radius - thickness, centerY - halfThick, thickness, thickness);
      drawLineWithOutline(centerX - halfThick, centerY - radius, thickness, thickness);
      drawLineWithOutline(centerX - halfThick, centerY + radius - thickness, thickness, thickness);
      return;
    }

    // 'Cross' or 'Plus'
    // Left arm
    drawLineWithOutline(centerX - gap - size, centerY - halfThick, size, thickness);
    // Right arm
    drawLineWithOutline(centerX + gap, centerY - halfThick, size, thickness);
    // Top arm
    drawLineWithOutline(centerX - halfThick, centerY - gap - size, thickness, size);
    // Bottom arm
    drawLineWithOutline(centerX - halfThick, centerY + gap, thickness, size);
  }
}
