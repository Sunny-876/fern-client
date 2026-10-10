import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { AccountManager } from '../launcher/src/accounts/account-manager';
import { generateOfflineUuid } from '../shared/utilities/hash-utils';
import { FernErrorCode } from '../launcher/src/core/errors';

describe('AccountManager & Offline Auth', () => {
  let tempDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let accountManager: AccountManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-accounts-test-'));
    pathManager = new FernPathManager(tempDir);
    logger = new FernLogger(pathManager);
    accountManager = new AccountManager(pathManager, logger);
    await accountManager.load();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('generates deterministic RFC 4122 v3 UUIDs for offline player names', () => {
    const uuid1 = generateOfflineUuid('Steve');
    const uuid2 = generateOfflineUuid('Steve');
    const uuidAlex = generateOfflineUuid('Alex');

    expect(uuid1).toBe(uuid2);
    expect(uuid1).not.toBe(uuidAlex);
    // Standard Minecraft UUID for "Steve" offline player is 85e40702-8a90-3ce4-bf3e-86e5792c3a3b
    expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-3[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('creates local account and sets it as active if none exists', async () => {
    const account = await accountManager.createLocalAccount({ displayName: 'PlayerOne' });

    expect(account.displayName).toBe('PlayerOne');
    expect(account.type).toBe('local');
    expect(account.id).toBeDefined();
    expect(account.uuid).toBeDefined();

    const active = accountManager.getActiveAccount();
    expect(active?.id).toBe(account.id);
  });

  it('rejects invalid usernames adhering to Minecraft username rules', async () => {
    // Too short
    await expect(accountManager.createLocalAccount({ displayName: 'ab' })).rejects.toThrow();

    // Too long (over 16 chars)
    await expect(accountManager.createLocalAccount({ displayName: 'a_very_long_username_here' })).rejects.toThrow();

    // Invalid characters
    await expect(accountManager.createLocalAccount({ displayName: 'Player!@#' })).rejects.toThrow();
  });

  it('persists and reloads accounts from disk', async () => {
    await accountManager.createLocalAccount({ displayName: 'Tester1' });
    await accountManager.createLocalAccount({ displayName: 'Tester2' });

    // New instance loading from same directory
    const reloaded = new AccountManager(pathManager, logger);
    await reloaded.load();

    const accounts = reloaded.getAccounts();
    expect(accounts.length).toBe(2);
    expect(accounts.map((a) => a.displayName)).toContain('Tester1');
    expect(accounts.map((a) => a.displayName)).toContain('Tester2');
  });

  it('removes an account and safely adjusts active selection', async () => {
    const a1 = await accountManager.createLocalAccount({ displayName: 'UserOne' });
    const a2 = await accountManager.createLocalAccount({ displayName: 'UserTwo' });

    await accountManager.selectAccount(a1.id);
    expect(accountManager.getActiveAccount()?.id).toBe(a1.id);

    await accountManager.removeAccount(a1.id);
    expect(accountManager.getAccount(a1.id)).toBeUndefined();
    // Active should fallback to remaining account
    expect(accountManager.getActiveAccount()?.id).toBe(a2.id);
  });
});
