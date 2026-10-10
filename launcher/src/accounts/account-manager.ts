import * as fs from 'fs/promises';
import { Account, CreateLocalAccountDTO } from '../../../shared/models/account';
import { generateOfflineUuid } from '../../../shared/utilities/hash-utils';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { FernError, FernErrorCode } from '../core/errors';
import { SecureTokenStorage } from './secure-storage';

interface StoredAccountsData {
  version: number;
  activeAccountId: string | null;
  accounts: Account[];
}

export class AccountManager {
  private accounts: Map<string, Account> = new Map();
  private activeAccountId: string | null = null;
  private isLoaded = false;
  public readonly secureStorage: SecureTokenStorage;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger
  ) {
    this.secureStorage = new SecureTokenStorage(pathManager, logger);
  }

  public async load(): Promise<void> {
    const accountsPath = this.pathManager.getAccountsFilePath();

    try {
      await fs.access(accountsPath);
      const raw = await fs.readFile(accountsPath, 'utf-8');
      const data: StoredAccountsData = JSON.parse(raw);

      this.accounts.clear();
      if (Array.isArray(data.accounts)) {
        for (const acc of data.accounts) {
          this.accounts.set(acc.id, acc);
        }
      }

      this.activeAccountId = data.activeAccountId || null;

      // Validate activeAccountId
      if (this.activeAccountId && !this.accounts.has(this.activeAccountId)) {
        const first = this.accounts.keys().next().value;
        this.activeAccountId = first || null;
      }

      this.isLoaded = true;
      this.logger.info('AccountManager', `Loaded ${this.accounts.size} account(s).`);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.info('AccountManager', 'Accounts file not found, initializing empty store.');
        this.accounts.clear();
        this.activeAccountId = null;
        await this.save();
        this.isLoaded = true;
      } else {
        this.logger.error('AccountManager', 'Failed to load accounts file, backing up and fallback to defaults:', err);
        try {
          const corruptBackupPath = `${accountsPath}.corrupt.${Date.now()}.bak`;
          await fs.copyFile(accountsPath, corruptBackupPath);
          this.logger.info('AccountManager', `Backed up corrupted accounts to ${corruptBackupPath}`);
        } catch (backupErr) {
          this.logger.warn('AccountManager', `Could not create backup of corrupted accounts: ${backupErr}`);
        }
        this.accounts.clear();
        this.activeAccountId = null;
        this.isLoaded = true;
      }
    }
  }

  public getAccounts(): Account[] {
    return Array.from(this.accounts.values()).sort((a, b) => b.lastUsed - a.lastUsed);
  }

  public getAccount(id: string): Account | undefined {
    return this.accounts.get(id);
  }

  public getActiveAccount(): Account | null {
    if (!this.activeAccountId) return null;
    return this.accounts.get(this.activeAccountId) || null;
  }

  public async selectAccount(id: string): Promise<Account> {
    const acc = this.accounts.get(id);
    if (!acc) {
      throw new FernError(
        FernErrorCode.ACCOUNT_NOT_FOUND,
        `Account with ID ${id} not found.`
      );
    }

    acc.lastUsed = Date.now();
    this.activeAccountId = id;
    await this.save();
    this.logger.info('AccountManager', `Selected account: ${acc.displayName} (${acc.type})`);
    return acc;
  }

  /**
   * Creates a local profile for legitimate offline / development / local test environments.
   */
  public async createLocalAccount(dto: CreateLocalAccountDTO): Promise<Account> {
    const name = dto.displayName.trim();

    if (!name || name.length < 3 || name.length > 16 || !/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new FernError(
        FernErrorCode.ACCOUNT_INVALID_USERNAME,
        'Minecraft username must be between 3 and 16 alphanumeric characters (including underscores).',
        'Enter a valid Minecraft username without special characters or spaces.'
      );
    }

    // Check if account already exists with this name and type
    for (const existing of this.accounts.values()) {
      if (existing.type === 'local' && existing.displayName.toLowerCase() === name.toLowerCase()) {
        await this.selectAccount(existing.id);
        return existing;
      }
    }

    const uuid = generateOfflineUuid(name);
    const now = Date.now();

    const newAccount: Account = {
      id: `local-${uuid.substring(0, 8)}`,
      displayName: name,
      type: 'local',
      uuid,
      createdAt: now,
      lastUsed: now,
    };

    this.accounts.set(newAccount.id, newAccount);
    this.activeAccountId = newAccount.id;

    await this.save();
    this.logger.info('AccountManager', `Created local account: ${newAccount.displayName} (UUID: ${uuid})`);
    return newAccount;
  }

  /**
   * Adds an authenticated Microsoft account, storing tokens in the encrypted vault.
   */
  public async addMicrosoftAccount(
    displayName: string,
    uuid: string,
    tokens: { accessToken: string; refreshToken?: string; expiresAt?: number }
  ): Promise<Account> {
    const id = `ms-${uuid.substring(0, 8)}`;
    const now = Date.now();

    const account: Account = {
      id,
      displayName,
      type: 'microsoft',
      uuid,
      createdAt: now,
      lastUsed: now,
    };

    // Store tokens in encrypted OS/machine-level vault
    await this.secureStorage.saveTokens(id, tokens);

    this.accounts.set(id, account);
    this.activeAccountId = id;

    await this.save();
    this.logger.info('AccountManager', `Added Microsoft account: ${displayName} (UUID: ${uuid})`);
    return account;
  }

  public async hasValidSession(accountId: string): Promise<boolean> {
    const account = this.accounts.get(accountId);
    if (!account) return false;
    if (account.type === 'local') return true;
    return this.secureStorage.hasValidTokens(accountId);
  }

  public async removeAccount(id: string): Promise<void> {
    if (!this.accounts.has(id)) {
      throw new FernError(FernErrorCode.ACCOUNT_NOT_FOUND, `Account ${id} does not exist.`);
    }

    this.accounts.delete(id);
    await this.secureStorage.removeTokens(id);

    if (this.activeAccountId === id) {
      const remaining = this.accounts.keys().next().value;
      this.activeAccountId = remaining || null;
    }

    await this.save();
    this.logger.info('AccountManager', `Removed account: ${id}`);
  }

  private async save(): Promise<void> {
    // Sanitize all accounts so NO plaintext tokens are saved in JSON
    const sanitizedAccounts = Array.from(this.accounts.values()).map((acc) =>
      this.secureStorage.sanitizeAccount(acc)
    );

    const data: StoredAccountsData = {
      version: 1,
      activeAccountId: this.activeAccountId,
      accounts: sanitizedAccounts,
    };

    const filePath = this.pathManager.getAccountsFilePath();
    const fs = await import('fs/promises');
    await fs.mkdir(this.pathManager.getAccountsDir(), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}
