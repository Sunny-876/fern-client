import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { Account } from '../../../shared/models/account';

export interface StoredTokens {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  updatedAt: number;
}

/**
 * SecureTokenStorage
 *
 * Handles OS/machine-specific encryption for sensitive authentication tokens.
 * Guarantees tokens are never written in plaintext JSON, exposed in crash reports,
 * logs, or debug output.
 */
export class SecureTokenStorage {
  private vaultPath: string;
  private encryptionKey: Buffer;
  private tokensMap: Map<string, StoredTokens> = new Map();
  private isLoaded = false;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger
  ) {
    this.vaultPath = path.join(this.pathManager.getAccountsDir(), 'tokens.vault');
    this.encryptionKey = this.deriveMachineKey();
  }

  /**
   * Derives a machine-specific encryption key based on user and platform identifiers.
   */
  private deriveMachineKey(): Buffer {
    const machineId = process.env.COMPUTERNAME || process.env.HOSTNAME || 'FERN_CLIENT_WINDOWS';
    const user = process.env.USERNAME || process.env.USER || 'DEFAULT_USER';
    const salt = 'fern-client-secure-token-vault-v1';
    return crypto.scryptSync(`${machineId}:${user}`, salt, 32);
  }

  public async initialize(): Promise<void> {
    if (this.isLoaded) return;

    try {
      await fs.access(this.vaultPath);
      const rawEncrypted = await fs.readFile(this.vaultPath);
      const decrypted = this.decrypt(rawEncrypted);
      if (decrypted) {
        const parsed: Record<string, StoredTokens> = JSON.parse(decrypted);
        for (const [id, tokens] of Object.entries(parsed)) {
          this.tokensMap.set(id, tokens);
        }
      }
      this.isLoaded = true;
    } catch {
      // Vault file does not exist yet or is empty
      this.tokensMap.clear();
      this.isLoaded = true;
    }
  }

  public async saveTokens(accountId: string, tokens: { accessToken?: string; refreshToken?: string; expiresAt?: number }): Promise<void> {
    await this.initialize();
    this.tokensMap.set(accountId, {
      ...tokens,
      updatedAt: Date.now(),
    });
    await this.persistVault();
  }

  public async getTokens(accountId: string): Promise<StoredTokens | null> {
    await this.initialize();
    return this.tokensMap.get(accountId) || null;
  }

  public async removeTokens(accountId: string): Promise<void> {
    await this.initialize();
    this.tokensMap.delete(accountId);
    await this.persistVault();
  }

  public hasValidTokens(accountId: string): boolean {
    const tokens = this.tokensMap.get(accountId);
    if (!tokens || !tokens.accessToken) return false;
    if (tokens.expiresAt && Date.now() > tokens.expiresAt) return false;
    return true;
  }

  /**
   * Sanitizes an Account object so it never leaks raw tokens into JSON files or logs.
   */
  public sanitizeAccount(account: Account): Account {
    const copy = { ...account };
    delete copy.accessToken;
    delete copy.refreshToken;
    return copy;
  }

  /**
   * Masks tokens for safe logging.
   */
  public static maskToken(token?: string): string {
    if (!token) return '[NONE]';
    if (token.length <= 8) return '***[REDACTED]***';
    return `${token.substring(0, 4)}...[REDACTED]...${token.substring(token.length - 4)}`;
  }

  private async persistVault(): Promise<void> {
    const serialized = JSON.stringify(Object.fromEntries(this.tokensMap.entries()));
    const encrypted = this.encrypt(serialized);
    await fs.mkdir(this.pathManager.getAccountsDir(), { recursive: true });
    await fs.writeFile(this.vaultPath, encrypted);
  }

  private encrypt(text: string): Buffer {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf-8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Format: [12-byte IV][16-byte Tag][Encrypted Data]
    return Buffer.concat([iv, tag, encrypted]);
  }

  private decrypt(buffer: Buffer): string | null {
    try {
      if (buffer.length < 28) return null;
      const iv = buffer.subarray(0, 12);
      const tag = buffer.subarray(12, 28);
      const encrypted = buffer.subarray(28);

      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf-8');
    } catch (err) {
      this.logger.error('SecureTokenStorage', 'Failed to decrypt secure token vault:', err);
      return null;
    }
  }
}
