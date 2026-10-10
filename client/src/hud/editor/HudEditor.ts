import { IHudElement, HudRenderContext, SerializedHudElementConfig, HudAnchor } from '../IHudElement';
import { AlignmentEngine, SnapGuideLine } from './AlignmentEngine';
import { UndoRedoManager } from './UndoRedoManager';
import { HUD_LAYOUT_PRESETS, HudPresetName } from './LayoutPresets';

export type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw' | 'e' | 's';

export interface HudClipboardData {
  width: number;
  height: number;
  scale: number;
  style: any;
}

export class HudEditor {
  public readonly alignmentEngine = new AlignmentEngine();
  public readonly undoRedo = new UndoRedoManager();

  // Selection & Interaction State
  private selectedId: string | null = null;
  private hoveredId: string | null = null;
  private isDragging = false;
  private isResizing = false;
  private activeResizeHandle: ResizeHandle | null = null;

  // Drag coordinates
  private dragStartX = 0;
  private dragStartY = 0;
  private origElementX = 0;
  private origElementY = 0;
  private origWidth = 0;
  private origHeight = 0;
  private origScale = 1.0;

  // Grid & Snapping settings
  public gridEnabled = false;
  public gridSize = 8;
  public snappingEnabled = true;
  public safeAreaMargin = 10;
  public activeGuides: SnapGuideLine[] = [];

  // Clipboard
  private clipboard: HudClipboardData | null = null;

  constructor(private getElements: () => IHudElement[]) {}

  public getSelectedId(): string | null {
    return this.selectedId;
  }

  public getSelectedElement(): IHudElement | null {
    if (!this.selectedId) return null;
    return this.getElements().find((e) => e.id === this.selectedId) || null;
  }

  public select(id: string | null): void {
    this.selectedId = id;
    this.activeGuides = [];
  }

  public deselect(): void {
    this.selectedId = null;
    this.activeGuides = [];
  }

  // --- Mouse & Interaction Handlers ---

  public onMouseDown(mouseX: number, mouseY: number, screenWidth: number, screenHeight: number): boolean {
    const selected = this.getSelectedElement();

    // 1. Check if clicking on resize handles of already selected element
    if (selected) {
      const handle = this.hitTestResizeHandles(selected, mouseX, mouseY, screenWidth, screenHeight);
      if (handle) {
        this.isResizing = true;
        this.activeResizeHandle = handle;
        this.dragStartX = mouseX;
        this.dragStartY = mouseY;
        this.origWidth = selected.width;
        this.origHeight = selected.height;
        this.origScale = selected.scale;
        return true;
      }
    }

    // 2. Hit-test elements in reverse zIndex order (topmost first)
    const sorted = [...this.getElements()].sort((a, b) => b.zIndex - a.zIndex);
    for (const el of sorted) {
      const pos = el.getCalculatedPosition(screenWidth, screenHeight);
      if (
        mouseX >= pos.screenX &&
        mouseX <= pos.screenX + pos.renderWidth &&
        mouseY >= pos.screenY &&
        mouseY <= pos.screenY + pos.renderHeight
      ) {
        this.select(el.id);
        this.isDragging = true;
        this.dragStartX = mouseX;
        this.dragStartY = mouseY;
        this.origElementX = el.x;
        this.origElementY = el.y;
        return true;
      }
    }

    // Clicked empty background
    this.deselect();
    return false;
  }

