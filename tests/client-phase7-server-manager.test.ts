import { describe, it, expect, beforeEach } from 'vitest';
import { ServerManager } from '../client/src/modules/multiplayer/ServerManager';

describe('Phase 7 - Server Manager & Multiplayer Utilities', () => {
  let serverManager: ServerManager;

  beforeEach(() => {
    serverManager = new ServerManager();
  });

  it('initializes with default servers', () => {
    const servers = serverManager.getAllServers();
    expect(servers.length).toBeGreaterThanOrEqual(2);
    expect(servers.some((s) => s.name === 'Hypixel Network')).toBe(true);
  });

  it('manages favorites correctly', () => {
    const favorites = serverManager.getFavorites();
    expect(favorites.length).toBeGreaterThanOrEqual(1);

    const minemen = serverManager.getAllServers().find((s) => s.address === 'na.minemen.club');
    expect(minemen).toBeDefined();

    const isFav = serverManager.toggleFavorite(minemen!.id);
    expect(isFav).toBe(true);
    expect(serverManager.getFavorites().some((s) => s.id === minemen!.id)).toBe(true);

    const unFav = serverManager.toggleFavorite(minemen!.id);
    expect(unFav).toBe(false);
  });

  it('adds and removes servers', () => {
    const custom = serverManager.addServer('Survival SMP', 'smp.fernclient.net');
    expect(custom.id).toBeDefined();
    expect(custom.name).toBe('Survival SMP');
    expect(serverManager.getAllServers().some((s) => s.id === custom.id)).toBe(true);

    const removed = serverManager.removeServer(custom.id);
    expect(removed).toBe(true);
    expect(serverManager.getAllServers().some((s) => s.id === custom.id)).toBe(false);
  });

  it('filters servers using case-insensitive search', () => {
    serverManager.addServer('PvP Land', 'pvp.land');

    const hypixelSearch = serverManager.searchServers('hypixel');
    expect(hypixelSearch.length).toBe(1);
    expect(hypixelSearch[0].name).toBe('Hypixel Network');

    const ipSearch = serverManager.searchServers('pvp.land');
    expect(ipSearch.length).toBe(1);
    expect(ipSearch[0].name).toBe('PvP Land');

    const emptySearch = serverManager.searchServers('nonexistent_domain_xyz');
    expect(emptySearch.length).toBe(0);
  });

  it('sorts servers by ping, name, and last connected', () => {
    serverManager.addServer('Alpha Server', 'alpha.net');
    serverManager.addServer('Zeta Server', 'zeta.net');

    const byName = serverManager.sortServers('name');
    expect(byName[0].name.localeCompare(byName[1].name)).toBeLessThanOrEqual(0);

    const hypixel = serverManager.getAllServers().find((s) => s.name === 'Hypixel Network')!;
    serverManager.recordConnection(hypixel.id);

    const byLastConnected = serverManager.sortServers('lastConnected');
    expect(byLastConnected[0].id).toBe(hypixel.id);
  });

  it('caches server ping and status locally', () => {
    const s = serverManager.addServer('Test Server', 'test.net');
    serverManager.updateStatus(s.id, 18, 50, 100);

    const updated = serverManager.getAllServers().find((srv) => srv.id === s.id)!;
    expect(updated.status).toBe('online');
    expect(updated.pingMs).toBe(18);
    expect(updated.playersOnline).toBe(50);
    expect(updated.maxPlayers).toBe(100);
  });

  it('persists and restores server entries', () => {
    const initial = serverManager.getAllServers();
    const serialized = serverManager.serialize();

    const restoredManager = new ServerManager();
    restoredManager.deserialize(serialized);

    expect(restoredManager.getAllServers().length).toBe(initial.length);
    expect(restoredManager.getAllServers()[0].name).toBe(initial[0].name);
  });
});
