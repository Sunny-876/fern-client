export type WaypointDimension = 'overworld' | 'the_nether' | 'the_end' | 'custom';
export type WaypointCategory = 'Base' | 'Village' | 'Portal' | 'Mining Area' | 'Farm' | 'Custom';

export interface Waypoint {
  id: string;
  name: string;
  category: WaypointCategory;
  dimension: WaypointDimension;
  x: number;
  y: number;
  z: number;
  color: string;
  enabled: boolean;
  createdAt: number;
}

export class WaypointManager {
  private waypoints: Map<string, Waypoint> = new Map();

  constructor() {
    this.initDefaultWaypoints();
  }

  private initDefaultWaypoints(): void {
    const baseWp: Waypoint = {
      id: 'wp_default_base',
      name: 'Main Base',
      category: 'Base',
      dimension: 'overworld',
      x: 0,
      y: 64,
      z: 0,
      color: '#22c55e',
      enabled: true,
      createdAt: Date.now(),
    };
    this.waypoints.set(baseWp.id, baseWp);
  }

  public getAllWaypoints(dimension?: WaypointDimension): Waypoint[] {
    const all = Array.from(this.waypoints.values());
    if (dimension) {
      return all.filter((w) => w.dimension === dimension);
    }
    return all;
  }

  public getWaypoint(id: string): Waypoint | undefined {
    return this.waypoints.get(id);
  }

  public addWaypoint(params: {
    name: string;
    category?: WaypointCategory;
    dimension?: WaypointDimension;
    x: number;
    y: number;
    z: number;
    color?: string;
    enabled?: boolean;
  }): Waypoint {
    const id = `wp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const wp: Waypoint = {
      id,
      name: params.name,
      category: params.category || 'Custom',
      dimension: params.dimension || 'overworld',
      x: Math.round(params.x),
      y: Math.round(params.y),
      z: Math.round(params.z),
      color: params.color || '#38bdf8',
      enabled: params.enabled !== undefined ? params.enabled : true,
      createdAt: Date.now(),
    };
    this.waypoints.set(id, wp);
    return wp;
  }

  public updateWaypoint(id: string, updates: Partial<Waypoint>): Waypoint | null {
    const wp = this.waypoints.get(id);
    if (!wp) return null;

    if (updates.name !== undefined) wp.name = updates.name;
    if (updates.category !== undefined) wp.category = updates.category;
    if (updates.dimension !== undefined) wp.dimension = updates.dimension;
    if (updates.x !== undefined) wp.x = Math.round(updates.x);
    if (updates.y !== undefined) wp.y = Math.round(updates.y);
    if (updates.z !== undefined) wp.z = Math.round(updates.z);
    if (updates.color !== undefined) wp.color = updates.color;
    if (updates.enabled !== undefined) wp.enabled = updates.enabled;

    return wp;
  }

  public deleteWaypoint(id: string): boolean {
    return this.waypoints.delete(id);
  }

  public toggleWaypoint(id: string): boolean {
    const wp = this.waypoints.get(id);
    if (!wp) return false;
    wp.enabled = !wp.enabled;
    return wp.enabled;
  }

  public calculateDistance(wp: Waypoint, px: number, py: number, pz: number): number {
    const dx = wp.x - px;
    const dy = wp.y - py;
    const dz = wp.z - pz;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  public getNearbyWaypoints(
    playerPos: { x: number; y: number; z: number; dimension?: string },
    maxDistance = 5000
  ): Array<Waypoint & { distance: number }> {
    const currentDim = playerPos.dimension || 'overworld';
    const active = this.getAllWaypoints().filter(
      (w) => w.enabled && (w.dimension === currentDim || w.dimension === 'custom')
    );

    return active
      .map((w) => ({
        ...w,
        distance: Math.round(this.calculateDistance(w, playerPos.x, playerPos.y, playerPos.z)),
      }))
      .filter((w) => w.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);
  }

  public serialize(): Waypoint[] {
    return Array.from(this.waypoints.values());
  }

  public deserialize(data: Waypoint[]): void {
    if (!Array.isArray(data)) return;
    this.waypoints.clear();
    for (const w of data) {
      if (w && w.id) {
        this.waypoints.set(w.id, w);
      }
    }
  }
}