  public onMouseMove(mouseX: number, mouseY: number, screenWidth: number, screenHeight: number): void {
    const selected = this.getSelectedElement();

    // Handle element dragging
    if (this.isDragging && selected) {
      const deltaX = mouseX - this.dragStartX;
      const deltaY = mouseY - this.dragStartY;

      let newX = this.origElementX + deltaX;
      let newY = this.origElementY + deltaY;

      // Grid snap
      if (this.gridEnabled) {
        newX = this.alignmentEngine.snapToGrid(newX, this.gridSize);
        newY = this.alignmentEngine.snapToGrid(newY, this.gridSize);
      }

      // Edge & Center Snapping
      if (this.snappingEnabled) {
        // Temporarily set position to compute absolute bounds
        selected.x = newX;
        selected.y = newY;
        const pos = selected.getCalculatedPosition(screenWidth, screenHeight);
        const otherElements = this.getElements().filter((e) => e.id !== selected.id);

        const snap = this.alignmentEngine.computeSnap(
          pos.screenX,
          pos.screenY,
          pos.renderWidth,
          pos.renderHeight,
          screenWidth,
          screenHeight,
          otherElements,
          this.safeAreaMargin
        );

        if (snap.snappedX || snap.snappedY) {
          const diffX = snap.x - pos.screenX;
          const diffY = snap.y - pos.screenY;
          newX += diffX;
          newY += diffY;
          this.activeGuides = snap.guides;
        } else {
          this.activeGuides = [];
        }
      }

      selected.x = Math.round(newX);
      selected.y = Math.round(newY);
      this.clampToSafeArea(selected, screenWidth, screenHeight);
      return;
    }

    // Handle element resizing
    if (this.isResizing && selected && this.activeResizeHandle) {
      const deltaX = mouseX - this.dragStartX;
      const deltaY = mouseY - this.dragStartY;

      if (this.activeResizeHandle === 'se' || this.activeResizeHandle === 'e') {
        const nextW = Math.max(selected.minWidth, Math.min(selected.maxWidth, this.origWidth + deltaX));
        selected.width = Math.round(nextW);
      }
      if (this.activeResizeHandle === 'se' || this.activeResizeHandle === 's') {
        const nextH = Math.max(selected.minHeight, Math.min(selected.maxHeight, this.origHeight + deltaY));
        selected.height = Math.round(nextH);
      }
      return;
    }

    // Update hovered element for highlight
    const sorted = [...this.getElements()].sort((a, b) => b.zIndex - a.zIndex);
    let foundHover: string | null = null;
    for (const el of sorted) {
      const pos = el.getCalculatedPosition(screenWidth, screenHeight);
      if (
        mouseX >= pos.screenX &&
        mouseX <= pos.screenX + pos.renderWidth &&
        mouseY >= pos.screenY &&
        mouseY <= pos.screenY + pos.renderHeight
      ) {
        foundHover = el.id;
        break;
      }
    }
    this.hoveredId = foundHover;
  }

  public onMouseUp(): void {
    const selected = this.getSelectedElement();

    if (this.isDragging && selected) {
      const finalX = selected.x;
      const finalY = selected.y;
      const initialX = this.origElementX;
      const initialY = this.origElementY;

      if (finalX !== initialX || finalY !== initialY) {
        this.undoRedo.push({
          type: 'MOVE',
          description: `Move ${selected.name}`,
          elementId: selected.id,
          undo: () => {
            selected.x = initialX;
            selected.y = initialY;
          },
          redo: () => {
            selected.x = finalX;
            selected.y = finalY;
          },
        });
      }
    }

    if (this.isResizing && selected) {
      const finalW = selected.width;
      const finalH = selected.height;
      const initialW = this.origWidth;
      const initialH = this.origHeight;

      if (finalW !== initialW || finalH !== initialH) {
        this.undoRedo.push({
          type: 'RESIZE',
          description: `Resize ${selected.name}`,
          elementId: selected.id,
          undo: () => {
            selected.width = initialW;
            selected.height = initialH;
          },
          redo: () => {
            selected.width = finalW;
            selected.height = finalH;
          },
        });
      }
    }

    this.isDragging = false;
    this.isResizing = false;
    this.activeResizeHandle = null;
    this.activeGuides = [];
  }

  // --- Safe Area & Positioning Utilities ---

