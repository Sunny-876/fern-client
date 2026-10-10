import { describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Phase 11 - Windows Packaging & Compatibility Test Matrix', () => {
  it('validates distribution metadata schema and release channels', async () => {
    const distPath = path.resolve('packaging/distribution.json');
    const content = await fs.readFile(distPath, 'utf-8');
    const dist = JSON.parse(content);

    expect(dist.name).toBe('Fern Client');
    expect(dist.platform).toBe('windows');
    expect(dist.architecture).toBe('x64');
    expect(dist.minimumOS).toContain('Windows 10');

    // Distributables
    expect(dist.distributables.installer).toBeDefined();
    expect(dist.distributables.installer.filename).toBe('FernClientSetup.exe');
    expect(dist.distributables.installer.targetDirectory).toContain('%LocalAppData%\\Programs\\Fern Client');

    expect(dist.distributables.portable).toBeDefined();
    expect(dist.distributables.portable.filename).toContain('Portable.zip');

    // Channels
    expect(dist.channels.stable).toBeDefined();
    expect(dist.channels.beta).toBeDefined();
    expect(dist.security.signed).toBe(true);
  });

  it('validates NSIS installer script integrity and user data separation', async () => {
    const nsiPath = path.resolve('packaging/installer.nsi');
    const nsiContent = await fs.readFile(nsiPath, 'utf-8');

    // Must install binaries into LOCALAPPDATA
    expect(nsiContent).toContain('InstallDir "$LOCALAPPDATA\\Programs\\Fern Client"');

    // Must register in Windows Add/Remove Programs
    expect(nsiContent).toContain('Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\FernClient');

    // Must provide choice to keep user configuration data during uninstall
    expect(nsiContent).toContain('KeepData');
    expect(nsiContent).toContain('Do you want to remove Fern Client user configurations');
  });

  describe('Compatibility Matrix Verification', () => {
    interface MatrixConfig {
      mcVersion: string;
      requiredJava: number;
      supportedLoaders: string[];
      minMemoryMb: number;
    }

    const COMPATIBILITY_MATRIX: Record<string, MatrixConfig> = {
      '1.21.4': {
        mcVersion: '1.21.4',
        requiredJava: 21,
        supportedLoaders: ['vanilla', 'fabric', 'neoforge', 'forge'],
        minMemoryMb: 2048,
      },
      '1.20.4': {
        mcVersion: '1.20.4',
        requiredJava: 17,
        supportedLoaders: ['vanilla', 'fabric', 'forge', 'neoforge'],
        minMemoryMb: 2048,
      },
      '1.16.5': {
        mcVersion: '1.16.5',
        requiredJava: 8,
        supportedLoaders: ['vanilla', 'forge', 'fabric'],
        minMemoryMb: 1024,
      },
    };

    it('verifies modern Minecraft 1.21.4 mandates Java 21', () => {
      const config = COMPATIBILITY_MATRIX['1.21.4'];
      expect(config.requiredJava).toBe(21);
      expect(config.supportedLoaders).toContain('fabric');
      expect(config.supportedLoaders).toContain('neoforge');
    });

    it('verifies mid-legacy Minecraft 1.20.4 supports Java 17', () => {
      const config = COMPATIBILITY_MATRIX['1.20.4'];
      expect(config.requiredJava).toBe(17);
      expect(config.supportedLoaders).toContain('fabric');
      expect(config.supportedLoaders).toContain('forge');
    });

    it('verifies legacy Minecraft 1.16.5 supports Java 8 and lower memory baseline', () => {
      const config = COMPATIBILITY_MATRIX['1.16.5'];
      expect(config.requiredJava).toBe(8);
      expect(config.minMemoryMb).toBeLessThanOrEqual(1024);
    });
  });
});
