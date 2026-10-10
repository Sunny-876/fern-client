import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { UserProfileValidator, FernUserProfile, UpdateUserProfileDTO } from '../shared/models/user-profile';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { LocalSocialProvider } from '../launcher/src/social/api/local-social-provider';

describe('Phase 9: Fern User Profile System', () => {
  let tempDir: string;
  let paths: FernPathManager;
  let logger: FernLogger;
  let provider: LocalSocialProvider;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fern-profile-phase9-'));
    paths = new FernPathManager(tempDir);
    await paths.initializeDirectories();
    logger = new FernLogger(paths);
    provider = new LocalSocialProvider(paths, logger);
    await provider.initialize();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('validates usernames according to length and character rules', () => {
    // Valid usernames
    expect(UserProfileValidator.validateUsername('FernPlayer').valid).toBe(true);
    expect(UserProfileValidator.validateUsername('Player_123').valid).toBe(true);
    expect(UserProfileValidator.validateUsername('abc').valid).toBe(true);

    // Invalid usernames
    expect(UserProfileValidator.validateUsername('').valid).toBe(false);
    expect(UserProfileValidator.validateUsername('ab').valid).toBe(false); // Too short (< 3)
    expect(UserProfileValidator.validateUsername('a'.repeat(21)).valid).toBe(false); // Too long (> 20)
    expect(UserProfileValidator.validateUsername('Player!@#').valid).toBe(false); // Special chars
    expect(UserProfileValidator.validateUsername('Player with spaces').valid).toBe(false);
  });

  it('validates display names and bios correctly', () => {
    expect(UserProfileValidator.validateDisplayName('Fern Master').valid).toBe(true);
    expect(UserProfileValidator.validateDisplayName('A').valid).toBe(false); // Min 2
    expect(UserProfileValidator.validateDisplayName('A'.repeat(33)).valid).toBe(false); // Max 32

    expect(UserProfileValidator.validateBio('Just playing Minecraft!').valid).toBe(true);
    expect(UserProfileValidator.validateBio('A'.repeat(251)).valid).toBe(false); // Max 250
  });

  it('loads default profile with valid initial state', async () => {
    const res = await provider.profile.getProfile();
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();

    const profile = res.data!;
    expect(profile.id).toBe('fern_usr_default');
    expect(profile.username).toBe('FernPlayer');
    expect(profile.displayName).toBe('Fern Player');
    expect(profile.badges).toContain('early_supporter');
    expect(profile.badges).toContain('beta_tester');
  });

  it('updates display name and bio and persists changes to disk', async () => {
    const updateDTO: UpdateUserProfileDTO = {
      displayName: 'Captain Fern',
      bio: 'High FPS enthusiast and builder.',
      favoriteMinecraftVersion: '1.21.4',
    };

    const updateRes = await provider.profile.updateProfile(updateDTO);
    expect(updateRes.success).toBe(true);
    expect(updateRes.data?.displayName).toBe('Captain Fern');
    expect(updateRes.data?.bio).toBe('High FPS enthusiast and builder.');

    // Verify disk persistence
    const profileFile = path.join(paths.getSocialDir(), 'profile.json');
    expect(fs.existsSync(profileFile)).toBe(true);

    const saved = JSON.parse(fs.readFileSync(profileFile, 'utf-8')) as FernUserProfile;
    expect(saved.displayName).toBe('Captain Fern');
    expect(saved.favoriteMinecraftVersion).toBe('1.21.4');
  });

  it('rejects invalid profile update payload', async () => {
    const invalidDTO: UpdateUserProfileDTO = {
      displayName: 'X', // Too short (< 2)
    };

    const res = await provider.profile.updateProfile(invalidDTO);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