  public clampToSafeArea(element: IHudElement, screenWidth: number, screenHeight: number): void {
    const pos = element.getCalculatedPosition(screenWidth, screenHeight);
    const m = this.safeAreaMargin;

    // Check bounds
    if (pos.screenX < m) {
      element.x += m - pos.screenX;
    }
    if (pos.screenX + pos.renderWidth > screenWidth - m) {
      element.x -= pos.screenX + pos.renderWidth - (screenWidth - m);
    }
    if (pos.screenY < m) {
      element.y += m - pos.screenY;
    }
    if (pos.screenY + pos.renderHeight > screenHeight - m) {
      element.y -= pos.screenY + pos.renderHeight - (screenHeight - m);
    }
  }

  public centerElement(id: string, screenWidth: number, screenHeight: number): boolean {
    const el = this.getElements().find((e) => e.id === id);
    if (!el) return false;

    const oldX = el.x;
    const oldY = el.y;
    const oldAnchor = el.anchor;

    el.anchor = 'CENTER';
    el.x = 0;
    el.y = 0;

    this.undoRedo.push({
      type: 'MOVE',
      description: `Center ${el.name}`,
      elementId: el.id,
      undo: () => {
        el.anchor = oldAnchor;
        el.x = oldX;
        el.y = oldY;
      },
      redo: () => {
        el.anchor = 'CENTER';
        el.x = 0;
        el.y = 0;
      },
    });

    return true;
  }

  public resetPosition(id: string): boolean {
    const el = this.getElements().find((e) => e.id === id);
    if (!el || !el.resetToDefaults) return false;

    const snapshot = el.cloneConfig ? el.cloneConfig() : null;
    el.resetToDefaults();

    if (snapshot) {
      this.undoRedo.push({
        type: 'RESET',
        description: `Reset ${el.name}`,
        elementId: el.id,
        undo: () => {
          el.x = snapshot.x;
          el.y = snapshot.y;
          el.scale = snapshot.scale;
          el.anchor = snapshot.anchor as any;
          if (snapshot.width) el.width = snapshot.width;
          if (snapshot.height) el.height = snapshot.height;
        },
        redo: () => {
          el.resetToDefaults?.();
        },
      });
    }

    return true;
  }

  // --- Layer Management ---

  public bringForward(id: string): boolean {
    const el = this.getElements().find((e) => e.id === id);
    if (!el) return false;
    const prev = el.zIndex;
    el.zIndex += 1;
    this.undoRedo.push({
      type: 'LAYER',
      description: `Bring Forward ${el.name}`,
      elementId: el.id,
      undo: () => { el.zIndex = prev; },
      redo: () => { el.zIndex = prev + 1; },
    });
    return true;
  }

  public sendBackward(id: string): boolean {
    const el = this.getElements().find((e) => e.id === id);
    if (!el) return false;
    const prev = el.zIndex;
    el.zIndex = Math.max(0, el.zIndex - 1);
    this.undoRedo.push({
      type: 'LAYER',
      description: `Send Backward ${el.name}`,
      elementId: el.id,
      undo: () => { el.zIndex = prev; },
      redo: () => { el.zIndex = Math.max(0, prev - 1); },
    });
    return true;
  }

  public bringToFront(id: string): boolean {
    const el = this.getElements().find((e) => e.id === id);
    if (!el) return false;
    const maxZ = Math.max(...this.getElements().map((e) => e.zIndex), 0);
    const prev = el.zIndex;
    el.zIndex = maxZ + 1;
    this.undoRedo.push({
      type: 'LAYER',
      description: `Bring to Front ${el.name}`,
      elementId: el.id,
      undo: () => { el.zIndex = prev; },
      redo: () => { el.zIndex = maxZ + 1; },
    });
    return true;
  }

  public sendToBack(id: string): boolean {
    const el = this.getElements().find((e) => e.id === id);
    if (!el) return false;
    const minZ = Math.min(...this.getElements().map((e) => e.zIndex), 0);
    const prev = el.zIndex;
    el.zIndex = Math.max(0, minZ - 1);
    this.undoRedo.push({
      type: 'LAYER',
      description: `Send to Back ${el.name}`,
      elementId: el.id,
      undo: () => { el.zIndex = prev; },
      redo: () => { el.zIndex = Math.max(0, minZ - 1); },
    });
    return true;
  }

