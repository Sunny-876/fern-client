export type HudAnchor =
  | 'TOP_LEFT'
  | 'TOP_CENTER'
  | 'TOP_RIGHT'
  | 'BOTTOM_LEFT'
  | 'BOTTOM_CENTER'
  | 'BOTTOM_RIGHT'
  | 'CENTER';

export interface HudRenderContext {
  readonly screenWidth: number;
  readonly screenHeight: number;
  readonly partialTicks?: number;
  isEditMode?: boolean;
  // Lightweight draw call hooks (abstracted for cross-version rendering)
  drawRect?(x: number, y: number, width: number, height: number, color: string): void;
  drawText?(text: string, x: number, y: number, color: string, shadow?: boolean): void;
  drawLine?(x1: number, y1: number, x2: number, y2: number, color: string, width?: number): void;
}

export interface CalculatedHudPosition {
  screenX: number;
  screenY: number;
  renderWidth: number;
  renderHeight: number;
}

export interface HudElementStyle {
  showBackground: boolean;
  backgroundColor: string;
  backgroundOpacity: number;
  borderRadius: number;
  showBorder: boolean;
  borderColor: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  textShadow: boolean;
  opacity: number;
}

export const DEFAULT_HUD_STYLE: HudElementStyle = {
  showBackground: true,
  backgroundColor: 'rgba(0, 0, 0, 0.45)',
  backgroundOpacity: 0.45,
  borderRadius: 4,
  showBorder: false,
  borderColor: 'rgba(255, 255, 255, 0.1)',
  textColor: '#f8fafc',
  fontSize: 10,
  fontFamily: 'Fern Default',
  textShadow: true,
  opacity: 1.0,
};

export interface SerializedHudElementConfig {
  id: string;
  enabled: boolean;
  x: number;
  y: number;
  width?: number;
  height?: number;
  scale: number;
  anchor: string;
  zIndex?: number;
  style?: Partial<HudElementStyle>;
}

export interface IHudElement {
  readonly id: string;
  readonly name: string;
  enabled: boolean;
  x: number; // Offset relative to anchor
  y: number; // Offset relative to anchor
  width: number;
  height: number;
  scale: number;
  anchor: HudAnchor;
  zIndex: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  style: HudElementStyle;

  render(context: HudRenderContext): void;
  getCalculatedPosition(screenWidth: number, screenHeight: number): CalculatedHudPosition;
  resetToDefaults?(): void;
  cloneConfig?(): SerializedHudElementConfig;
}

export abstract class BaseHudElement implements IHudElement {
  public enabled = true;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public scale: number;
  public anchor: HudAnchor;
  public zIndex: number = 0;
  public minWidth: number = 20;
  public maxWidth: number = 600;
  public minHeight: number = 10;
  public maxHeight: number = 400;
  public style: HudElementStyle;

  // Defaults preserved for reset
  protected readonly defaultX: number;
  protected readonly defaultY: number;
  protected readonly defaultWidth: number;
  protected readonly defaultHeight: number;
  protected readonly defaultScale: number;
  protected readonly defaultAnchor: HudAnchor;
  protected readonly defaultEnabled: boolean;

  // Cached layout position to avoid allocation per frame
  private _cachedPos: CalculatedHudPosition = { screenX: 0, screenY: 0, renderWidth: 0, renderHeight: 0 };
  private _lastScreenWidth = -1;
  private _lastScreenHeight = -1;
  private _lastDirtyX = -1;
  private _lastDirtyY = -1;
  private _lastDirtyWidth = -1;
  private _lastDirtyHeight = -1;
  private _lastDirtyScale = -1;
  private _lastDirtyAnchor: HudAnchor = 'TOP_LEFT';

