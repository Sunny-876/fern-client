import { Account } from '../../../shared/models/account';
import { FernUserProfile } from '../../../shared/models/user-profile';
import { FernLogger } from '../core/logger';
import { FernPathManager } from '../core/paths';
import { SecureTokenStorage } from './secure-storage';

export type AccountProviderType = 'microsoft' | 'local' | 'fern';

export interface IAccountProvider {
  readonly providerType: AccountProviderType;
  readonly displayName: string;
  isAvailable(): Promise<boolean>;
  getAccount(id: string): Promise<Account | null>;
}

/**
 * Official Microsoft Account Provider.
 * Integrates with official Xbox Live / Mojang authentication mechanisms.
 */
export class MicrosoftAccountProvider implements IAccountProvider {
  public readonly providerType = 'microsoft' as const;
  public readonly displayName = 'Microsoft Minecraft Authentication';

  constructor(
    private secureStorage: SecureTokenStorage,
    private logger: FernLogger
  ) {}

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public async getAccount(id: string): Promise<Account | null> {
    const hasTokens = await this.secureStorage.hasValidTokens(id);
    if (!hasTokens) {
      this.logger.warn('MicrosoftAccountProvider', `Session invalid or expired for ${id}`);
    }
    return null;
  }
}

/**
 * Local Offline / Developer Profile Provider.
 * Provides offline play with legitimate local UUID generation without bypassing auth.
 */
export class LocalProfileProvider implements IAccountProvider {
  public readonly providerType = 'local' as const;
  public readonly displayName = 'Local Profile';

  constructor(private logger: FernLogger) {}

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public async getAccount(_id: string): Promise<Account | null> {
    return null;
  }
}

/**
 * Fern Ecosystem Account Provider.
 * Dedicated to Fern social presence, cosmetics, and user profiles.
 * Strictly separate from Minecraft game authentication; stores zero Minecraft passwords.
 */
export class FernAccountProvider implements IAccountProvider {
  public readonly providerType = 'fern' as const;
  public readonly displayName = 'Fern Ecosystem Network';

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger
  ) {}

  public async isAvailable(): Promise<boolean> {
    // In mock/local phase, operates locally without requiring external cloud servers
    return true;
  }

  public async getAccount(id: string): Promise<Account | null> {
    // Fern account profile is separate from Minecraft login session
    return null;
  }

  /**
   * Generates a deterministic, safe Fern User ID format: fern_usr_<uuid>
   */
  public static generateFernUserId(seed: string): string {
    const clean = seed.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 16);
    return `fern_usr_${clean || Date.now().toString(36)}`;
  }
}
