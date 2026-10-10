import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export type ReleaseChannel = 'stable' | 'beta' | 'rc';

export interface ReleaseManifest {
  version: string;
  channel: ReleaseChannel;
  buildNumber: number;
  gitCommit?: string;
  releasedAt: string;
  artifacts: Array<{
    name: string;
    path: string;
    sha256: string;
    sizeBytes: number;
  }>;
  checksumManifestSha256: string;
  rollbackPlan: {
    previousVersion: string;
    rollbackUrl: string;
    instructions: string[];
  };
}

export class ReleasePipeline {
  private rootDir: string;

  constructor(rootDir = path.resolve('.')) {
    this.rootDir = rootDir;
  }

  public validateSemver(version: string): boolean {
    const semverRegex = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    return semverRegex.test(version);
  }

  public detectChannel(version: string): ReleaseChannel {
    const v = version.toLowerCase();
    if (v.includes('rc')) return 'rc';
    if (v.includes('beta')) return 'beta';
    return 'stable';
  }

  public computeSha256(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  public generateReleaseNotes(version: string, channel: ReleaseChannel): string {
    const dateStr = new Date().toISOString().split('T')[0];
    return `# Fern Client ${version} (${channel.toUpperCase()})
*Release Date: ${dateStr}*

## Highlights
- Performance optimizations and memory tuning for Minecraft 1.21.4 and 1.20.1
- Advanced Instance Management: isolated instance directories, configuration snapshots, templates
- Creator workflows: screenshot browser, collection export, ReplayMod session inspection
- Context-Aware Client Profiles: Minimal, Performance, PvP, Survival, Building, Streaming
- Unified Omnibar discovery with keyboard navigation (\`Ctrl+K\`)

## Compatibility Notice
- Tested on Windows 10 (Build 19045+) and Windows 11 (23H2 / 24H2)
- Official Java runtimes: Java 21 LTS (Minecraft 1.20.5+) and Java 17 LTS (Minecraft 1.18 - 1.20.4)
- Supported mod loaders: Fabric 0.16.x, Forge 47.x (1.20.1), NeoForge 21.x (1.21.1)

## Verification
Verify release artifact integrity with SHA-256:
\`\`\`powershell
Get-FileHash -Algorithm SHA256 FernClient-${version}-Portable.zip
\`\`\`
`;
  }

  public generateRollbackInstructions(currentVersion: string, previousVersion: string): string {
    return `# Rollback Procedure: Fern Client ${currentVersion} -> ${previousVersion}

In the event of an unexpected regression or deployment defect:

1. **Containment**:
   - Immediately switch launcher update manifest back to version \`${previousVersion}\`.
   - In GitHub Releases, mark \`${currentVersion}\` as pre-release or draft to halt new downloads.

2. **Client Rollback**:
   - Users running portable builds can extract \`FernClient-${previousVersion}-Portable.zip\` over their existing folder.
   - User configurations in \`%APPDATA%/Fern Client/installations/\` and local profiles are backward-compatible and preserved.

3. **Backend & Database**:
   - Schema migrations follow additive and backward-compatible changes; no database rollback is required for minor versions.
   - In the event of a critical database regression, restore from the latest automated snapshot:
     \`pg_restore -d fern_production fern_db_pre_release.dump\`

4. **User Communication**:
   - Post incident status notice on the official website and status portal.
`;
  }

  public buildReleaseManifest(
    version: string,
    releaseDir: string,
    previousVersion = '1.0.0-beta.0'
  ): ReleaseManifest {
    if (!this.validateSemver(version)) {
      throw new Error(`Invalid semantic version: ${version}`);
    }

    const channel = this.detectChannel(version);
    const files = fs.existsSync(releaseDir) ? fs.readdirSync(releaseDir) : [];
    const artifacts: ReleaseManifest['artifacts'] = [];
    const checksumLines: string[] = [];

    for (const file of files) {
      if (file.endsWith('.zip') || file.endsWith('.exe')) {
        const fullPath = path.join(releaseDir, file);
        const hash = this.computeSha256(fullPath);
        const stat = fs.statSync(fullPath);
        artifacts.push({
          name: file,
          path: fullPath,
          sha256: hash,
          sizeBytes: stat.size,
        });
        checksumLines.push(`${hash}  ${file}`);
      }
    }

    const checksumsPath = path.join(releaseDir, 'SHA256SUMS.txt');
    fs.writeFileSync(checksumsPath, checksumLines.join('\n') + '\n', 'utf-8');
    const checksumManifestSha256 = this.computeSha256(checksumsPath);

    const manifest: ReleaseManifest = {
      version,
      channel,
      buildNumber: Date.now(),
      releasedAt: new Date().toISOString(),
      artifacts,
      checksumManifestSha256,
      rollbackPlan: {
        previousVersion,
        rollbackUrl: `https://downloads.fernclient.net/dist/win/${channel}/FernClient-${previousVersion}-Portable.zip`,
        instructions: [
          'Halt update broadcast via distribution.json',
          'Deploy previous build zip to download edge CDN',
          'Notify users via status banner',
        ],
      },
    };

    fs.writeFileSync(
      path.join(releaseDir, 'release-manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );

    fs.writeFileSync(
      path.join(releaseDir, 'RELEASE_NOTES.md'),
      this.generateReleaseNotes(version, channel),
      'utf-8'
    );

    fs.writeFileSync(
      path.join(releaseDir, 'ROLLBACK_INSTRUCTIONS.md'),
      this.generateRollbackInstructions(version, previousVersion),
      'utf-8'
    );

    return manifest;
  }
}
