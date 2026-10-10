import { describe, it, expect, vi } from 'vitest';
import { HUDManager } from '../client/src/hud/HUDManager';
import { BaseHudElement, HudRenderContext } from '../client/src/hud/IHudElement';
import { HudEditor } from '../client/src/hud/editor/HudEditor';
import { AlignmentEngine } from '../client/src/hud/editor/AlignmentEngine';

class TestBoxElement extends BaseHudElement {
  public renderCalls = 0;
  constructor(id: string, name: string, options: any = {}) {
    super(id, name, options);
  }
  public render(context: HudRenderContext): void {
    this.renderCalls++;
  }
}

describe('HUD Editor - Selection, Drag & Drop, Snapping, Layers & Presets', () => {
  it('selects, deselects, and drags elements smoothly', () => {
    const el1 = new TestBoxElement('box1', 'Box 1', { x: 20, y: 30, width: 100, height: 40 });
    const hud = new HUDManager();
    hud.register(el1);
    const editor = hud.editor;

    expect(editor.getSelectedElement()).toBeNull();

    // Mouse down inside el1 (pos at 1920x1080 is x:20, y:30)
    const hit = editor.onMouseDown(30, 40, 1920, 1080);
    expect(hit).toBe(true);
    expect(editor.getSelectedId()).toBe('box1');
    expect(editor.getSelectedElement()).toBe(el1);

    // Mouse move drags by delta (+50px X, +20px Y)
    editor.onMouseMove(80, 60, 1920, 1080);
    expect(el1.x).toBe(70); // 20 + 50
    expect(el1.y).toBe(50); // 30 + 20

    // Mouse up commits action to undo stack
    editor.onMouseUp();
    expect(editor.undoRedo.canUndo()).toBe(true);

    // Deselect
    editor.deselect();
    expect(editor.getSelectedElement()).toBeNull();
  });

  it('resizes elements and clamps to min and max boundaries', () => {
    const el = new TestBoxElement('resize_box', 'Resize Box', {
      x: 10,
      y: 10,
      width: 100,
      height: 50,
      minWidth: 40,
      maxWidth: 200,
      minHeight: 20,
      maxHeight: 150,
    });
    const hud = new HUDManager();
    hud.register(el);
    const editor = hud.editor;

    editor.select('resize_box');

    // Click on South-East handle at pos (110, 60)
    const hitHandle = editor.onMouseDown(110, 60, 1920, 1080);
    expect(hitHandle).toBe(true);

    // Drag to enlarge (+50px)
    editor.onMouseMove(160, 110, 1920, 1080);
    expect(el.width).toBe(150);
    expect(el.height).toBe(100);

    // Drag way beyond max (exceeding 200px)
    editor.onMouseMove(400, 300, 1920, 1080);
    expect(el.width).toBe(200); // Clamped to maxWidth
    expect(el.height).toBe(150); // Clamped to maxHeight

    editor.onMouseUp();
    expect(editor.undoRedo.canUndo()).toBe(true);
  });

  it('snaps to screen edges and center using AlignmentEngine', () => {
    const engine = new AlignmentEngine();
    engine.snapDistance = 10;

    // Element near left safe margin (margin = 10)
    const snapLeft = engine.computeSnap(14, 100, 80, 20, 1920, 1080, [], 10);
    expect(snapLeft.snappedX).toBe(true);
    expect(snapLeft.x).toBe(10);

    // Element near horizontal center (1920 / 2 = 960. width = 100. center = 910)
    const snapCenter = engine.computeSnap(914, 100, 100, 20, 1920, 1080, [], 10);
    expect(snapCenter.snappedX).toBe(true);
    expect(snapCenter.x).toBe(910); // Exactly centered
    expect(snapCenter.guides.length).toBeGreaterThan(0);
  });

  it('snaps to grid when gridEnabled is true', () => {
    const engine = new AlignmentEngine();
    expect(engine.snapToGrid(23, 8)).toBe(24);
    expect(engine.snapToGrid(26, 8)).toBe(24);
    expect(engine.snapToGrid(28, 8)).toBe(32);
  });

  it('clamps element within screen safe areas', () => {
    const el = new TestBoxElement('safe_box', 'Safe Box', { x: -50, y: -20, width: 80, height: 20 });
    const hud = new HUDManager();
    hud.register(el);
    const editor = hud.editor;

    editor.clampToSafeArea(el, 1920, 1080);
    const pos = el.getCalculatedPosition(1920, 1080);
    expect(pos.screenX).toBeGreaterThanOrEqual(10);
    expect(pos.screenY).toBeGreaterThanOrEqual(10);
  });

  it('manages layers / zIndex (bringForward, sendBackward, bringToFront, sendToBack)', () => {
    const el1 = new TestBoxElement('layer1', 'Layer 1', { zIndex: 1 });
    const el2 = new TestBoxElement('layer2', 'Layer 2', { zIndex: 5 });
    const hud = new HUDManager();
    hud.register(el1);
    hud.register(el2);
    const editor = hud.editor;

    editor.bringForward('layer1');
    expect(el1.zIndex).toBe(2);

    editor.sendBackward('layer1');
    expect(el1.zIndex).toBe(1);

    editor.bringToFront('layer1');
    expect(el1.zIndex).toBe(6); // Higher than el2 (5)

    editor.sendToBack('layer1');
    expect(el1.zIndex).toBe(0);
  });

  it('copies and pastes element styles across elements', () => {
    const el1 = new TestBoxElement('src', 'Source', {
      scale: 1.5,
      style: { textColor: '#22c55e', borderRadius: 8 },
    });
    const el2 = new TestBoxElement('dst', 'Target', {
      scale: 1.0,
      style: { textColor: '#ffffff', borderRadius: 0 },
    });
    const hud = new HUDManager();
    hud.register(el1);
    hud.register(el2);
    const editor = hud.editor;

    editor.copyElement('src');
    editor.pasteElement('dst');

    expect(el2.scale).toBe(1.5);
    expect(el2.style.textColor).toBe('#22c55e');
    expect(el2.style.borderRadius).toBe(8);
  });

  it('applies HUD layout presets (PvP, Minimal, Performance)', () => {
    const fps = new TestBoxElement('hud_fps', 'FPS');
    const ping = new TestBoxElement('hud_ping', 'Ping');
    const coords = new TestBoxElement('hud_coords', 'Coords');
    const keystrokes = new TestBoxElement('hud_keystrokes', 'Keystrokes');

    const hud = new HUDManager();
    hud.register(fps);
    hud.register(ping);
    hud.register(coords);
    hud.register(keystrokes);

    // Apply PvP Preset
    hud.editor.applyPreset('PvP');
    expect(keystrokes.enabled).toBe(true);
    expect(fps.enabled).toBe(true);

    // Apply Minimal Preset
    hud.editor.applyPreset('Minimal');
    expect(keystrokes.enabled).toBe(false);
    expect(coords.enabled).toBe(false);
  });

  it('exports and imports layout JSON safely', () => {
    const el = new TestBoxElement('io_box', 'IO Box', { x: 55, y: 77, scale: 1.25 });
    const hud = new HUDManager();
    hud.register(el);

    const json = hud.editor.exportLayout();
    expect(json).toContain('"io_box"');

    // Mutate
    el.x = 0;
    el.y = 0;

    // Import back
    const res = hud.editor.importLayout(json);
    expect(res.success).toBe(true);
    expect(el.x).toBe(55);
    expect(el.y).toBe(77);
  });
});
