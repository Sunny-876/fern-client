import { describe, it, expect, vi } from 'vitest';
import { HUDManager } from '../client/src/hud/HUDManager';
import { BaseHudElement, HudRenderContext } from '../client/src/hud/IHudElement';

class MockHudElement extends BaseHudElement {
  public renderCalls = 0;

  constructor(id: string, name: string, options: any) {
    super(id, name, options);
  }

  public render(context: HudRenderContext): void {
    this.renderCalls++;
  }
}

describe('HUD System - Positioning, Multi-Resolution Anchoring & Edit Mode', () => {
  it('registers, unregisters, and renders HUD elements', () => {
    const hud = new HUDManager();
    const el = new MockHudElement('test_el', 'Test Element', {
      x: 10,
      y: 10,
      width: 100,
      height: 20,
      anchor: 'TOP_LEFT',
    });

    expect(hud.register(el)).toBe(true);
    expect(hud.register(el)).toBe(false); // Duplicate rejected
    expect(hud.getAllElements()).toHaveLength(1);

    const context: HudRenderContext = {
      screenWidth: 1920,
      screenHeight: 1080,
      partialTicks: 0,
      isEditMode: false,
    };

    hud.render(context);
    expect(el.renderCalls).toBe(1);

    // Disabled element should not render in normal mode
    el.enabled = false;
    hud.render(context);
    expect(el.renderCalls).toBe(1);

    // But should render in Edit Mode
    context.isEditMode = true;
    hud.render(context);
    expect(el.renderCalls).toBe(2);

    expect(hud.unregister('test_el')).toBe(true);
    expect(hud.getAllElements()).toHaveLength(0);
  });

  it('calculates resolution-independent positions across 720p, 768p, 1080p, 1440p', () => {
    const elTopRight = new MockHudElement('tr', 'Top Right', {
      x: 15,
      y: 10,
      width: 100,
      height: 20,
      anchor: 'TOP_RIGHT',
    });

    const elBottomCenter = new MockHudElement('bc', 'Bottom Center', {
      x: 0,
      y: 30,
      width: 80,
      height: 20,
      anchor: 'BOTTOM_CENTER',
    });

    const resolutions = [
      { w: 1280, h: 720 },
      { w: 1366, h: 768 },
      { w: 1920, h: 1080 },
      { w: 2560, h: 1440 },
    ];

    for (const res of resolutions) {
      const posTR = elTopRight.getCalculatedPosition(res.w, res.h);
      // TOP_RIGHT: screenX = res.w - (width + x) = res.w - 115
      expect(posTR.screenX).toBe(res.w - 115);
      expect(posTR.screenY).toBe(10);

      const posBC = elBottomCenter.getCalculatedPosition(res.w, res.h);
      // BOTTOM_CENTER: screenX = Math.round(res.w / 2 - 80 / 2) = Math.round(res.w / 2 - 40)
      expect(posBC.screenX).toBe(Math.round(res.w / 2 - 40));
      // screenY = res.h - (20 + 30) = res.h - 50
      expect(posBC.screenY).toBe(res.h - 50);
    }
  });

  it('scales HUD element dimensions proportionally', () => {
    const el = new MockHudElement('scale_test', 'Scale Test', {
      x: 10,
      y: 10,
      width: 100,
      height: 20,
      anchor: 'TOP_LEFT',
      scale: 1.5,
    });

    const pos = el.getCalculatedPosition(1920, 1080);
    expect(pos.renderWidth).toBe(150);
    expect(pos.renderHeight).toBe(30);

    el.scale = 0.75;
    const posSmall = el.getCalculatedPosition(1920, 1080);
    expect(posSmall.renderWidth).toBe(75);
    expect(posSmall.renderHeight).toBe(15);
  });

  it('draws bounding rectangles and labels during Edit Mode', () => {
    const hud = new HUDManager();
    const el = new MockHudElement('edit_test', 'Edit Test', {
      x: 10,
      y: 10,
      width: 100,
      height: 20,
      anchor: 'TOP_LEFT',
    });
    hud.register(el);
    hud.setEditMode(true);

    const drawRectSpy = vi.fn();
    const drawTextSpy = vi.fn();

    hud.render({
      screenWidth: 1920,
      screenHeight: 1080,
      partialTicks: 0,
      isEditMode: true,
      drawRect: drawRectSpy,
      drawText: drawTextSpy,
    });

    expect(drawRectSpy).toHaveBeenCalledWith(
      8, // 10 - 2
      8, // 10 - 2
      104, // 100 + 4
      24, // 20 + 4
      expect.any(String)
    );
    expect(drawTextSpy).toHaveBeenCalledWith('Edit Test', 10, 0, '#22c55e', true);
  });

  it('serializes and deserializes element configurations correctly', () => {
    const hud = new HUDManager();
    const el = new MockHudElement('save_el', 'Save El', {
      x: 20,
      y: 30,
      width: 50,
      height: 20,
      anchor: 'TOP_LEFT',
      scale: 1.0,
    });
    hud.register(el);

    const serialized = hud.serialize();
    expect(serialized[0]).toEqual(
      expect.objectContaining({
        id: 'save_el',
        enabled: true,
        x: 20,
        y: 30,
        scale: 1.0,
        anchor: 'TOP_LEFT',
      })
    );

    // Apply updated deserialized values
    hud.deserialize([
      {
        id: 'save_el',
        enabled: false,
        x: 150,
        y: 200,
        scale: 1.8,
        anchor: 'BOTTOM_RIGHT',
      },
    ]);

    expect(el.enabled).toBe(false);
    expect(el.x).toBe(150);
    expect(el.y).toBe(200);
    expect(el.scale).toBe(1.8);
    expect(el.anchor).toBe('BOTTOM_RIGHT');
  });
});
