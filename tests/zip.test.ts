import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import {
  createZipArchive,
  readZipEntries,
  readZipEntryText,
  extractZipSafe,
} from '../launcher/src/utils/zip';

describe('Safe ZIP Archive Utility', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-zip-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('creates and reads standard ZIP entries', () => {
    const archive = createZipArchive([
      { relativePath: 'test.txt', content: 'Hello Fern Client!' },
      { relativePath: 'sub/config.json', content: JSON.stringify({ key: 'value' }) },
    ]);

    expect(archive).toBeDefined();
    expect(archive.length).toBeGreaterThan(0);

    const entries = readZipEntries(archive);
    expect(entries.length).toBe(2);
    expect(entries.map((e) => e.name)).toContain('test.txt');
    expect(entries.map((e) => e.name)).toContain('sub/config.json');

    const text = readZipEntryText(archive, 'test.txt');
    expect(text).toBe('Hello Fern Client!');

    const jsonText = readZipEntryText(archive, 'sub/config.json');
    expect(jsonText).toBe(JSON.stringify({ key: 'value' }));
  });

  it('safely extracts files without escaping target root', async () => {
    const archive = createZipArchive([
      { relativePath: 'mods/fabric-api.jar', content: 'fake-jar-content' },
      { relativePath: 'config/settings.txt', content: 'cfg=1' },
    ]);

    const target = path.join(tempDir, 'extract_target');
    const extracted = await extractZipSafe(archive, target);

    expect(extracted.length).toBe(2);
    const content = await fs.readFile(path.join(target, 'mods', 'fabric-api.jar'), 'utf-8');
    expect(content).toBe('fake-jar-content');
  });

  it('strictly blocks path traversal attacks (e.g. ../../evil.txt)', async () => {
    // Malicious archive with path traversal in entry name
    const evilArchive = createZipArchive([
      { relativePath: '../../evil.txt', content: 'malicious payload' },
    ]);

    const target = path.join(tempDir, 'safe_zone');
    await expect(extractZipSafe(evilArchive, target)).rejects.toThrow(/Security Violation: Path traversal attack detected/);
  });

  it('strictly blocks drive letter path traversal attacks on Windows (e.g. C:evil.txt)', async () => {
    const evilArchive = createZipArchive([
      { relativePath: 'C:evil.txt', content: 'malicious payload' },
    ]);

    const target = path.join(tempDir, 'safe_zone');
    await expect(extractZipSafe(evilArchive, target)).rejects.toThrow(/Security Violation: Path traversal attack detected/);
  });

  it('enforces maximum extraction size limits to defend against zip bombs', async () => {
    const bigArchive = createZipArchive([
      { relativePath: 'big.txt', content: Buffer.alloc(1024 * 1024, 'A') }, // 1 MB
    ]);

    const target = path.join(tempDir, 'bomb_target');
    await expect(
      extractZipSafe(bigArchive, target, { maxTotalBytes: 500 * 1024 }) // Limit 500 KB
    ).rejects.toThrow(/Security Violation: Uncompressed size exceeds maximum safety limit/);
  });
});
