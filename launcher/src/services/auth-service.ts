import * as fs from 'fs/promises';
import * as path from 'path';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { RemoteFernApiClient } from './remote-fern-api-client';
import { NetworkStatusManager } from './network-status';
import { FernAuthSession, FernAuthUser } from '../../../shared/models/auth';

export class FernAuthService {
  private sessionFile: string;
  private currentSession: FernAuthSession | null = null;

  constructor(
    private readonly pathManager: FernPathManager,
    private readonly logger: FernLogger,
    private readonly apiClient: RemoteFernApiClient,
    private readonly networkStatus: NetworkStatusManager,
  ) {
    this.sessionFile = path.join(this.pathManager.getDataDir(), 'fern-session.json');
  }

  public async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.sessionFile, 'utf-8');
      const session = JSON.parse(data) as FernAuthSession;
      if (session?.accessToken) {
        this.currentSession = session;
        this.apiClient.setToken(session.accessToken);
        this.logger.info('AuthService', `Restored Fern account session for @${session.user.username}`);
      }
    } catch {
      this.logger.info('AuthService', 'No saved Fern account session found.');
    }
  }

  public getSession(): FernAuthSession | null {
    return this.currentSession;
  }

  public getUser(): FernAuthUser | null {
    return this.currentSession?.user || null;
  }

  public isAuthenticated(): boolean {
    return Boolean(this.currentSession?.accessToken);
  }

  public async register(dto: { email: string; username: string; password: string; displayName?: string }) {
    const res = await this.apiClient.auth.register(dto);
    if (!res.success) {
      throw new Error(res.error || 'Registration failed');
    }
    return res.data;
  }

  public async login(dto: { loginIdentifier: string; password: string; deviceInfo?: string }) {
    const res = await this.apiClient.auth.login(dto);
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Authentication failed');
    }

    this.currentSession = res.data;
    this.apiClient.setToken(res.data.accessToken);
    await this.persistSession();
    await this.networkStatus.checkConnection();

    this.logger.info('AuthService', `Logged into Fern account: @${res.data.user.username}`);
    return this.currentSession;
  }

  public async logout() {
    try {
      if (this.currentSession) {
        await this.apiClient.auth.logout();
      }
    } catch (err: any) {
      this.logger.warn('AuthService', `Remote logout failed: ${err.message}`);
    }

    this.currentSession = null;
    this.apiClient.setToken(null);
    try {
      await fs.unlink(this.sessionFile);
    } catch {
      // ignore
    }

    await this.networkStatus.checkConnection();
    this.logger.info('AuthService', 'Logged out of Fern account.');
  }

  public async verifyEmail(token: string) {
    const res = await this.apiClient.auth.verifyEmail(token);
    if (!res.success) throw new Error(res.error || 'Email verification failed');
    if (this.currentSession?.user) {
      this.currentSession.user.isEmailVerified = true;
      await this.persistSession();
    }
    return true;
  }

  public async requestPasswordReset(emailOrUsername: string) {
    const res = await this.apiClient.auth.requestPasswordReset(emailOrUsername);
    if (!res.success) throw new Error(res.error || 'Password reset request failed');
    return true;
  }

  public async confirmPasswordReset(token: string, newPass: string) {
    const res = await this.apiClient.auth.confirmPasswordReset(token, newPass);
    if (!res.success) throw new Error(res.error || 'Password reset confirmation failed');
    return true;
  }

  public async deleteAccount(password: string) {
    const res = await this.apiClient.auth.deleteAccount(password);
    if (!res.success) throw new Error(res.error || 'Account deletion failed');
    await this.logout();
    return true;
  }

  private async persistSession(): Promise<void> {
    if (!this.currentSession) return;
    try {
      await fs.writeFile(this.sessionFile, JSON.stringify(this.currentSession, null, 2), 'utf-8');
    } catch (err: any) {
      this.logger.error('AuthService', `Failed to persist session: ${err.message}`);
    }
  }
}
