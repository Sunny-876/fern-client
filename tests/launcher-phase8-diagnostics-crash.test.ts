import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DiagnosticsService } from '../launcher/src/core/diagnostics-service';
import { CrashAnalyzer } from '../launcher/src/core/crash-analyzer';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { InstallationManager } from '../launcher/src/installations/installation-manager';
import { JavaManager } from '../launcher/src/java/java-manager';

describe('Phase 8: Diagnostics & Crash Recovery Heuristics', () => {
  let tempDir: string;
  let paths: FernPathManager;
  let logger: FernLogger;
  let instManager: InstallationManager;
  let javaManager: JavaManager;
  let diagService: DiagnosticsService;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fern-diag-phase8-'));
    paths = new FernPathManager(tempDir);
    await paths.initializeDirectories();
    logger = new FernLogger(paths);

    instManager = new InstallationManager(paths, logger);
    await instManager.load();

    javaManager = new JavaManager(paths, logger);
    diagService = new DiagnosticsService(paths, instManager, javaManager);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('generates system diagnostic report with hardware and runtime specs', async () => {
    const report = await diagService.generateReport();

    expect(report.fernVersion).toBeDefined();
    expect(report.os).toBeDefined();
    expect(report.cpu).toBeDefined();
    expect(report.totalMemoryGb).toBeGreaterThan(0);
    expect(report.sanitized).toBe(true);
  });

  it('strictly filters sensitive tokens, passwords, and user profile directories from diagnostic text', () => {
    const rawTelemetry = `
      Error occurred for user C:\\Users\\Administrator\\AppData\\Roaming
      Auth bearer: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secretpayload
      Access Token: token=s3cr3t_m1n3cr4ft_t0k3n_123
      Credentials: password=MySecretPassword123!
    `;

    const sanitized = DiagnosticsService.sanitizeSensitiveText(rawTelemetry);

    expect(sanitized).not.toContain('Administrator');
    expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secretpayload');
    expect(sanitized).not.toContain('s3cr3t_m1n3cr4ft_t0k3n_123');
    expect(sanitized).not.toContain('MySecretPassword123!');

    expect(sanitized).toContain('<USER_DIR>');
    expect(sanitized).toContain('<REDACTED_TOKEN>');
    expect(sanitized).toContain('<REDACTED_PASSWORD>');
  });

  it('identifies Java version incompatibility from crash report', async () => {
    const instanceDir = path.join(tempDir, 'instance-java-crash');
    const crashDir = path.join(instanceDir, 'crash-reports');
    fs.mkdirSync(crashDir, { recursive: true });

    const crashContent = `
      java.lang.UnsupportedClassVersionError: net/minecraft/client/main/Main has been compiled by a more recent version of the Java Runtime (class file version 65.0), this version of the Java Runtime only recognizes class file versions up to 61.0
      at java.lang.ClassLoader.defineClass1(Native Method)
    `;
    fs.writeFileSync(path.join(crashDir, 'crash-2026-10-09_12.00.00-client.txt'), crashContent, 'utf8');

    const analysis = await CrashAnalyzer.analyze(instanceDir, 1);
    expect(analysis).not.toBeNull();
    expect(analysis?.suspectedCause).toContain('Java version incompatible');
    expect(analysis?.suggestedAction).toContain('Java 21');
  });

  it('identifies Out of Memory errors from logs', async () => {
    const instanceDir = path.join(tempDir, 'instance-oom-crash');
    const logsDir = path.join(instanceDir, 'logs');
    fs.mkdirSync(logsDir, { recursive: true });

    const logContent = `
      [12:00:00] [main/INFO]: Starting Minecraft...
      [12:00:05] [main/ERROR]: java.lang.OutOfMemoryError: Java heap space
      at java.util.Arrays.copyOf(Arrays.java:3210)
    `;
    fs.writeFileSync(path.join(logsDir, 'latest.log'), logContent, 'utf8');

    const analysis = await CrashAnalyzer.analyze(instanceDir, 1);
    expect(analysis).not.toBeNull();
    expect(analysis?.suspectedCause).toContain('Out of memory');
    expect(analysis?.suggestedAction).toContain('Increase allocated RAM');
  });

  it('identifies Fabric mod incompatibilities from crash logs', async () => {
    const instanceDir = path.join(tempDir, 'instance-mod-crash');
    const logsDir = path.join(instanceDir, 'logs');
    fs.mkdirSync(logsDir, { recursive: true });

    const logContent = `
      [main/ERROR] (FabricLoader) Mod resolution failed
      net.fabricmc.loader.impl.FormattedException: Some of your mods are incompatible with the game or each other!
      - Mod 'iris' (1.7.0) requires 'sodium' (>=0.5.8), but only 'sodium' (0.5.0) is present!
    `;
    fs.writeFileSync(path.join(logsDir, 'latest.log'), logContent, 'utf8');

    const analysis = await CrashAnalyzer.analyze(instanceDir, 1);
    expect(analysis).not.toBeNull();
    expect(analysis?.suspectedCause).toContain('Mod loader resolution failed');
    expect(analysis?.suggestedAction).toContain('Open Mods manager');
  });
});
