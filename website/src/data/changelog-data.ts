export interface ChangelogEntry {
  version: string;
  channel: 'stable' | 'beta';
  date: string;
  title: string;
  description: string;
  features: string[];
  fixes: string[];
  security: string[];
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: '1.0.0-beta.1',
    channel: 'beta',
    date: '2026-10-10',
    title: 'Public Beta & Release Engineering Milestone',
    description: 'First public beta release introducing reproducible Windows packaging, Ed25519 digital signature validation, Safe Mode launch protection, and diagnostic privacy redaction.',
    features: [
      'Windows Portable ZIP distribution bundle with isolated ./data storage',
      'Interactive first-launch onboarding wizard with RAM allocation review and Java 21 detection',
      'Ed25519 digital signature validation for update integrity',
      'Rollback snapshot engine for 1-click update restoration',
      'Safe Mode launch flag injection (-Dfern.safemode=true --fernSafeMode) to isolate mod conflicts',
      'Sanitized telemetry export and lightweight feedback submission workflow',
    ],
    fixes: [
      'Resolved Java version incompatibility diagnosis parsing for 1.20.5+ bytecode',
      'Fixed concurrency race conditions during simultaneous update checks',
      'Prevented corrupted settings.json files from crashing launcher startup',
    ],
    security: [
      'Automated scrubbing of Bearer tokens, passwords, and user usernames from exported diagnostic reports',
      'Least-privilege Windows installer execution (user level; no elevation required)',
    ],
  },
  {
    version: '1.0.0',
    channel: 'stable',
    date: '2026-10-09',
    title: 'Initial General Availability Release',
    description: 'Foundation release of Fern Client featuring high-performance Minecraft Java Edition launching, zero GC HUD editor, and authoritative cloud synchronization.',
    features: [
      'High-performance Minecraft launch pipeline supporting Vanilla, Fabric, NeoForge, and Forge',
      'Modular in-game HUD editor with real-time snap-grid canvas and zero GC overhead',
      'Memory advisor with automated G1GC/ZGC JVM argument synthesis',
      'Modrinth .mrpack modpack archive import and export',
      'Legitimate Microsoft Minecraft authentication and AES-256 encrypted credential vault',
      'Dedicated NestJS backend with Argon2id authentication, revocable sessions, and privacy controls',
      'Opt-in cloud configuration sync with SHA-256 revision hashing and 409 Conflict detection',
      'Authoritative cosmetic catalog and in-game verification payload',
    ],
    fixes: [
      'Seamless offline fallback when backend or internet connectivity is unavailable',
      'Independent game instance directory isolation preventing mod conflict leakage',
    ],
    security: [
      'Argon2id password hashing and brute-force lockout defenses on the Fern online backend',
      'Strict isolation between Microsoft Minecraft authentication and Fern community accounts',
    ],
  },
];
