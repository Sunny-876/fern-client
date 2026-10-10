import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { InstallationManager } from '../launcher/src/installations/installation-manager';
import { BackupVerifier } from '../launcher/src/core/backup-verifier';
import { verifyDocumentationLinks } from '../scripts/verify-documentation-links';
import { createZipArchive } from '../launcher/src/utils/zip';

describe('Phase 15: Backup Verification & Documentation Validation', () => {
  let tmpDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let instManager: InstallationManager;
  let verifier: BackupVerifier;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-p15-backup-test-'));
    pathManager = new FernPathManager(tmpDir);
    logger = new FernLogger(pathManager);
    instManager = new InstallationManager(pathManager, logger);
    verifier = new BackupVerifier();

    await instManager.load();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('Backup Archive Verification & Security Integrity', () => {
    it('verifies and certifies a genuine configuration backup archive', async () => {
      const inst = await instManager.createInstallation({
        name: 'Certified Instance',
        minecraftVersion: '1.21.4',
      });

      await fs.writeFile(path.join(inst.gameDirectory, 'options.txt'), 'fov:70\n');
      const backup = await instManager.backupInstallationConfig(inst.id);

      const report = await verifier.verifyBackupArchive(backup.backupPath);

      expect(report.isValid).toBe(true);
      expect(report.containsMetadata).toBe(true);
      expect(report.hasSensitiveLeaks).toBe(false);
      expect(report.sha256Checksum).toBeDefined();
      expect(report.fileCount).toBeGreaterThanOrEqual(2);
      expect(report.verificationErrors.length).toBe(0);
    });

    it('detects and flags archives containing leaked credentials', async () => {
      const dirtyZipBuffer = createZipArchive([
        { relativePath: 'instance-metadata.json', content: '{"name":"Leaky"}' },
        { relativePath: 'config-data/leaked.json', content: '{"accessToken": "super_secret_token_unredacted"}' },
      ]);

      const dirtyPath = path.join(tmpDir, 'dirty.fernbackup');
      await fs.writeFile(dirtyPath, dirtyZipBuffer);

      const report = await verifier.verifyBackupArchive(dirtyPath);
      expect(report.isValid).toBe(false);
      expect(report.hasSensitiveLeaks).toBe(true);
      expect(report.leakedKeysFound.length).toBeGreaterThan(0);
    });

    it('detects and blocks archives with malicious path traversal entries', async () => {
      // Create zip with relative traversal entry
      const maliciousZipBuffer = createZipArchive([
        { relativePath: 'instance-metadata.json', content: '{"name":"Safe"}' },
        { relativePath: 'config-data/../../etc/passwd', content: 'forbidden' },
      ]);

      const maliciousPath = path.join(tmpDir, 'malicious.fernbackup');
      await fs.writeFile(maliciousPath, maliciousZipBuffer);

      const report = await verifier.verifyBackupArchive(maliciousPath);
      expect(report.isValid).toBe(false);
      expect(report.verificationErrors.some((e) => e.includes('path traversal'))).toBe(true);
    });
  });

  describe('Documentation Integrity & Internal Reference Verification', () => {
    it('verifies that all internal links in docs resolve cleanly', () => {
      const docsDir = path.resolve('docs');
      const docResult = verifyDocumentationLinks(docsDir);

      expect(docResult.totalDocsScanned).toBeGreaterThan(5);
      expect(docResult.brokenLinks.length).toBe(0);
      expect(docResult.valid).toBe(true);
    });
  });
});
