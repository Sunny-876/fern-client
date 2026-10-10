import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { ModMetadataExtractor } from '../launcher/src/mods/metadata-extractor';
import { createZipArchive } from '../launcher/src/utils/zip';

describe('ModMetadataExtractor', () => {
  let tempDir: string;
  let extractor: ModMetadataExtractor;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-modmeta-test-'));
    extractor = new ModMetadataExtractor();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('parses valid fabric.mod.json metadata', async () => {
    const fabricJson = {
      schemaVersion: 1,
      id: 'sodium',
      name: 'Sodium',
      version: '0.5.8+mc1.21',
      description: 'Modern rendering engine for Minecraft',
      depends: {
        fabricloader: '>=0.15.0',
        minecraft: '~1.21',
        'fabric-api': '*',
      },
      recommends: {
        iris: '*',
      },
    };

    const jarBuf = createZipArchive([
      { relativePath: 'fabric.mod.json', content: JSON.stringify(fabricJson) },
      { relativePath: 'net/caffeinemc/sodium/Sodium.class', content: 'fake-class' },
    ]);

    const jarPath = path.join(tempDir, 'sodium-0.5.8.jar');
    await fs.writeFile(jarPath, jarBuf);

    const mod = await extractor.extractFromJar(jarPath);
    expect(mod.id).toBe('sodium');
    expect(mod.name).toBe('Sodium');
    expect(mod.version).toBe('0.5.8+mc1.21');
    expect(mod.summary).toContain('Modern rendering engine');
    expect(mod.loaders).toContain('fabric');
    expect(mod.enabled).toBe(true);
    expect(mod.dependencies?.some((d) => d.id === 'fabric-api')).toBe(true);
    expect(mod.optionalDependencies?.some((d) => d.id === 'iris')).toBe(true);
  });

  it('parses Forge / NeoForge META-INF/mods.toml', async () => {
    const tomlContent = `
modLoader="javafml"
loaderVersion="[47,)"
[[mods]]
modId="jei"
version="15.2.0.27"
displayName="Just Enough Items"
description='''View items and recipes.'''
`;

    const jarBuf = createZipArchive([
      { relativePath: 'META-INF/mods.toml', content: tomlContent },
    ]);

    const jarPath = path.join(tempDir, 'jei-1.20.1-15.2.0.27.jar');
    await fs.writeFile(jarPath, jarBuf);

    const mod = await extractor.extractFromJar(jarPath);
    expect(mod.id).toBe('jei');
    expect(mod.name).toBe('Just Enough Items');
    expect(mod.version).toBe('15.2.0.27');
    expect(mod.loaders).toContain('forge');
  });

  it('gracefully handles missing metadata using file name heuristics', async () => {
    // Normal jar without any json or toml manifest
    const blankJarBuf = createZipArchive([
      { relativePath: 'dummy.txt', content: 'hello' },
    ]);

    const jarPath = path.join(tempDir, 'lithium-fabric-0.12.0.jar');
    await fs.writeFile(jarPath, blankJarBuf);

    const mod = await extractor.extractFromJar(jarPath);
    expect(mod.id).toBe('lithium-fabric');
    expect(mod.version).toBe('0.12.0');
    expect(mod.loaders).toContain('fabric');
    expect(mod.enabled).toBe(true);
  });

  it('detects disabled mods by .disabled extension', async () => {
    const blankJarBuf = createZipArchive([{ relativePath: 'dummy.txt', content: 'hi' }]);
    const jarPath = path.join(tempDir, 'modmenu-11.0.1.jar.disabled');
    await fs.writeFile(jarPath, blankJarBuf);

    const mod = await extractor.extractFromJar(jarPath);
    expect(mod.enabled).toBe(false);
  });
});
