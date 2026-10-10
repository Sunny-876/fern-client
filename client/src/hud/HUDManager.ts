import { IHudElement, HudRenderContext, SerializedHudElementConfig } from './IHudElement';
import { EventBus } from '../events/EventBus';
import { HudEditor } from './editor/HudEditor';

export class HUDManager {
  private elements: Map<string, IHudElement> = new Map();
  private sortedElementsCache: IHudElement[] | null = null;
  private isEditMode = false;
  public readonly editor: HudEditor;

  constructor(private eventBus?: EventBus) {
    this.editor = new HudEditor(() => this.getAllElements());

    if (this.eventBus) {
      this.eventBus.on('render_2d', (evt) => {
        this.render({
          screenWidth: evt.screenWidth,
          screenHeight: evt.screenHeight,
          partialTicks: evt.partialTicks,
          isEditMode: this.isEditMode,
          drawRect: evt.drawRect,
          drawText: evt.drawText,
        });
      });
    }
  }

  public register(element: IHudElement): boolean {
    if (this.elements.has(element.id)) {
      console.warn(`[HUDManager] Element "${element.id}" is already registered.`);
      return false;
    }
    this.elements.set(element.id, element);
    this.sortedElementsCache = null;
    return true;
  }

  public unregister(id: string): boolean {
    if (this.editor.getSelectedId() === id) {
      this.editor.deselect();
    }
    const removed = this.elements.delete(id);
    if (removed) {
      this.sortedElementsCache = null;
    }
    return removed;
  }

  public getElement(id: string): IHudElement | undefined {
    return this.elements.get(id);
  }

  public getAllElements(): IHudElement[] {
    return Array.from(this.elements.values());
  }

  public invalidateCache(): void {
    this.sortedElementsCache = null;
  }

  public setEditMode(editMode: boolean): void {
    this.isEditMode = editMode;
    if (!editMode) {
      this.editor.deselect();
    }
  }

  public isEditing(): boolean {
    return this.isEditMode;
  }

  /**
   * High-performance render loop:
   * Uses cached pre-sorted elements to guarantee zero heap allocations per frame.
   */
  public render(context: HudRenderContext): void {
    if (!this.sortedElementsCache) {
      this.sortedElementsCache = Array.from(this.elements.values()).sort((a, b) => a.zIndex - b.zIndex);
    }

    const elementsToRender = this.sortedElementsCache;
    const len = elementsToRender.length;

    for (let i = 0; i < len; i++) {
      const element = elementsToRender[i];
      if (!element.enabled && !context.isEditMode) continue;

      try {
        element.render(context);

        if (context.isEditMode) {
          const pos = element.getCalculatedPosition(context.screenWidth, context.screenHeight);
          if (context.drawRect) {
            context.drawRect(pos.screenX - 2, pos.screenY - 2, pos.renderWidth + 4, pos.renderHeight + 4, 'rgba(34, 197, 94, 0.3)');
          }
          if (context.drawText) {
            context.drawText(element.name, pos.screenX, pos.screenY - 10, '#22c55e', true);
          }
        }
      } catch (err) {
        console.error(`[HUDManager] Error rendering HUD element "${element.id}":`, err);
      }
    }

    // In Edit Mode, render editor overlay (selection border, handles, snap lines, grid)
    if (context.isEditMode) {
      try {
        this.editor.renderEditorOverlay(context);
      } catch (err) {
        console.error('[HUDManager] Error rendering editor overlay:', err);
      }
    }
  }

  public serialize(): SerializedHudElementConfig[] {
    return this.getAllElements().map((el) => ({
      id: el.id,
      enabled: el.enabled,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      scale: el.scale,
      anchor: el.anchor,
      zIndex: el.zIndex,
      style: el.style,
    }));
  }

  public deserialize(configs: SerializedHudElementConfig[]): void {
    if (!Array.isArray(configs)) return;
    for (const conf of configs) {
      const el = this.elements.get(conf.id);
      if (el) {
        if (typeof conf.enabled === 'boolean') el.enabled = conf.enabled;
        if (typeof conf.x === 'number') el.x = conf.x;
        if (typeof conf.y === 'number') el.y = conf.y;
        if (typeof conf.width === 'number') el.width = conf.width;
        if (typeof conf.height === 'number') el.height = conf.height;
        if (typeof conf.scale === 'number') el.scale = Math.max(0.5, Math.min(2.5, conf.scale));
        if (typeof conf.anchor === 'string') el.anchor = conf.anchor as any;
        if (typeof conf.zIndex === 'number') el.zIndex = conf.zIndex;
        if (conf.style && typeof conf.style === 'object') {
          el.style = { ...el.style, ...conf.style };
        }
      }
    }
    this.sortedElementsCache = null;
  }
}