  constructor(
    public readonly id: string,
    public readonly name: string,
    defaultConfig: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      scale?: number;
      anchor?: HudAnchor;
      enabled?: boolean;
      zIndex?: number;
      minWidth?: number;
      maxWidth?: number;
      minHeight?: number;
      maxHeight?: number;
      style?: Partial<HudElementStyle>;
    } = {}
  ) {
    this.x = defaultConfig.x ?? 10;
    this.y = defaultConfig.y ?? 10;
    this.width = defaultConfig.width ?? 80;
    this.height = defaultConfig.height ?? 18;
    this.scale = defaultConfig.scale ?? 1.0;
    this.anchor = defaultConfig.anchor ?? 'TOP_LEFT';
    this.enabled = defaultConfig.enabled ?? true;
    this.zIndex = defaultConfig.zIndex ?? 0;

    if (defaultConfig.minWidth) this.minWidth = defaultConfig.minWidth;
    if (defaultConfig.maxWidth) this.maxWidth = defaultConfig.maxWidth;
    if (defaultConfig.minHeight) this.minHeight = defaultConfig.minHeight;
    if (defaultConfig.maxHeight) this.maxHeight = defaultConfig.maxHeight;

    this.style = {
      ...DEFAULT_HUD_STYLE,
      ...defaultConfig.style,
    };

    this.defaultX = this.x;
    this.defaultY = this.y;
    this.defaultWidth = this.width;
    this.defaultHeight = this.height;
    this.defaultScale = this.scale;
    this.defaultAnchor = this.anchor;
    this.defaultEnabled = this.enabled;
  }

  public getCalculatedPosition(screenWidth: number, screenHeight: number): CalculatedHudPosition {
    if (
      this._lastScreenWidth === screenWidth &&
      this._lastScreenHeight === screenHeight &&
      this._lastDirtyX === this.x &&
      this._lastDirtyY === this.y &&
      this._lastDirtyWidth === this.width &&
      this._lastDirtyHeight === this.height &&
      this._lastDirtyScale === this.scale &&
      this._lastDirtyAnchor === this.anchor
    ) {
      return this._cachedPos;
    }

    const scaledW = Math.round(this.width * this.scale);
    const scaledH = Math.round(this.height * this.scale);

    let baseOriginX = 0;
    let baseOriginY = 0;

    switch (this.anchor) {
      case 'TOP_LEFT':
        baseOriginX = this.x;
        baseOriginY = this.y;
        break;
      case 'TOP_CENTER':
        baseOriginX = Math.round(screenWidth / 2 - scaledW / 2) + this.x;
        baseOriginY = this.y;
        break;
      case 'TOP_RIGHT':
        baseOriginX = screenWidth - (scaledW + this.x);
        baseOriginY = this.y;
        break;
      case 'BOTTOM_LEFT':
        baseOriginX = this.x;
        baseOriginY = screenHeight - (scaledH + this.y);
        break;
      case 'BOTTOM_CENTER':
        baseOriginX = Math.round(screenWidth / 2 - scaledW / 2) + this.x;
        baseOriginY = screenHeight - (scaledH + this.y);
        break;
      case 'BOTTOM_RIGHT':
        baseOriginX = screenWidth - (scaledW + this.x);
        baseOriginY = screenHeight - (scaledH + this.y);
        break;
      case 'CENTER':
        baseOriginX = Math.round(screenWidth / 2 - scaledW / 2) + this.x;
        baseOriginY = Math.round(screenHeight / 2 - scaledH / 2) + this.y;
        break;
    }

    this._cachedPos.screenX = Math.round(baseOriginX);
    this._cachedPos.screenY = Math.round(baseOriginY);
    this._cachedPos.renderWidth = scaledW;
    this._cachedPos.renderHeight = scaledH;

    this._lastScreenWidth = screenWidth;
    this._lastScreenHeight = screenHeight;
    this._lastDirtyX = this.x;
    this._lastDirtyY = this.y;
    this._lastDirtyWidth = this.width;
    this._lastDirtyHeight = this.height;
    this._lastDirtyScale = this.scale;
    this._lastDirtyAnchor = this.anchor;

    return this._cachedPos;
  }

  public resetToDefaults(): void {
    this.x = this.defaultX;
    this.y = this.defaultY;
    this.width = this.defaultWidth;
    this.height = this.defaultHeight;
    this.scale = this.defaultScale;
    this.anchor = this.defaultAnchor;
    this.enabled = this.defaultEnabled;
    this.style = { ...DEFAULT_HUD_STYLE };
  }

  public cloneConfig(): SerializedHudElementConfig {
    return {
      id: this.id,
      enabled: this.enabled,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      scale: this.scale,
      anchor: this.anchor,
      zIndex: this.zIndex,
      style: { ...this.style },
    };
  }

  public abstract render(context: HudRenderContext): void;
}
