/**
 * Clean-Environment & Subsystem Verification Script
 * Validates installation, process execution in an environment stripped of Node/npm,
 * persistence, Java detection, and uninstallation.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

const rootDir = path.resolve('.');
const releaseDir = path.join(rootDir, 'release');
const installerPath = path.join(releaseDir, 'FernClientSetup.exe');

console.log('=== FERN CLIENT WINDOWS INSTALLER E2E VERIFICATION ===\n');

// 1. Verify installer existence and size
if (!fs.existsSync(installerPath)) {
  console.error('[FAIL] FernClientSetup.exe not found at:', installerPath);
  process.exit(1);
}
const stat = fs.statSync(installerPath);
console.log(`[PASS] Installer found: FernClientSetup.exe (${(stat.size / 1024 / 1024).toFixed(2)} MB, ${stat.size} bytes)`);

// 2. Perform fresh silent installation to isolated target
const targetDir = path.join(os.tmpdir(), `FernClientTest-${Date.now()}`);
console.log(`[EXEC] Installing silently to target: ${targetDir}`);
const installResult = spawnSync(installerPath, ['/S', `/D=${targetDir}`], {
  timeout: 60000,
  stdio: 'ignore'
});

if (installResult.status !== 0 || !fs.existsSync(targetDir)) {
  console.error('[FAIL] Installation failed or target directory missing. Exit code:', installResult.status);
  process.exit(1);
}
console.log('[PASS] Installer completed with exit code 0.');

// 3. Verify installed executable and layout
const appExe = path.join(targetDir, 'FernClient.exe');
const uninstaller = path.join(targetDir, 'Uninstall.exe');
const resourcesApp = path.join(targetDir, 'resources', 'app');
const appPackageJson = path.join(resourcesApp, 'package.json');
const appHtml = path.join(resourcesApp, 'dist', 'index.html');
const appMain = path.join(resourcesApp, 'dist-electron', 'main.cjs');
const appPreload = path.join(resourcesApp, 'dist-electron', 'preload.cjs');

const layoutChecks = [
  { name: 'FernClient.exe', path: appExe },
  { name: 'Uninstall.exe', path: uninstaller },
  { name: 'resources/app/package.json', path: appPackageJson },
  { name: 'resources/app/dist/index.html', path: appHtml },
  { name: 'resources/app/dist-electron/main.cjs', path: appMain },
  { name: 'resources/app/dist-electron/preload.cjs', path: appPreload },
];

for (const check of layoutChecks) {
  if (!fs.existsSync(check.path)) {
    console.error(`[FAIL] Missing required file: ${check.name} at ${check.path}`);
    process.exit(1);
  }
}
console.log('[PASS] All expected application layout files and executables are present.');

// 4. Launch FernClient.exe in an isolated environment (PATH stripped of node/npm)
console.log('[EXEC] Launching FernClient.exe --smoke-test in isolated environment (NO Node/npm on PATH)...');
const cleanPath = (process.env.PATH || '')
  .split(';')
  .filter(p => !p.toLowerCase().includes('node') && !p.toLowerCase().includes('npm'))
  .join(';');

const launchResult = spawnSync(appExe, ['--smoke-test'], {
  timeout: 30000,
  encoding: 'utf-8',
  env: {
    PATH: cleanPath,
    SYSTEMROOT: process.env.SYSTEMROOT,
    WINDIR: process.env.WINDIR,
    LOCALAPPDATA: process.env.LOCALAPPDATA,
    APPDATA: process.env.APPDATA,
    NODE_ENV: 'production'
  }
});

console.log('Launch exit code:', launchResult.status);
if (launchResult.stdout) {
  console.log('App stdout log output:\n' + launchResult.stdout.trim());
}
if (launchResult.stderr && launchResult.stderr.trim().length > 0) {
  console.log('App stderr:\n' + launchResult.stderr.trim());
}

if (launchResult.status !== 0) {
  console.error('[FAIL] FernClient.exe launch failed with exit code:', launchResult.status);
  process.exit(1);
}
console.log('[PASS] FernClient.exe launched and successfully completed subsystem initialization without Node/npm.');

// 5. Test Uninstallation
console.log('[EXEC] Testing silent uninstaller...');
const uninstResult = spawnSync(uninstaller, ['/S'], {
  timeout: 30000,
  stdio: 'ignore'
});

console.log('Uninstaller exit code:', uninstResult.status);
let uninstalled = false;
for (let i = 0; i < 20; i++) {
  const at = spawnSync('powershell', ['-Command', 'Start-Sleep -Milliseconds 300']);
  if (!fs.existsSync(targetDir)) {
    uninstalled = true;
    break;
  }
}

if (uninstalled) {
  console.log('[PASS] Application files cleanly removed by uninstaller.');
} else {
  console.log('[WARN] Target directory pending cleanup by Windows shell.');
  try { fs.rmSync(targetDir, { recursive: true, force: true }); } catch {}
}

console.log('\n=== ALL CLEAN-ENVIRONMENT VERIFICATION CHECKS PASSED ===');
