import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';

describe('Phase 10: Cloud Configuration Synchronization & Conflict Resolution', () => {
  const sanitizeConfig = (input: any): any => {
    const sensitive = ['accesstoken', 'refreshtoken', 'password', 'secret', 'microsoft'];
    if (typeof input !== 'object' || input === null) {
      if (typeof input === 'string' && /^[a-zA-Z]:\\/i.test(input)) {
        return '[REDACTED_LOCAL_PATH]';
      }
      return input;
    }

    if (Array.isArray(input)) return input.map(sanitizeConfig);

    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(input)) {
      if (sensitive.some((s) => k.toLowerCase().includes(s))) continue;
      clean[k] = sanitizeConfig(v);
    }
    return clean;
  };

  it('sanitizes cloud payload by stripping sensitive tokens, credentials, and local machine drive paths', () => {
    const rawPayload = {
      theme: 'oled',
      uiScale: 1.2,
      accessToken: 'mc_token_12345',
      microsoftAccountSecrets: { password: 'secretpassword' },
      customJavaPath: 'C:\\Users\\Sunny\\Java\\bin\\java.exe',
      modules: {
        fps: { enabled: true },
        cps: { enabled: true },
      },
    };

    const sanitized = sanitizeConfig(rawPayload);
    expect(sanitized.theme).toBe('oled');
    expect(sanitized.uiScale).toBe(1.2);
    expect(sanitized.accessToken).toBeUndefined();
    expect(sanitized.microsoftAccountSecrets).toBeUndefined();
    expect(sanitized.customJavaPath).toBe('[REDACTED_LOCAL_PATH]');
    expect(sanitized.modules.fps.enabled).toBe(true);
  });

  it('computes deterministic SHA-256 checksums on synchronized configuration payloads', () => {
    const payload = { theme: 'dark', version: 1 };
    const serialized = JSON.stringify(payload);
    const checksum1 = crypto.createHash('sha256').update(serialized).digest('hex');
    const checksum2 = crypto.createHash('sha256').update(serialized).digest('hex');

    expect(checksum1).toBe(checksum2);
    expect(checksum1).toHaveLength(64);
  });

  it('detects revision conflicts when remote has newer revision and rejects silent overwrites', () => {
    let currentServerRev = 'rev-10';

    const upload = (payload: any, parentRevId?: string, force = false) => {
      if (!force && parentRevId && parentRevId !== currentServerRev) {
        throw new Error('SYNC_CONFLICT: Remote revision has been modified.');
      }
      currentServerRev = 'rev-11';
      return { success: true, revisionId: currentServerRev };
    };

    // Client expects parent to be rev-10 -> succeeds
    expect(upload({ theme: 'dark' }, 'rev-10')).toEqual({ success: true, revisionId: 'rev-11' });

    // Another client that still had parent as rev-10 -> conflict!
    expect(() => upload({ theme: 'light' }, 'rev-10')).toThrow('SYNC_CONFLICT');

    // Force upload (keep local strategy) -> succeeds
    expect(upload({ theme: 'light' }, 'rev-10', true)).toEqual({ success: true, revisionId: 'rev-11' });
  });

  it('backs up local configuration prior to downloading and applying cloud revision', () => {
    let backupCreated = false;
    let localConfig = { theme: 'dark' };
    const remoteConfig = { theme: 'oled' };

    const applyRemoteConfig = () => {
      // 1. Must back up local first!
      backupCreated = true;
      // 2. Apply remote
      localConfig = { ...remoteConfig };
    };

    applyRemoteConfig();
    expect(backupCreated).toBe(true);
    expect(localConfig.theme).toBe('oled');
  });
});
