import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { readZipEntries } from '../utils/zip';
import { FernError, FernErrorCode } from './errors';

export interface BackupVerificationResult {
  isValid: boolean;
  fileCount: number;
  uncompressedBytes: number;
  sha256Checksum: string;
  containsMetadata: boolean;
  hasSensitiveLeaks: boolean;
  leakedKeysFound: string[];
  entries: Array<{
    name: string;
    size: number;
    crc32: number;
  }>;
  verificationErrors: string[];
}

export class BackupVerifier {
  private sensitiveKeyPatterns = [
    'password',
    'accesstoken',
    'clienttoken',
    'secret',
    'private_key',
    'fern_token',
  ];

  /**
   * Verifies the integrity of a .fernbackup ZIP archive.
   */
  public async verifyBackupArchive(archivePath: string): Promise<BackupVerificationResult> {
    const verificationErrors: string[] = [];
    const leakedKeysFound: string[] = [];
    let uncompressedBytes = 0;
    let containsMetadata = false;

    // 1. Read file and compute hash
    let buffer: Buffer;
    try {
      buffer = await fs.readFile(archivePath);
    } catch (err: any) {
      throw new FernError(FernErrorCode.RESOURCE_NOT_FOUND, `Could not open backup archive: ${err.message}`);
    }

    const sha256Checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    // 2. Parse entries using safe ZIP reader
    let entries;
    try {
      entries = readZipEntries(buffer);
    } catch (err: any) {
      return {
        isValid: false,
        fileCount: 0,
        uncompressedBytes: 0,
        sha256Checksum,
        containsMetadata: false,
        hasSensitiveLeaks: false,
        leakedKeysFound: [],
        entries: [],
        verificationErrors: [`Archive parsing failed: ${err.message}`],
      };
    }

    const entrySummary: BackupVerificationResult['entries'] = [];

    // 3. Inspect entries
    for (const entry of entries) {
      if (entry.isDirectory) continue;

      const rawName = entry.name.replace(/\\/g, '/');

      // Security check: path traversal
      if (rawName.includes('..') || rawName.startsWith('/')) {
        verificationErrors.push(`Security violation: Malicious path traversal entry "${entry.name}"`);
      }

      if (rawName === 'instance-metadata.json') {
        containsMetadata = true;
      }

      uncompressedBytes += entry.uncompressedSize;
      entrySummary.push({
        name: rawName,
        size: entry.uncompressedSize,
        crc32: entry.crc32,
      });

      // 4. Inspect content for plain-text secrets
      try {
        const content = entry.getData().toString('utf-8');
        const lower = content.toLowerCase();

        for (const pattern of this.sensitiveKeyPatterns) {
          // Look for unredacted tokens
          const tokenRegex = new RegExp(`"${pattern}":\\s*"(?!(\\[REDACTED|\\[REDACTED_CREDENTIAL|\\]))[^"]+"`, 'i');
          if (tokenRegex.test(content)) {
            leakedKeysFound.push(`${entry.name}:${pattern}`);
          }
        }
      } catch {
        // Binary entry, skip textual secret scan
      }
    }

    if (!containsMetadata) {
      verificationErrors.push('Backup missing instance-metadata.json root descriptor.');
    }

    const hasSensitiveLeaks = leakedKeysFound.length > 0;
    if (hasSensitiveLeaks) {
      verificationErrors.push(`Security violation: Detected unredacted credentials in backup: ${leakedKeysFound.join(', ')}`);
    }

    return {
      isValid: verificationErrors.length === 0,
      fileCount: entrySummary.length,
      uncompressedBytes,
      sha256Checksum,
      containsMetadata,
      hasSensitiveLeaks,
      leakedKeysFound,
      entries: entrySummary,
      verificationErrors,
    };
  }
}
