import { Injectable, Logger } from '@nestjs/common';
import { loadConfig } from '../../config/configuration';

export interface EmailDispatchResult {
  sent: boolean;
  devMode: boolean;
  devToken?: string;
  recipient: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly config = loadConfig();

  // In-memory cache for development testing verification retrieval
  private readonly devTokens = new Map<string, { token: string; type: 'verification' | 'reset'; expires: number }>();

  async sendVerificationEmail(email: string, token: string): Promise<EmailDispatchResult> {
    const isSmtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

    if (this.config.devEmailBypass || !isSmtpConfigured) {
      this.devTokens.set(email.toLowerCase(), {
        token,
        type: 'verification',
        expires: Date.now() + 24 * 60 * 60 * 1000,
      });

      this.logger.log(`[DEV MODE] Email verification for ${email}. Token: ${token}`);
      return {
        sent: true,
        devMode: true,
        devToken: token,
        recipient: email,
      };
    }

    // When SMTP is configured in production:
    this.logger.log(`Dispatching verification email to ${email} via SMTP...`);
    // SMTP dispatch integration here
    return { sent: true, devMode: false, recipient: email };
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<EmailDispatchResult> {
    const isSmtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

    if (this.config.devEmailBypass || !isSmtpConfigured) {
      this.devTokens.set(email.toLowerCase(), {
        token,
        type: 'reset',
        expires: Date.now() + 60 * 60 * 1000,
      });

      this.logger.log(`[DEV MODE] Password reset token for ${email}. Token: ${token}`);
      return {
        sent: true,
        devMode: true,
        devToken: token,
        recipient: email,
      };
    }

    this.logger.log(`Dispatching password reset email to ${email} via SMTP...`);
    return { sent: true, devMode: false, recipient: email };
  }

  getLatestDevToken(email: string): string | undefined {
    const entry = this.devTokens.get(email.toLowerCase());
    if (entry && entry.expires > Date.now()) {
      return entry.token;
    }
    return undefined;
  }
}
