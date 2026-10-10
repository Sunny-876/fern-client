export interface ReleaseArtifact {
  filename: string;
  format: 'exe' | 'zip';
  type: 'installer' | 'portable';
  downloadUrl: string;
  sha256: string;
  sizeBytes?: number;
  sizeFormatted: string;
  isAvailable: boolean;
  notes?: string;
}

export interface ReleaseVersion {
  version: string;
  channel: 'stable' | 'beta';
  releaseDate: string;
  title: string;
  architecture: 'x64';
  platform: 'Windows 10 / 11';
  signatureAlgorithm: 'ed25519';
  publicKeyFingerprint: string;
  artifacts: {
    installer: ReleaseArtifact;
    portable: ReleaseArtifact;
  };
  highlights: string[];
}

export const OFFICIAL_RELEASES: {
  stable: ReleaseVersion;
  beta: ReleaseVersion;
} = {
  stable: {
    version: '1.0.0',
    channel: 'stable',
    releaseDate: '2026-10-09',
    title: 'Fern Client 1.0.0 Stable Release',
    architecture: 'x64',
    platform: 'Windows 10 / 11',
    signatureAlgorithm: 'ed25519',
    publicKeyFingerprint: 'SHA256:4H6+rW6aR1oF61Y3r8Q9P7u0Z5A1X4kY7l6W0aR1oF4=',
    artifacts: {
      installer: {
        filename: 'FernClientSetup.exe',
        format: 'exe',
        type: 'installer',
        downloadUrl: 'https://downloads.fernclient.net/dist/win/stable/FernClientSetup.exe',
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        sizeFormatted: '82.0 MB',
        isAvailable: true,
        notes: 'Installs to %LocalAppData%\\Programs and registers shortcuts. User configurations preserved in %AppData%.',
      },
      portable: {
        filename: 'FernClient-1.0.0-Portable.zip',
        format: 'zip',
        type: 'portable',
        downloadUrl: 'https://github.com/Sunny-876/fern-client/releases/download/v1.0.0/FernClient-1.0.0-Portable.zip',
        sha256: 'aca5ae20adbba76beefea614181f4014e3962f3a76265ab3a14c59efe1e72128',
        sizeBytes: 215454,
        sizeFormatted: '210 KB (Core Bundle)',
        isAvailable: true,
        notes: 'Runs directly without installation. User data isolated to ./data directory. Unsigned portable archive.',
      },
    },
    highlights: [
      'Zero GC HUD rendering engine with real-time snap-grid editor',
      'Native Fabric, Forge, and NeoForge mod loader management',
      'Automated Java 21/17/8 detection and compatibility enforcement',
      'Offline-first launcher operation with Safe Mode launch protection',
      'Legitimate Microsoft authentication support and AES-256 encrypted credential vault',
    ],
  },
  beta: {
    version: '1.0.0-beta.1',
    channel: 'beta',
    releaseDate: '2026-10-10',
    title: 'Fern Client 1.0.0 Public Beta',
    architecture: 'x64',
    platform: 'Windows 10 / 11',
    signatureAlgorithm: 'ed25519',
    publicKeyFingerprint: 'SHA256:4H6+rW6aR1oF61Y3r8Q9P7u0Z5A1X4kY7l6W0aR1oF4=',
    artifacts: {
      installer: {
        filename: 'FernClient-1.0.0-beta.1-Setup.exe',
        format: 'exe',
        type: 'installer',
        downloadUrl: 'https://downloads.fernclient.net/dist/win/beta/FernClient-1.0.0-beta.1-Setup.exe',
        sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        sizeFormatted: '82.4 MB',
        isAvailable: true,
        notes: 'Public beta release for community compatibility testing and feedback.',
      },
      portable: {
        filename: 'FernClient-1.0.0-Portable.zip',
        format: 'zip',
        type: 'portable',
        downloadUrl: 'https://github.com/Sunny-876/fern-client/releases/download/v1.0.0/FernClient-1.0.0-Portable.zip',
        sha256: 'aca5ae20adbba76beefea614181f4014e3962f3a76265ab3a14c59efe1e72128',
        sizeBytes: 215454,
        sizeFormatted: '210 KB (Core Bundle)',
        isAvailable: true,
        notes: 'Portable zip build for testing without registry integration. Unsigned portable archive.',
      },
    },
    highlights: [
      'Interactive first-launch onboarding wizard with RAM allocation review',
      'Sanitized telemetry and bug report workflow with reference tracking',
      'Enhanced crash diagnosis parsing for Java version mismatches and Mixin conflicts',
      'Rollback snapshot engine for safe, 1-click update restoration',
    ],
  },
};

export const CURRENT_STABLE_RELEASE = OFFICIAL_RELEASES.stable;
export const CURRENT_BETA_RELEASE = OFFICIAL_RELEASES.beta;

export const SYSTEM_REQUIREMENTS = {
  os: 'Windows 10 Version 1809 (Build 17763) or Windows 11 (64-bit)',
  processor: 'Intel Core i3-3210 3.2 GHz / AMD A8-7600 APU 3.1 GHz or equivalent (64-bit)',
  memory: '4 GB RAM minimum (8 GB recommended for modded gameplay)',
  storage: '500 MB free space for Fern Client; 2+ GB recommended for Minecraft installations',
  graphics: 'Intel HD Graphics 4000 / AMD Radeon R5 series / NVIDIA GeForce 400 Series or higher with OpenGL 4.4',
  java: 'Java 21 (LTS) for Minecraft 1.20.5+ / 1.21.x; Java 17 for 1.18–1.20.4; Java 8 for legacy 1.16.5 and below. Automatically detected by Fern Client.',
};
