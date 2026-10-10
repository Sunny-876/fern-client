import { BaseModule } from '../IModule';
import { BooleanSetting, ColorSetting } from '../../settings/Setting';
import { BaseHudElement, HudRenderContext } from '../../hud/IHudElement';
import { HUDManager } from '../../hud/HUDManager';
import { KeyPressEvent, MouseInputEvent } from '../../events/ClientEvents';

export interface KeyState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  space: boolean;
  lmb: boolean;
  rmb: boolean;
}

export class KeystrokesHudElement extends BaseHudElement {
  public keyState: KeyState = {
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
    lmb: false,
    rmb: false,
  };

  constructor(private parentModule: KeystrokesModule) {
    super('hud_keystrokes', 'Keystrokes', { x: 10, y: 120, width: 70, height: 70, anchor: 'TOP_LEFT' });
  }

  public render(context: HudRenderContext): void {
    const pos = this.getCalculatedPosition(context.screenWidth, context.screenHeight);
    const activeColor = this.parentModule.activeColorSetting.value;
    const inactiveColor = this.parentModule.inactiveColorSetting.value;
    const keySize = 20;
    const gap = 3;

    // Helper to draw single box
    const drawKey = (label: string, isDown: boolean, relX: number, relY: number, w: number = keySize, h: number = keySize) => {
      const kX = pos.screenX + relX;
      const kY = pos.screenY + relY;
      const bg = isDown ? activeColor : inactiveColor;
      const fg = isDown ? '#000000' : '#f8fafc';

      if (context.drawRect) {
        context.drawRect(kX, kY, w, h, bg);
      }
      if (context.drawText) {
        context.drawText(label, kX + Math.round(w / 2) - 4, kY + Math.round(h / 2) - 4, fg, false);
      }
    };

    // W key
    drawKey('W', this.keyState.w, keySize + gap, 0);

    // A, S, D keys
    const row2Y = keySize + gap;
    drawKey('A', this.keyState.a, 0, row2Y);
    drawKey('S', this.keyState.s, keySize + gap, row2Y);
    drawKey('D', this.keyState.d, (keySize + gap) * 2, row2Y);

    // Mouse buttons (LMB / RMB)
    if (this.parentModule.showMouseButtonsSetting.value) {
      const mouseRowY = (keySize + gap) * 2;
      const mouseW = Math.round(((keySize + gap) * 3 - gap) / 2);
      drawKey('LMB', this.keyState.lmb, 0, mouseRowY, mouseW, keySize);
      drawKey('RMB', this.keyState.rmb, mouseW + gap, mouseRowY, mouseW, keySize);
    }
  }
}

export class KeystrokesModule extends BaseModule {
  public readonly showMouseButtonsSetting: BooleanSetting;
  public readonly showSpaceBarSetting: BooleanSetting;
  public readonly activeColorSetting: ColorSetting;
  public readonly inactiveColorSetting: ColorSetting;
  public readonly hudElement: KeystrokesHudElement;

  constructor(private hudManager?: HUDManager) {
    super('keystrokes', 'Keystrokes', 'Displays real-time movement keys (WASD) and mouse clicks.', 'HUD');

    this.showMouseButtonsSetting = new BooleanSetting('show_mouse', 'Show Mouse Buttons', 'Displays LMB and RMB boxes below keys.', true);
    this.showSpaceBarSetting = new BooleanSetting('show_space', 'Show Space Bar', 'Displays jump space bar box.', false);
    this.activeColorSetting = new ColorSetting('active_color', 'Pressed Color', 'Highlight color when key is pressed.', '#22c55e');
    this.inactiveColorSetting = new ColorSetting('inactive_color', 'Idle Color', 'Background color of unpressed keys.', 'rgba(0, 0, 0, 0.45)');

    this.addSetting(this.showMouseButtonsSetting);
    this.addSetting(this.showSpaceBarSetting);
    this.addSetting(this.activeColorSetting);
    this.addSetting(this.inactiveColorSetting);

    this.hudElement = new KeystrokesHudElement(this);
  }

  public onInitialize(): void {
    if (this.hudManager) {
      this.hudManager.register(this.hudElement);
    }
  }

  public onEnable(): void {
    this.hudElement.enabled = true;

    // Listen to key events
    this.listen('key_press', (evt: KeyPressEvent) => {
      const isDown = evt.action === 'down' || evt.action === 'repeat';
      const k = evt.key.toLowerCase();
      if (k === 'w' || k === 'keyw') this.hudElement.keyState.w = isDown;
      if (k === 'a' || k === 'keya') this.hudElement.keyState.a = isDown;
      if (k === 's' || k === 'keys') this.hudElement.keyState.s = isDown;
      if (k === 'd' || k === 'keyd') this.hudElement.keyState.d = isDown;
      if (k === 'space') this.hudElement.keyState.space = isDown;
    });

    // Listen to mouse events
    this.listen('mouse_input', (evt: MouseInputEvent) => {
      const isDown = evt.action === 'down';
      if (evt.button === 0) this.hudElement.keyState.lmb = isDown;
      if (evt.button === 1) this.hudElement.keyState.rmb = isDown;
    });
  }

  public onDisable(): void {
    this.hudElement.enabled = false;
    this.hudElement.keyState = {
      w: false,
      a: false,
      s: false,
      d: false,
      space: false,
      lmb: false,
      rmb: false,
    };
  }
}
