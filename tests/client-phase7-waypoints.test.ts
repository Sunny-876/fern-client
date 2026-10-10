import { describe, it, expect, beforeEach } from 'vitest';
import { WaypointManager, Waypoint } from '../client/src/modules/waypoints/WaypointManager';
import { WaypointHudModule, WaypointHudElement } from '../client/src/modules/hud/WaypointHudModule';

describe('Phase 7 - Waypoint System', () => {
  let waypointManager: WaypointManager;

  beforeEach(() => {
    waypointManager = new WaypointManager();
  });

  it('creates and retrieves waypoints', () => {
    const wp = waypointManager.addWaypoint({
      name: 'Desert Village',
      category: 'Village',
      dimension: 'overworld',
      x: 350,
      y: 70,
      z: -120,
      color: '#f59e0b',
      enabled: true,
    });

    expect(wp.id).toBeDefined();
    expect(wp.name).toBe('Desert Village');
    expect(wp.category).toBe('Village');
    expect(wp.dimension).toBe('overworld');
    expect(wp.x).toBe(350);
    expect(wp.y).toBe(70);
    expect(wp.z).toBe(-120);

    const retrieved = waypointManager.getWaypoint(wp.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Desert Village');
  });

  it('edits existing waypoints', () => {
    const wp = waypointManager.addWaypoint({
      name: 'Nether Portal 1',
      category: 'Portal',
      dimension: 'the_nether',
      x: 100,
      y: 50,
      z: 200,
    });

    const updated = waypointManager.updateWaypoint(wp.id, {
      name: 'Fortress Nether Portal',
      x: 105,
      enabled: false,
    });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe('Fortress Nether Portal');
    expect(updated?.x).toBe(105);
    expect(updated?.enabled).toBe(false);
  });

  it('deletes and toggles waypoints', () => {
    const wp = waypointManager.addWaypoint({
      name: 'Mineshaft',
      category: 'Mining Area',
      dimension: 'overworld',
      x: -50,
      y: 20,
      z: 80,
    });

    expect(waypointManager.toggleWaypoint(wp.id)).toBe(false);
    expect(waypointManager.getWaypoint(wp.id)?.enabled).toBe(false);
    expect(waypointManager.toggleWaypoint(wp.id)).toBe(true);
    expect(waypointManager.getWaypoint(wp.id)?.enabled).toBe(true);

    const deleted = waypointManager.deleteWaypoint(wp.id);
    expect(deleted).toBe(true);
    expect(waypointManager.getWaypoint(wp.id)).toBeUndefined();
  });

  it('handles dimension filtering correctly', () => {
    waypointManager.addWaypoint({
      name: 'End Fountain',
      category: 'Portal',
      dimension: 'the_end',
      x: 0,
      y: 65,
      z: 0,
    });

    const overworldWps = waypointManager.getAllWaypoints('overworld');
    const endWps = waypointManager.getAllWaypoints('the_end');

    expect(overworldWps.some((w) => w.name === 'End Fountain')).toBe(false);
    expect(endWps.some((w) => w.name === 'End Fountain')).toBe(true);
  });

  it('calculates Euclidean distances accurately', () => {
    const wp = waypointManager.addWaypoint({
      name: 'Outpost',
      dimension: 'overworld',
      x: 300,
      y: 64,
      z: 400,
    });

    // Player at (0, 64, 0) -> distance should be sqrt(300^2 + 400^2) = 500
    const distance = waypointManager.calculateDistance(wp, 0, 64, 0);
    expect(Math.round(distance)).toBe(500);

    const nearby = waypointManager.getNearbyWaypoints({ x: 0, y: 64, z: 0, dimension: 'overworld' }, 1000);
    expect(nearby.some((w) => w.name === 'Outpost' && w.distance === 500)).toBe(true);
  });

  it('serializes and deserializes waypoints without data loss', () => {
    waypointManager.addWaypoint({
      name: 'Mob Farm',
      category: 'Farm',
      dimension: 'overworld',
      x: -200,
      y: 120,
      z: 50,
      color: '#10b981',
    });

    const serialized = waypointManager.serialize();
    expect(serialized.length).toBeGreaterThanOrEqual(2);

    const newManager = new WaypointManager();
    newManager.deserialize(serialized);
    expect(newManager.getAllWaypoints().some((w) => w.name === 'Mob Farm')).toBe(true);
  });

  it('renders correctly in WaypointHudModule', () => {
    const hudModule = new WaypointHudModule(waypointManager);
    expect(hudModule.id).toBe('waypoints_hud');
    expect(hudModule.category).toBe('HUD');

    const renderedTexts: string[] = [];
    const mockContext = {
      screenWidth: 1920,
      screenHeight: 1080,
      partialTicks: 0,
      drawRect: () => {},
      drawText: (text: string) => {
        renderedTexts.push(text);
      },
    };

    hudModule.hudElement.updatePlayerPosition({ x: 0, y: 64, z: 0, dimension: 'overworld' });
    hudModule.hudElement.render(mockContext);

    expect(renderedTexts.length).toBeGreaterThan(0);
    expect(renderedTexts[0]).toContain('Main Base');
  });
});
