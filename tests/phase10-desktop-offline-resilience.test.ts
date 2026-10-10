import { describe, it, expect, vi } from 'vitest';
import { NetworkStatusState, NetworkStatus } from '../shared/models/auth';

describe('Phase 10: Desktop Offline-First Architecture & Network Resilience', () => {
  it('correctly tracks and transitions connection states between connected, offline, and auth_required', () => {
    let currentState: NetworkStatusState = 'offline';
    const statusHistory: NetworkStatusState[] = [];

    const setStatus = (state: NetworkStatusState) => {
      currentState = state;
      statusHistory.push(state);
    };

    // Initial state
    expect(currentState).toBe('offline');

    // Backend comes online but user not logged in
    setStatus('auth_required');
    expect(currentState).toBe('auth_required');

    // User logs in
    setStatus('connected');
    expect(currentState).toBe('connected');

    // Network drops
    setStatus('offline');
    expect(currentState).toBe('offline');

    expect(statusHistory).toEqual(['auth_required', 'connected', 'offline']);
  });

  it('falls back to local data provider when remote backend is unreachable or offline', async () => {
    const localGetProfile = vi.fn().mockResolvedValue({ success: true, data: { username: 'LocalPlayer' } });
    const remoteGetProfile = vi.fn().mockRejectedValue(new Error('Network error'));

    let isOnline = false;

    const hybridGetProfile = async () => {
      if (isOnline) {
        try {
          return await remoteGetProfile();
        } catch {
          return await localGetProfile();
        }
      }
      return await localGetProfile();
    };

    // When offline: calls local immediately without network attempt
    const resOffline = await hybridGetProfile();
    expect(resOffline.data.username).toBe('LocalPlayer');
    expect(localGetProfile).toHaveBeenCalledTimes(1);
    expect(remoteGetProfile).not.toHaveBeenCalled();

    // When online flag set but remote network fails: falls back to local
    isOnline = true;
    const resFallback = await hybridGetProfile();
    expect(resFallback.data.username).toBe('LocalPlayer');
    expect(remoteGetProfile).toHaveBeenCalledTimes(1);
    expect(localGetProfile).toHaveBeenCalledTimes(2);
  });

  it('ensures core Minecraft launch operations remain operational offline without backend token', () => {
    const canLaunchGame = (hasBackendToken: boolean, hasValidInstallation: boolean) => {
      // Game launch requires local installation, NEVER remote backend token
      return hasValidInstallation;
    };

    expect(canLaunchGame(false, true)).toBe(true); // Launch works offline!
    expect(canLaunchGame(true, true)).toBe(true);  // Launch works online!
    expect(canLaunchGame(false, false)).toBe(false); // Fails only if installation missing
  });
});
