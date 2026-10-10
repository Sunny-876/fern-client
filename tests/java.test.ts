import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { JavaManager } from '../launcher/src/java/java-manager';

describe('JavaManager', () => {
  let tempDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let javaManager: JavaManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-java-test-'));
    pathManager = new FernPathManager(tempDir);
    logger = new FernLogger(pathManager);
    javaManager = new JavaManager(pathManager, logger);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('determines Minecraft version Java compatibility correctly', () => {
    // Minecraft 1.21.x requires Java 21+
    const mc21Check = javaManager.isCompatible(21, '1.21.4');
    expect(mc21Check.compatible).toBe(true);
    expect(mc21Check.requiredVersion).toBe(21);

    const mc21WithJava17 = javaManager.isCompatible(17, '1.21.4');
    expect(mc21WithJava17.compatible).toBe(false);

    // Minecraft 1.20.1 requires Java 17+
    const mc20Check = javaManager.isCompatible(17, '1.20.1');
    expect(mc20Check.compatible).toBe(true);
    expect(mc20Check.requiredVersion).toBe(17);

    // Minecraft 1.16.5 requires Java 8+
    const mc16Check = javaManager.isCompatible(8, '1.16.5');
    expect(mc16Check.compatible).toBe(true);
    expect(mc16Check.requiredVersion).toBe(8);
  });

  it('probes non-existent executable gracefully without crashing', async () => {
    const invalid = await javaManager.probeJavaExecutable(path.join(tempDir, 'fake-java.exe'));
    expect(invalid).toBeNull();
  });

  it('detects runtimes on system returning a valid structure', async () => {
    const result = await javaManager.detectRuntimes();
    expect(result).toBeDefined();
    expect(Array.isArray(result.runtimes)).toBe(true);
  });
});