  // --- Clipboard & Copy/Paste ---

  public copyElement(id: string): boolean {
    const el = this.getElements().find((e) => e.id === id);
    if (!el) return false;
    this.clipboard = {
      width: el.width,
      height: el.height,
      scale: el.scale,
      style: JSON.parse(JSON.stringify(el.style)),
    };
    return true;
  }

  public pasteElement(targetId: string): boolean {
    if (!this.clipboard) return false;
    const el = this.getElements().find((e) => e.id === targetId);
    if (!el) return false;

    const oldStyle = JSON.parse(JSON.stringify(el.style));
    const oldScale = el.scale;
    const clip = { ...this.clipboard };

    el.scale = clip.scale;
    el.style = { ...el.style, ...clip.style };

    this.undoRedo.push({
      type: 'STYLE',
      description: `Paste Style to ${el.name}`,
      elementId: el.id,
      undo: () => {
        el.scale = oldScale;
        el.style = oldStyle;
      },
      redo: () => {
        el.scale = clip.scale;
        el.style = { ...el.style, ...clip.style };
      },
    });

    return true;
  }

  // --- Presets & Layout Operations ---

  public applyPreset(presetName: HudPresetName): boolean {
    const preset = HUD_LAYOUT_PRESETS[presetName];
    if (!preset) return false;

    for (const conf of preset.elements) {
      const el = this.getElements().find((e) => e.id === conf.id);
      if (el) {
        el.enabled = conf.enabled;
        el.x = conf.x;
        el.y = conf.y;
        el.scale = conf.scale;
        el.anchor = conf.anchor as HudAnchor;
        if (conf.zIndex !== undefined) el.zIndex = conf.zIndex;
        if (conf.style) el.style = { ...el.style, ...conf.style };
      }
    }
    return true;
  }

