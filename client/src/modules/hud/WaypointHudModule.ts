import { BaseModule } from '../IModule';
import { BooleanSetting, IntegerSetting, ColorSetting } from '../../settings/Setting';
import { BaseHudElement, HudRenderContext } from '../../hud/IHudElement';
import { HUDManager } from '../../hud/HUDManager';
import { WaypointManager, Waypoint } from '../waypoints/WaypointManager';

export class WaypointHudElement extends BaseHudElement {
  private playerPos = { x: 0, y: 64, z: 0, dimension: 'overworld' };

  constructor(
    private parentModule: WaypointHudModule,
    private waypointManager: WaypointManager
  ) {
    super('hud_waypoints', 'Waypoints HUD', {
      x: 10,
      y: 260,
      width: 140,
      height: 48,
      anchor: 'BOTTOM_LEFT',
    });
  }

  public updatePlayerPosition(pos: { x: number; y: number; z: number; dimension?: string }): void {
    this.playerPos = {
      x: pos.x,
      y: pos.y,
      z: pos.z,
      dimension: pos.dimension || 'overworld',
    };
  }

  public render(context: HudRenderContext): void {
    const pos = this.getCalculatedPosition(context.screenWidth, context.screenHeight);
    const maxCount = this.parentModule.maxWaypointsSetting.value;
    const maxDist = this.parentModule.maxDistanceSetting.value;
    const color = this.parentModule.textColorSetting.value;

    const nearby = this.waypointManager
      .getNearbyWaypoints(this.playerPos, maxDist)
      .slice(0, maxCount);

    if (nearby.length === 0) return;

    if (this.parentModule.showBackgroundSetting.value && context.drawRect) {
      const renderHeight = Math.max(20, nearby.length * 16 + 8);
      context.drawRect(pos.screenX, pos.screenY, pos.renderWidth, renderHeight, 'rgba(0, 0, 0, 0.45)');
    }

    if (context.drawText) {
      let curY = pos.screenY + 4;
      for (const wp of nearby) {
        const text = `${wp.name}: ${wp.distance}m`;
        context.drawText(text, pos.screenX + 4, curY, wp.color || color, true);
        curY += 16;
      }
    }
  }
}

export class WaypointHudModule extends BaseModule {
  public readonly maxWaypointsSetting: IntegerSetting;
  public readonly maxDistanceSetting: IntegerSetting;
  public readonly showBackgroundSetting: BooleanSetting;
  public readonly textColorSetting: ColorSetting;
  public readonly hudElement: WaypointHudElement;

  constructor(waypointManager: WaypointManager, private hudManager?: HUDManager) {
    super(
      'waypoints_hud',
      'Waypoints HUD',
      'Displays distance and directions to user-saved world waypoints and markers on screen.',
      'HUD'
    );

    this.maxWaypointsSetting = new IntegerSetting(
      'max_waypoints',
      'Max Waypoints Displayed',
      'Maximum number of nearby waypoints shown simultaneously.',
      3,
      { min: 1, max: 10, step: 1 }
    );

    this.maxDistanceSetting = new IntegerSetting(
      'max_distance',
      'Detection Radius (meters)',
      'Cutoff distance beyond which waypoints are not rendered.',
      2000,
      { min: 100, max: 10000, step: 100 }
    );

    this.showBackgroundSetting = new BooleanSetting(
      'show_background',
      'Show Background',
      'Renders dark translucent backing behind waypoint labels.',
      true
    );

    this.textColorSetting = new ColorSetting(
      'text_color',
      'Default Text Color',
      'Fallback color if waypoint has no custom color.',
      '#38bdf8'
    );

    this.addSetting(this.maxWaypointsSetting);
    this.addSetting(this.maxDistanceSetting);
    this.addSetting(this.showBackgroundSetting);
    this.addSetting(this.textColorSetting);

    this.hudElement = new WaypointHudElement(this, waypointManager);
  }

  public onInitialize(): void {
    if (this.hudManager) {
      this.hudManager.register(this.hudElement);
    }
  }

  public onEnable(): void {
    this.hudElement.enabled = true;
  }

  public onDisable(): void {
    this.hudElement.enabled = false;
  }
}
