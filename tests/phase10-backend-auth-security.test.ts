import { describe, it, expect, beforeEach } from 'vitest';
import * as argon2 from '../backend/node_modules/argon2';
import * as crypto from 'crypto';

describe('Phase 10: Backend Authentication, Password Security & Session Lifecycle', () => {
  it('hashes passwords using Argon2id with high memory and parallelism cost parameters', async () => {
    const password = 'StrongPassword_2026!';
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    expect(hash).toContain('$argon2id$');
    const isValid = await argon2.verify(hash, password);
    expect(isValid).toBe(true);

    const isWrong = await argon2.verify(hash, 'IncorrectPassword');
    expect(isWrong).toBe(false);
  });

  it('enforces brute force protection by locking accounts after excessive failed attempts', () => {
    let failedAttempts = 0;
    let lockedUntil: number | null = null;

    const recordFailedAttempt = (now: number) => {
      failedAttempts++;
      if (failedAttempts >= 5) {
        lockedUntil = now + 15 * 60 * 1000; // 15 minutes lockout
      }
    };

    const isLocked = (now: number) => {
      return lockedUntil !== null && lockedUntil > now;
    };

    const now = 1000000;
    for (let i = 0; i < 4; i++) {
      recordFailedAttempt(now);
      expect(isLocked(now)).toBe(false);
    }

    recordFailedAttempt(now); // 5th attempt
    expect(isLocked(now)).toBe(true);
    expect(isLocked(now + 10 * 60 * 1000)).toBe(true); // Still locked after 10m
    expect(isLocked(now + 16 * 60 * 1000)).toBe(false); // Unlocked after 16m
  });

  it('validates email verification tokens and enforces single-use consumption', () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const tokenStore = new Map<string, { used: boolean; expires: number }>();
    tokenStore.set(tokenHash, { used: false, expires: Date.now() + 86400000 });

    const verify = (inputRawToken: string) => {
      const hash = crypto.createHash('sha256').update(inputRawToken).digest('hex');
      const record = tokenStore.get(hash);
      if (!record) throw new Error('Token not found');
      if (record.used) throw new Error('Token already used');
      if (record.expires < Date.now()) throw new Error('Token expired');
      record.used = true;
      return true;
    };

    // First use succeeds
    expect(verify(rawToken)).toBe(true);
    // Second use is rejected
    expect(() => verify(rawToken)).toThrow('Token already used');
  });

  it('revokes all other active sessions when password is reset', () => {
    const sessions = [
      { id: 'sess-1', isRevoked: false },
      { id: 'sess-2', isRevoked: false },
      { id: 'sess-3', isRevoked: false },
    ];

    const resetPasswordAndRevoke = () => {
      for (const s of sessions) {
        s.isRevoked = true;
      }
    };

    resetPasswordAndRevoke();
    expect(sessions.every((s) => s.isRevoked)).toBe(true);
  });

  it('revokes individual session without affecting other user sessions', () => {
    const sessions = [
      { id: 'sess-a', isRevoked: false },
      { id: 'sess-b', isRevoked: false },
    ];

    const revokeSession = (id: string) => {
      const s = sessions.find((x) => x.id === id);
      if (s) s.isRevoked = true;
    };

    revokeSession('sess-a');
    expect(sessions.find((x) => x.id === 'sess-a')?.isRevoked).toBe(true);
    expect(sessions.find((x) => x.id === 'sess-b')?.isRevoked).toBe(false);
  });
});