  public exportLayout(): string {
    const data = this.getElements().map((el) => ({
      id: el.id,
      name: el.name,
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
    return JSON.stringify({ version: 1, exportedAt: Date.now(), elements: data }, null, 2);
  }

  public importLayout(jsonStr: string): { success: boolean; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || !Array.isArray(parsed.elements)) {
        return { success: false, error: 'Invalid HUD layout JSON: missing elements array' };
      }

      for (const item of parsed.elements) {
        if (!item.id || typeof item.id !== 'string') continue;
        const el = this.getElements().find((e) => e.id === item.id);
        if (el) {
          if (typeof item.enabled === 'boolean') el.enabled = item.enabled;
          if (typeof item.x === 'number') el.x = item.x;
          if (typeof item.y === 'number') el.y = item.y;
          if (typeof item.width === 'number') el.width = item.width;
          if (typeof item.height === 'number') el.height = item.height;
          if (typeof item.scale === 'number') el.scale = Math.max(0.5, Math.min(2.5, item.scale));
          if (typeof item.anchor === 'string') el.anchor = item.anchor;
          if (typeof item.zIndex === 'number') el.zIndex = item.zIndex;
          if (item.style && typeof item.style === 'object') el.style = { ...el.style, ...item.style };
        }
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // --- Rendering Overlay ---

  public renderEditorOverlay(context: HudRenderContext): void {
    const { screenWidth, screenHeight, drawRect, drawText, drawLine } = context;

    // 1. Grid rendering (optional)
    if (this.gridEnabled && drawLine) {
      const gridColor = 'rgba(255, 255, 255, 0.05)';
      for (let x = 0; x < screenWidth; x += this.gridSize * 4) {
        drawLine(x, 0, x, screenHeight, gridColor);
      }
      for (let y = 0; y < screenHeight; y += this.gridSize * 4) {
        drawLine(0, y, screenWidth, y, gridColor);
      }
    }

    // 2. Safe area border
    if (drawRect) {
      const m = this.safeAreaMargin;
      drawRect(m, m, screenWidth - m * 2, screenHeight - m * 2, 'transparent');
    }

    // 3. Active alignment snap lines
    if (drawLine && this.activeGuides.length > 0) {
      const guideColor = '#22c55e';
      for (const g of this.activeGuides) {
        if (g.orientation === 'vertical') {
          drawLine(g.position, g.start, g.position, g.end, guideColor, 1);
        } else {
          drawLine(g.start, g.position, g.end, g.position, guideColor, 1);
        }
      }
    }

    // 4. Highlight hovered element
    if (this.hoveredId && this.hoveredId !== this.selectedId && drawRect) {
      const hovered = this.getElements().find((e) => e.id === this.hoveredId);
      if (hovered) {
        const hPos = hovered.getCalculatedPosition(screenWidth, screenHeight);
        drawRect(hPos.screenX - 1, hPos.screenY - 1, hPos.renderWidth + 2, hPos.renderHeight + 2, 'rgba(255, 255, 255, 0.2)');
      }
    }

    // 5. Selected Element Bounding Box & Handles
    const selected = this.getSelectedElement();
    if (selected && drawRect && drawText) {
      const pos = selected.getCalculatedPosition(screenWidth, screenHeight);

      // Main selection border
      drawRect(pos.screenX - 2, pos.screenY - 2, pos.renderWidth + 4, pos.renderHeight + 4, 'rgba(34, 197, 94, 0.45)');

      // Top badge with element name & position
      const badgeText = `${selected.name} [X:${selected.x} Y:${selected.y} S:${selected.scale.toFixed(2)}]`;
      drawRect(pos.screenX - 2, pos.screenY - 16, Math.max(badgeText.length * 7, 100), 14, '#111827');
      drawText(badgeText, pos.screenX + 2, pos.screenY - 14, '#22c55e', false);

      // Corner resize handles
      const handleSize = 6;
      const hColor = '#22c55e';
      // Top-Left (nw)
      drawRect(pos.screenX - 3, pos.screenY - 3, handleSize, handleSize, hColor);
      // Top-Right (ne)
      drawRect(pos.screenX + pos.renderWidth - 3, pos.screenY - 3, handleSize, handleSize, hColor);
      // Bottom-Left (sw)
      drawRect(pos.screenX - 3, pos.screenY + pos.renderHeight - 3, handleSize, handleSize, hColor);
      // Bottom-Right (se)
      drawRect(pos.screenX + pos.renderWidth - 3, pos.screenY + pos.renderHeight - 3, handleSize, handleSize, hColor);
      // East (e)
      drawRect(pos.screenX + pos.renderWidth - 3, pos.screenY + Math.round(pos.renderHeight / 2) - 3, handleSize, handleSize, hColor);
      // South (s)
      drawRect(pos.screenX + Math.round(pos.renderWidth / 2) - 3, pos.screenY + pos.renderHeight - 3, handleSize, handleSize, hColor);
    }
  }

  private hitTestResizeHandles(
    el: IHudElement,
    mouseX: number,
    mouseY: number,
    screenWidth: number,
    screenHeight: number
  ): ResizeHandle | null {
    const pos = el.getCalculatedPosition(screenWidth, screenHeight);
    const radius = 6;

    // SE handle (bottom right)
    if (
      Math.abs(mouseX - (pos.screenX + pos.renderWidth)) <= radius &&
      Math.abs(mouseY - (pos.screenY + pos.renderHeight)) <= radius
    ) {
      return 'se';
    }

    // East handle (right middle)
    if (
      Math.abs(mouseX - (pos.screenX + pos.renderWidth)) <= radius &&
      Math.abs(mouseY - (pos.screenY + Math.round(pos.renderHeight / 2))) <= radius
    ) {
      return 'e';
    }

    // South handle (bottom middle)
    if (
      Math.abs(mouseX - (pos.screenX + Math.round(pos.renderWidth / 2))) <= radius &&
      Math.abs(mouseY - (pos.screenY + pos.renderHeight)) <= radius
    ) {
      return 's';
    }

    return null;
  }
}
