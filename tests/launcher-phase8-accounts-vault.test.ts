import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SecureTokenStorage } from '../launcher/src/accounts/secure-storage';
import { AccountManager } from '../launcher/src/accounts/account-manager';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';

describe('Phase 8: Secure Token Storage & Account Manager', () => {
  let tempDir: string;
  let paths: FernPathManager;
  let logger: FernLogger;
  let secureStorage: SecureTokenStorage;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fern-accounts-phase8-'));
    paths = new FernPathManager(tempDir);
    await paths.initializeDirectories();
    logger = new FernLogger(paths);
    secureStorage = new SecureTokenStorage(paths, logger);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('securely stores and retrieves sensitive tokens via AES-256-GCM vault', async () => {
    const accountId = 'ms-account-1234';
    const sensitiveTokens = {
      accessToken: 'mc_access_token_secret_123',
      refreshToken: 'mc_refresh_token_secret_456',
      expiresAt: Date.now() + 86400000,
    };

    await secureStorage.saveTokens(accountId, sensitiveTokens);

    // Vault file must exist on disk
    const vaultPath = path.join(paths.getAccountsDir(), 'tokens.vault');
    expect(fs.existsSync(vaultPath)).toBe(true);

    // The vault file content must NOT contain the raw plaintext tokens
    const vaultRawContent = fs.readFileSync(vaultPath, 'utf8');
    expect(vaultRawContent).not.toContain('mc_access_token_secret_123');
    expect(vaultRawContent).not.toContain('mc_refresh_token_secret_456');

    // Retrievable through secure API
    const retrieved = await secureStorage.getTokens(accountId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.accessToken).toBe('mc_access_token_secret_123');
    expect(retrieved?.refreshToken).toBe('mc_refresh_token_secret_456');
  });

  it('removes tokens and securely clears memory cache', async () => {
    const accountId = 'ms-account-to-delete';
    await secureStorage.saveTokens(accountId, {
      accessToken: 'secret_to_delete',
      expiresAt: Date.now() + 10000,
    });

    expect(await secureStorage.hasValidTokens(accountId)).toBe(true);

    await secureStorage.removeTokens(accountId);

    expect(await secureStorage.getTokens(accountId)).toBeNull();
    expect(await secureStorage.hasValidTokens(accountId)).toBe(false);
  });

  it('masks sensitive tokens and produces sanitized string representations', () => {
    const masked = SecureTokenStorage.maskToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(masked.startsWith('eyJh')).toBe(true);
    expect(masked.endsWith('VCJ9')).toBe(true);
    expect(masked).toContain('...');

    const short = SecureTokenStorage.maskToken('abc');
    expect(short).toBe('***[REDACTED]***');
  });

  it('ensures AccountManager never writes plaintext tokens to accounts.json', async () => {
    const accountMgr = new AccountManager(paths, logger);
    await accountMgr.load();

    const created = await accountMgr.addMicrosoftAccount(
      'SunnyGamer',
      'c617b409-a77e-40cb-8d69-c0953a5fa9be',
      {
        accessToken: 'super_sensitive_ms_access_token',
        refreshToken: 'super_sensitive_ms_refresh_token',
        expiresAt: Date.now() + 3600000,
      }
    );

    expect(created.displayName).toBe('SunnyGamer');
    expect(created.type).toBe('microsoft');

    // Check accounts.json file on disk
    const accountsJsonPath = paths.getAccountsFilePath();
    expect(fs.existsSync(accountsJsonPath)).toBe(true);
    const jsonContent = fs.readFileSync(accountsJsonPath, 'utf8');

    // CRITICAL SECURITY ASSERTION: No tokens in JSON
    expect(jsonContent).not.toContain('super_sensitive_ms_access_token');
    expect(jsonContent).not.toContain('super_sensitive_ms_refresh_token');

    // Valid session verification
    const hasSession = await accountMgr.hasValidSession(created.id);
    expect(hasSession).toBe(true);

    // Switching accounts
    await accountMgr.selectAccount(created.id);
    expect(accountMgr.getActiveAccount()?.id).toBe(created.id);

    // Deleting account cleans up secure vault
    await accountMgr.removeAccount(created.id);
    expect(accountMgr.getAccount(created.id)).toBeUndefined();
    expect(await secureStorage.getTokens(created.id)).toBeNull();
  });
});
