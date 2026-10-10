export interface FernServerEntry {
  id: string;
  name: string;
  address: string;
  isFavorite: boolean;
  pingMs?: number;
  status: 'online' | 'offline' | 'unknown';
  playersOnline?: number;
  maxPlayers?: number;
  lastConnected?: number;
  versionCompat?: string;
}

export class ServerManager {
  private servers: Map<string, FernServerEntry> = new Map();

  constructor() {
    this.initDefaultServers();
  }

  private initDefaultServers(): void {
    const defaults: FernServerEntry[] = [
      {
        id: 'hypixel',
        name: 'Hypixel Network',
        address: 'mc.hypixel.net',
        isFavorite: true,
        pingMs: 24,
        status: 'online',
        playersOnline: 45000,
        maxPlayers: 100000,
        versionCompat: '1.8.9 - 1.21.x',
      },
      {
        id: 'minemen',
        name: 'Minemen Club',
        address: 'na.minemen.club',
        isFavorite: false,
        pingMs: 31,
        status: 'online',
        playersOnline: 1200,
        maxPlayers: 5000,
        versionCompat: '1.7 - 1.21.x',
      },
    ];

    for (const s of defaults) {
      this.servers.set(s.id, s);
    }
  }

  public getAllServers(): FernServerEntry[] {
    return Array.from(this.servers.values());
  }

  public getFavorites(): FernServerEntry[] {
    return this.getAllServers().filter((s) => s.isFavorite);
  }

  public addServer(name: string, address: string): FernServerEntry {
    const id = `srv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const entry: FernServerEntry = {
      id,
      name,
      address,
      isFavorite: false,
      status: 'unknown',
    };
    this.servers.set(id, entry);
    return entry;
  }

  public removeServer(id: string): boolean {
    return this.servers.delete(id);
  }

  public toggleFavorite(id: string): boolean {
    const s = this.servers.get(id);
    if (!s) return false;
    s.isFavorite = !s.isFavorite;
    return s.isFavorite;
  }

  public recordConnection(id: string): void {
    const s = this.servers.get(id);
    if (s) {
      s.lastConnected = Date.now();
    }
  }

  public updateStatus(id: string, pingMs: number, players: number, max: number): void {
    const s = this.servers.get(id);
    if (s) {
      s.pingMs = pingMs;
      s.status = 'online';
      s.playersOnline = players;
      s.maxPlayers = max;
    }
  }

  public searchServers(query: string): FernServerEntry[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.getAllServers();
    return this.getAllServers().filter(
      (s) => s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q)
    );
  }

  public sortServers(by: 'name' | 'ping' | 'lastConnected'): FernServerEntry[] {
    const list = [...this.getAllServers()];
    switch (by) {
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'ping':
        return list.sort((a, b) => (a.pingMs ?? 999) - (b.pingMs ?? 999));
      case 'lastConnected':
        return list.sort((a, b) => (b.lastConnected ?? 0) - (a.lastConnected ?? 0));
      default:
        return list;
    }
  }

  public serialize(): FernServerEntry[] {
    return this.getAllServers();
  }

  public deserialize(data: FernServerEntry[]): void {
    if (!Array.isArray(data)) return;
    this.servers.clear();
    for (const item of data) {
      if (item && item.id) {
        this.servers.set(item.id, item);
      }
    }
  }
}
