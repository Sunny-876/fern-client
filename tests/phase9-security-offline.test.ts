import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CosmeticRenderer } from '../client/src/cosmetics/CosmeticRenderer';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { LocalSocialProvider } from '../launcher/src/social/api/local-social-provider';

describe('Phase 9: Security, Path Sanitization & Offline Resilience', () => {
  let tempDir: string;
  let paths: FernPathManager;
  let logger: FernLogger;
  let provider: LocalSocialProvider;
  let renderer: CosmeticRenderer;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fern-security-phase9-'));
    paths = new FernPathManager(tempDir);
    await paths.initializeDirectories();
    logger = new FernLogger(paths);
    provider = new LocalSocialProvider(paths, logger);
    await provider.initialize();
    renderer = new CosmeticRenderer();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('rejects path traversal sequences in cosmetic asset paths', () => {
    expect(renderer.sanitizeAssetPath('../../etc/passwd')).toBeNull();
    expect(renderer.sanitizeAssetPath('..\\..\\Windows\\System32\\cmd.exe')).toBeNull();
    expect(renderer.sanitizeAssetPath('assets/cosmetics/../../../secrets.txt')).toBeNull();
    expect(renderer.sanitizeAssetPath('assets/cosmetics/cape.png\0.exe')).toBeNull();
  });

  it('rejects absolute Windows drive letters and dangerous protocols in asset paths', () => {
    expect(renderer.sanitizeAssetPath('C:\\Windows\\System32\\calc.exe')).toBeNull();
    expect(renderer.sanitizeAssetPath('D:/Sensitive/Files/token.json')).toBeNull();
    expect(renderer.sanitizeAssetPath('javascript:alert(1)')).toBeNull();
    expect(renderer.sanitizeAssetPath('file:///etc/hosts')).toBeNull();
    expect(renderer.sanitizeAssetPath('data:text/html;base64,PHNjcmlwdD4=')).toBeNull();
  });

  it('accepts legitimate relative asset paths and normalizes slashes', () => {
    expect(renderer.sanitizeAssetPath('assets/cosmetics/capes/emerald.png')).toBe(
      'assets/cosmetics/capes/emerald.png'
    );
    expect(renderer.sanitizeAssetPath('assets\\cosmetics\\hats\\beanie.png')).toBe(
      'assets/cosmetics/hats/beanie.png'
    );
  });

  it('fails safely when equipping a cosmetic with a malicious traversal path', () => {
    const maliciousCosmetic = {
      id: 'exploit_cape',
      name: 'Exploit Cape',
      category: 'cape' as const,
      rarity: 'common' as const,
      description: 'Attempted exploit',
      assetPath: '../../../../Windows/win.ini',
      previewUrl: 'preview.png',
      modelType: 'both' as const,
    };

    const equipped = renderer.equip('cape', maliciousCosmetic);
    expect(equipped).toBe(false);
    expect(renderer.getEquipped('cape')).toBeUndefined();
  });

  it('operates reliably offline without external network dependency', async () => {
    // Local provider reports online state locally
    const isOnline = await provider.isOnline();
    expect(isOnline).toBe(true);

    // Profile and friends load cleanly with zero network calls
    const profile = await provider.profile.getProfile();
    expect(profile.success).toBe(true);
    expect(profile.data?.id).toBeDefined();

    const friends = await provider.friends.getFriends();
    expect(friends.success).toBe(true);
    expect(Array.isArray(friends.data)).toBe(true);
  });

  it('strictly avoids storing Minecraft authentication passwords or tokens in social files', async () => {
    const profileFile = path.join(paths.getSocialDir(), 'profile.json');
    expect(fs.existsSync(profileFile)).toBe(true);

    const raw = fs.readFileSync(profileFile, 'utf-8');
    const parsed = JSON.parse(raw);

    // Ensure no auth secrets leak
    expect(parsed.accessToken).toBeUndefined();
    expect(parsed.refreshToken).toBeUndefined();
    expect(parsed.password).toBeUndefined();
    expect(parsed.token).toBeUndefined();
    expect(parsed.microsoftToken).toBeUndefined();
  });
});
