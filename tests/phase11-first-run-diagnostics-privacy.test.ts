import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { DiagnosticsService } from '../launcher/src/core/diagnostics-service';
import { SettingsManager } from '../launcher/src/settings/settings-manager';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { InstallationManager } from '../launcher/src/installations/installation-manager';
import { JavaManager } from '../launcher/src/java/java-manager';
import { FeedbackService } from '../backend/src/modules/feedback/feedback.service';

describe('Phase 11 - First-Run, Diagnostics Redaction & Feedback', () => {
  let tempDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let settingsManager: SettingsManager;
  let installationManager: InstallationManager;
  let javaManager: JavaManager;
  let diagnosticsService: DiagnosticsService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-diag-test-'));
    pathManager = new FernPathManager(tempDir);
    await pathManager.initializeDirectories();
    logger = new FernLogger(pathManager);
    settingsManager = new SettingsManager(pathManager, logger);
    installationManager = new InstallationManager(pathManager, logger);
    javaManager = new JavaManager(pathManager, logger);
    diagnosticsService = new DiagnosticsService(pathManager, installationManager, javaManager);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe('First-Run Experience State', () => {
    it('initializes default settings with firstRunCompleted = false', async () => {
      const settings = await settingsManager.load();
      expect(settings.general.firstRunCompleted).toBe(false);

      // Complete first-run wizard
      const updated = await settingsManager.updateSettings({
        general: {
          ...settings.general,
          firstRunCompleted: true,
        },
      });
      expect(updated.general.firstRunCompleted).toBe(true);

      // Reloading from disk preserves completed state
      const reloaded = await settingsManager.load();
      expect(reloaded.general.firstRunCompleted).toBe(true);
    });
  });

  describe('Diagnostic Privacy & Redaction', () => {
    it('sanitizes authentication tokens, passwords, and user usernames from text', () => {
      const rawText =
        'Error occurred for user C:\\Users\\Administrator\\AppData\\Roaming\\Fern Client\n' +
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret\n' +
        '--accessToken ms_token_abc123456789xyz\n' +
        'Failed password "superSecretPassword123" attempt';

      const sanitized = DiagnosticsService.sanitizeSensitiveText(rawText);

      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret');
      expect(sanitized).not.toContain('ms_token_abc123456789xyz');
      expect(sanitized).not.toContain('superSecretPassword123');
      expect(sanitized).not.toContain('C:\\Users\\Administrator');

      expect(sanitized).toContain('Bearer <REDACTED_TOKEN>');
      expect(sanitized).toContain('--accessToken <REDACTED_TOKEN>');
      expect(sanitized).toContain('<USER_DIR>');
    });

    it('generates a hardware and system diagnostic report without private credentials', async () => {
      const report = await diagnosticsService.generateReport();

      expect(report.sanitized).toBe(true);
      expect(report.fernVersion).toBeDefined();
      expect(report.os).toBeDefined();
      expect(report.system.cpuModel).toBeDefined();
      expect(report.privacyNotice).toContain('Zero passwords, authentication tokens');
    });

    it('exports sanitized diagnostic report to a local JSON file', async () => {
      const targetPath = path.join(tempDir, 'custom-diagnostics.json');
      const exportedPath = await diagnosticsService.exportReportToFile(targetPath);

      expect(exportedPath).toBe(targetPath);
      const fileData = await fs.readFile(targetPath, 'utf-8');
      const parsed = JSON.parse(fileData);
      expect(parsed.sanitized).toBe(true);
      expect(parsed.system).toBeDefined();
    });
  });

  describe('Feedback Processing Service', () => {
    it('processes bug reports and returns reference ID with audit logging', async () => {
      const mockPrisma = {
        auditEvent: {
          create: async () => {},
        },
      } as any;
      const mockAudit = {
        logEvent: async () => {},
      } as any;

      const feedbackService = new FeedbackService(mockPrisma, mockAudit);
      const result = await feedbackService.submitFeedback(
        {
          category: 'bug',
          title: 'HUD Element Drift',
          description: 'FPS counter drifted 2px when resizing window',
          clientVersion: '1.0.0-beta.1',
          channel: 'beta',
          diagnosticReport: { os: 'Windows 11' },
        },
        'usr_test_123',
        '127.0.0.1'
      );

      expect(result.success).toBe(true);
      expect(result.referenceId).toMatch(/^FB-[A-Z0-9]{8}$/);
      expect(result.message).toContain('Feedback submitted successfully');
    });
  });
});
