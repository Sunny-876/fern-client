import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { spawnSync } from 'child_process';
import { AzureTrustedSigningManager } from '../scripts/sign-and-verify';
import { ReleasePipeline } from '../scripts/release-pipeline';

describe('Phase 25 — Windows Installer & Code Signing Pipeline', () => {
  const rootDir = path.resolve('.');
  const releaseDir = path.join(rootDir, 'release');
  const installerPath = path.join(releaseDir, 'FernClientSetup.exe');
  const portablePath = path.join(releaseDir, 'FernClient-1.0.0-Portable.zip');
  let testInstallDir: string;

  beforeEach(() => {
    testInstallDir = path.join(
      os.tmpdir(),
      `fern-p25-test-${Date.now()}-${Math.floor(Math.random() * 10000)}`
    );
  });

  afterEach(() => {
    if (fs.existsSync(testInstallDir)) {
      try {
        fs.rmSync(testInstallDir, { recursive: true, force: true });
      } catch {}
    }
  });

  describe('1. Production Artifacts & Metadata Integrity', () => {
    it('verifies that FernClientSetup.exe exists and meets size expectations', () => {
      expect(fs.existsSync(installerPath)).toBe(true);
      const stat = fs.statSync(installerPath);
      expect(stat.size).toBeGreaterThan(200000); // ~292 KB
    });

    it('verifies portable release zip is preserved alongside installer', () => {
      expect(fs.existsSync(portablePath)).toBe(true);
      const stat = fs.statSync(portablePath);
      expect(stat.size).toBeGreaterThan(200000);
      const buffer = fs.readFileSync(portablePath);
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      expect(hash).toBe('aca5ae20adbba76beefea614181f4014e3962f3a76265ab3a14c59efe1e72128');
    });

    it('verifies SHA256SUMS.txt contains valid hashes for both artifacts', () => {
      const sumsPath = path.join(releaseDir, 'SHA256SUMS.txt');
      expect(fs.existsSync(sumsPath)).toBe(true);
      const content = fs.readFileSync(sumsPath, 'utf-8');

      expect(content).toContain('FernClientSetup.exe');
      expect(content).toContain('FernClient-1.0.0-Portable.zip');

      const installerBytes = fs.readFileSync(installerPath);
      const installerHash = crypto.createHash('sha256').update(installerBytes).digest('hex');
      expect(content).toContain(installerHash);
    });

    it('verifies distribution.json contains installer configuration and registry targets', () => {
      const distJsonPath = path.join(rootDir, 'packaging', 'distribution.json');
      expect(fs.existsSync(distJsonPath)).toBe(true);
      const dist = JSON.parse(fs.readFileSync(distJsonPath, 'utf-8'));

      expect(dist.name).toBe('Fern Client');
      expect(dist.distributables.installer).toBeDefined();
      expect(dist.distributables.installer.filename).toBe('FernClientSetup.exe');
      expect(dist.distributables.installer.targetDirectory).toBe('%LocalAppData%\\Programs\\Fern Client');
      expect(dist.distributables.installer.uninstallRegistryKey).toBe(
        'Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\FernClient'
      );
      expect(dist.distributables.installer.createShortcuts).toBe(true);
    });
  });

  describe('2. Azure Trusted Signing & Authenticode Audit', () => {
    it('accurately identifies missing Azure credentials without false positives', () => {
      const manager = new AzureTrustedSigningManager();
      const creds = manager.checkCredentials();
      const required = manager.getRequiredEnvVars();

      expect(required).toContain('AZURE_TENANT_ID');
      expect(required).toContain('AZURE_CLIENT_ID');
      expect(required).toContain('AZURE_TRUSTED_SIGNING_ACCOUNT');
      expect(required).toContain('AZURE_CERT_PROFILE_NAME');

      // Local test environment does not have Azure secrets
      expect(creds.isConfigured).toBe(false);
      expect(creds.missing.length).toBeGreaterThan(0);
    });

    it('verifies Authenticode status using PowerShell and reports truthful unsigned status', () => {
      const manager = new AzureTrustedSigningManager();
      const status = manager.verifyAuthenticodeSignature(installerPath);

      expect(status.fileName).toBe('FernClientSetup.exe');
      expect(status.status).toBe('NotSigned');
      expect(status.isSigned).toBe(false);
      expect(status.sha256.length).toBe(64);
    });

    it('generates structured signing audit report with truthful fallback metadata', () => {
      const manager = new AzureTrustedSigningManager();
      const report = manager.signArtifacts([installerPath]);

      expect(report.azureCredentialsConfigured).toBe(false);
      expect(report.signingSucceeded).toBe(false);
      expect(report.results.length).toBe(1);
      expect(report.results[0].fileName).toBe('FernClientSetup.exe');
      expect(report.results[0].status).toBe('NotSigned');

      const auditPath = path.join(releaseDir, 'SIGNING_AUDIT_REPORT.json');
      expect(fs.existsSync(auditPath)).toBe(true);
      const savedReport = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));
      expect(savedReport.azureCredentialsConfigured).toBe(false);
    });
  });

  describe('3. Fresh Silent Installation Execution', () => {
    it('executes silent installation into clean directory and creates required file layout', () => {
      if (process.platform !== 'win32') return;

      const res = spawnSync(installerPath, ['/S', `/D=${testInstallDir}`], {
        stdio: 'ignore',
        timeout: 45000,
      });

      expect(res.status).toBe(0);
      expect(fs.existsSync(testInstallDir)).toBe(true);

      const appExe = path.join(testInstallDir, 'FernClient.exe');
      const distDir = path.join(testInstallDir, 'dist');
      const distElectronDir = path.join(testInstallDir, 'dist-electron');
      const batLauncher = path.join(testInstallDir, 'FernClient.bat');
      const uninstaller = path.join(testInstallDir, 'Uninstall.exe');

      expect(fs.existsSync(appExe)).toBe(true);
      expect(fs.existsSync(distDir)).toBe(true);
      expect(fs.existsSync(path.join(distDir, 'index.html'))).toBe(true);
      expect(fs.existsSync(distElectronDir)).toBe(true);
      expect(fs.existsSync(path.join(distElectronDir, 'main.cjs'))).toBe(true);
      expect(fs.existsSync(batLauncher)).toBe(true);
      expect(fs.existsSync(uninstaller)).toBe(true);
    }, 60000);

    it('validates that installed FernClient.bat targets dist-electron\\main.cjs correctly', () => {
      if (process.platform !== 'win32') return;

      spawnSync(installerPath, ['/S', `/D=${testInstallDir}`], {
        stdio: 'ignore',
        timeout: 45000,
      });

      const batContent = fs.readFileSync(path.join(testInstallDir, 'FernClient.bat'), 'utf-8');
      expect(batContent).toContain('dist-electron\\main.cjs');
    }, 60000);
  });

  describe('4. Upgrade Simulation & User Data Preservation', () => {
    it('preserves user settings and configuration across installer upgrades', () => {
      if (process.platform !== 'win32') return;

      // 1. Initial Installation
      const initialInstall = spawnSync(installerPath, ['/S', `/D=${testInstallDir}`], {
        stdio: 'ignore',
        timeout: 45000,
      });
      expect(initialInstall.status).toBe(0);

      // 2. Create simulated user data file in installation directory and app data
      const customConfigPath = path.join(testInstallDir, 'user-profile.json');
      fs.writeFileSync(
        customConfigPath,
        JSON.stringify({ username: 'FernTester', lastServer: 'play.fernclient.net' })
      );

      // 3. Perform Upgrade (Re-run installer over same target directory)
      const upgradeRes = spawnSync(installerPath, ['/S', `/D=${testInstallDir}`], {
        stdio: 'ignore',
        timeout: 45000,
      });
      expect(upgradeRes.status).toBe(0);

      // 4. Verify binaries refreshed and custom user files survived
      expect(fs.existsSync(path.join(testInstallDir, 'dist', 'index.html'))).toBe(true);
      expect(fs.existsSync(customConfigPath)).toBe(true);
      const savedUser = JSON.parse(fs.readFileSync(customConfigPath, 'utf-8'));
      expect(savedUser.username).toBe('FernTester');
    }, 90000);
  });

  describe('5. Silent Uninstallation & Clean Removal', () => {
    it('executes silent uninstallation and completely removes installed application binaries', async () => {
      if (process.platform !== 'win32') return;

      // 1. Install
      spawnSync(installerPath, ['/S', `/D=${testInstallDir}`], {
        stdio: 'ignore',
        timeout: 45000,
      });
      expect(fs.existsSync(testInstallDir)).toBe(true);

      const uninstaller = path.join(testInstallDir, 'Uninstall.exe');
      expect(fs.existsSync(uninstaller)).toBe(true);

      // 2. Run silent uninstaller
      const uninstRes = spawnSync(uninstaller, ['/S'], {
        stdio: 'ignore',
        timeout: 25000,
      });
      expect(uninstRes.status).toBe(0);

      // Allow brief moment for NSIS uninstaller process to delete its host directory
      let cleaned = false;
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (!fs.existsSync(testInstallDir)) {
          cleaned = true;
          break;
        }
      }
      expect(cleaned).toBe(true);
    }, 60000);
  });

  describe('6. Portable vs Installed Mode Coexistence', () => {
    it('verifies portable distribution isolates data to ./data while installer uses standard Windows paths', () => {
      // Check packaging distribution definitions
      const distJson = JSON.parse(
        fs.readFileSync(path.join(rootDir, 'packaging', 'distribution.json'), 'utf-8')
      );

      expect(distJson.distributables.installer.targetDirectory).toContain('%LocalAppData%');
      expect(distJson.distributables.portable.limitations).toContain(
        'Data stored locally in ./data directory relative to executable'
      );
    });

    it('verifies release pipeline generates complete release manifest with both distributions', () => {
      const pipeline = new ReleasePipeline(rootDir);
      const manifest = pipeline.buildReleaseManifest('1.0.0', releaseDir);

      expect(manifest.version).toBe('1.0.0');
      expect(manifest.channel).toBe('stable');
      expect(manifest.artifacts.some((a) => a.name === 'FernClientSetup.exe')).toBe(true);
      expect(manifest.artifacts.some((a) => a.name === 'FernClient-1.0.0-Portable.zip')).toBe(true);
    });
  });
});
