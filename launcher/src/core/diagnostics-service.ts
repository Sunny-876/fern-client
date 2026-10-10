import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { BRANDING } from '../../../shared/constants/branding';
import { FernPathManager } from './paths';
import { InstallationManager } from '../installations/installation-manager';
import { JavaManager } from '../java/java-manager';

export interface DiagnosticData {
  fernVersion: string;
  timestamp: string;
  os: string;
  cpu: string;
  totalMemoryGb: number;
  sanitized: boolean;
  system: {
    platform: string;
    osRelease: string;
    arch: string;
    cpuModel: string;
    cpuCores: number;
    totalMemoryMb: number;
    freeMemoryMb: number;
  };
  java: {
    runtimesCount: number;
    defaultRuntime?: string;
    detectedVersions: number[];
  };
  minecraft: {
    activeInstallation?: {
      name: string;
      version: string;
      loader: string;
      memoryAllocation: { minMb: number; maxMb: number };
    };
    totalInstallations: number;
  };
  privacyNotice: string;
}

export class DiagnosticsService {
  constructor(
    private pathManager: FernPathManager,
    private installationManager: InstallationManager,
    private javaManager: JavaManager
  ) {}

  public async generateReport(installationId?: string): Promise<DiagnosticData> {
    const inst = installationId
      ? this.installationManager.getInstallation(installationId)
      : this.installationManager.getActiveInstallation();

    const runtimes = this.javaManager.getRuntimes();
    const defaultJava = this.javaManager.getDefaultRuntime();

    const report: DiagnosticData = {
      fernVersion: BRANDING.VERSION,
      timestamp: new Date().toISOString(),
      os: `${os.platform()} ${os.release()} (${os.arch()})`,
      cpu: os.cpus()[0]?.model || 'Generic Processor',
      totalMemoryGb: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
      sanitized: true,
      system: {
        platform: os.platform(),
        osRelease: os.release(),
        arch: os.arch(),
        cpuModel: os.cpus()[0]?.model || 'Generic Processor',
        cpuCores: os.cpus().length,
        totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
        freeMemoryMb: Math.round(os.freemem() / 1024 / 1024),
      },
      java: {
        runtimesCount: runtimes.length,
        defaultRuntime: defaultJava ? `${defaultJava.name} (${defaultJava.majorVersion})` : undefined,
        detectedVersions: runtimes.map((r) => r.majorVersion),
      },
      minecraft: {
        activeInstallation: inst
          ? {
              name: inst.name,
              version: inst.minecraftVersion,
              loader: inst.loader,
              memoryAllocation: inst.memoryAllocation,
            }
          : undefined,
        totalInstallations: this.installationManager.getInstallations().length,
      },
      privacyNotice:
        'This diagnostic report contains only hardware and system metrics. Zero passwords, authentication tokens, world contents, personal chat, or personal files are included.',
    };

    return report;
  }

  /**
   * Cleans text/logs of sensitive tokens, passwords, and user usernames before export.
   */
  public static sanitizeSensitiveText(text: string): string {
    let sanitized = text;

    // Redact Bearer / OAuth tokens
    sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9_\-.]+/gi, 'Bearer <REDACTED_TOKEN>');

    // Redact Minecraft CLI argument tokens e.g. --accessToken <token>
    sanitized = sanitized.replace(/(--accessToken\s+)[^\s]+/gi, '$1<REDACTED_TOKEN>');

    // Redact password=...
    sanitized = sanitized.replace(/(password=)[^\s,&"'\r\n]+/gi, '$1<REDACTED_PASSWORD>');

    // Redact key=value tokens e.g. accessToken=... or token=...
    sanitized = sanitized.replace(/(?<!-)(?:accessToken|refreshToken|clientToken|secret|fern_token|token)=([^\s,&"'\r\n]+)/gi, (m) => {
      const key = m.split('=')[0];
      return `${key}=<REDACTED_TOKEN>`;
    });

    // Redact quoted passwords and secrets e.g. password "..."
    sanitized = sanitized.replace(/(password["':\s]+)"[^"]+"/gi, '$1"<REDACTED_PASSWORD>"');

    // Redact user paths e.g. C:\Users\<Username>\ or /home/<Username>/
    sanitized = sanitized.replace(/[a-zA-Z]:\\Users\\[^\r\n\\/\s]+/gi, '<USER_DIR>');
    sanitized = sanitized.replace(/\/home\/[^\r\n\\/\s]+/gi, '<USER_DIR>');

    const user = process.env.USERNAME || process.env.USER;
    if (user && user.length > 2) {
      const userRegex = new RegExp(`Users[\\\\/]${user}`, 'gi');
      sanitized = sanitized.replace(userRegex, 'Users/<USER_DIR>');
    }

    // Redact IPv4 addresses in server connections (preserve 127.0.0.1 and 0.0.0.0)
    sanitized = sanitized.replace(
      /\b(?!127\.0\.0\.1\b)(?!0\.0\.0\.0\b)(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
      '[REDACTED_IP]'
    );

    return sanitized;
  }

  /**
   * Exports sanitized diagnostic report directly to a local JSON file.
   */
  public async exportReportToFile(destinationPath?: string, installationId?: string): Promise<string> {
    const report = await this.generateReport(installationId);
    const logsDir = this.pathManager.getLogsDir();
    const finalPath = destinationPath || path.join(logsDir, `fern-diagnostics-${Date.now()}.json`);
    await fs.mkdir(path.dirname(finalPath), { recursive: true });
    await fs.writeFile(finalPath, JSON.stringify(report, null, 2), 'utf-8');
    return finalPath;
  }
}

