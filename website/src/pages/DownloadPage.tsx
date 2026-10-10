import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  ShieldCheck,
  Terminal,
  FileArchive,
  Info,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';
import { OFFICIAL_RELEASES, SYSTEM_REQUIREMENTS, ReleaseVersion } from '../data/release-metadata';

export const DownloadPage: React.FC = () => {
  const [selectedChannel, setSelectedChannel] = useState<'stable' | 'beta'>('stable');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const release: ReleaseVersion = OFFICIAL_RELEASES[selectedChannel];

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  return (
    <div style={{ padding: '3rem 0 5rem' }}>
      <div className="container">
        {/* Title & Channel Selector */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3rem' }}>
          <div className="badge badge-blue" style={{ marginBottom: '0.75rem' }}>
            Release Portal
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
            Download Fern Client
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            Official, verified Windows x64 distributions with cryptographic SHA-256 integrity and Ed25519 signature validation.
          </p>

          {/* Channel Toggle */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              padding: '4px',
            }}
          >
            <button
              onClick={() => setSelectedChannel('stable')}
              style={{
                padding: '0.5rem 1.4rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.88rem',
                fontWeight: selectedChannel === 'stable' ? 600 : 400,
                background: selectedChannel === 'stable' ? 'var(--accent-primary)' : 'transparent',
                color: selectedChannel === 'stable' ? '#052e16' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Stable Channel (v{OFFICIAL_RELEASES.stable.version})
            </button>
            <button
              onClick={() => setSelectedChannel('beta')}
              style={{
                padding: '0.5rem 1.4rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.88rem',
                fontWeight: selectedChannel === 'beta' ? 600 : 400,
                background: selectedChannel === 'beta' ? '#3b82f6' : 'transparent',
                color: selectedChannel === 'beta' ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Beta Channel (v{OFFICIAL_RELEASES.beta.version})
            </button>
          </div>
        </div>

        {/* Release Artifact Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.75rem',
            marginBottom: '3.5rem',
          }}
        >
          {/* Card 1: Windows Installer */}
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: selectedChannel === 'stable' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(59, 130, 246, 0.4)',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <span className="badge" style={{ marginBottom: '0.5rem' }}>
                    Recommended for Most Users
                  </span>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff' }}>
                    Windows Installer
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    {release.artifacts.installer.filename}
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {release.artifacts.installer.sizeFormatted}
                </div>
              </div>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '1.5rem' }}>
                {release.artifacts.installer.notes}
              </p>

              {/* Checksum Copy Block */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '0.35rem' }}>
                  SHA-256 Checksum
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
                    {release.artifacts.installer.sha256}
                  </span>
                  <button
                    onClick={() => handleCopyHash(release.artifacts.installer.sha256)}
                    style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}
                    title="Copy Checksum"
                  >
                    {copiedHash === release.artifacts.installer.sha256 ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <a
              href="https://github.com/Sunny-876/fern-client/releases/tag/v1.0.0"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{ width: '100%', padding: '0.85rem' }}
            >
              <Download size={18} />
              <span>Download from GitHub</span>
            </a>
          </div>

          {/* Card 2: Portable ZIP */}
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <span className="badge badge-blue" style={{ marginBottom: '0.5rem' }}>
                    No Registry Footprint
                  </span>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff' }}>
                    Portable Bundle
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    {release.artifacts.portable.filename}
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {release.artifacts.portable.sizeFormatted}
                </div>
              </div>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '1.5rem' }}>
                {release.artifacts.portable.notes}
              </p>

              {/* Checksum Copy Block */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '0.35rem' }}>
                  SHA-256 Checksum
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
                    {release.artifacts.portable.sha256}
                  </span>
                  <button
                    onClick={() => handleCopyHash(release.artifacts.portable.sha256)}
                    style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}
                    title="Copy Checksum"
                  >
                    {copiedHash === release.artifacts.portable.sha256 ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <a
              href={release.artifacts.portable.downloadUrl}
              download
              className="btn-secondary"
              style={{ width: '100%', padding: '0.85rem' }}
            >
              <FileArchive size={18} />
              <span>Download Portable (.zip)</span>
            </a>
          </div>
        </div>

        {/* Verification & System Requirements Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem', marginBottom: '2.5rem' }}>
          {/* Integrity Verification Guide */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <ShieldCheck size={20} color="#22c55e" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Cryptographic Verification
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
              To verify that your downloaded binary has not been tampered with, run these commands in Windows PowerShell:
            </p>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem', fontWeight: 600 }}>Installer Verification:</div>
            <div
              style={{
                background: '#090d14',
                padding: '0.75rem',
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.76rem',
                color: '#4ade80',
                marginBottom: '0.75rem',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Get-FileHash -Path .\FernClientSetup.exe -Algorithm SHA256
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem', fontWeight: 600 }}>Portable Verification:</div>
            <div
              style={{
                background: '#090d14',
                padding: '0.75rem',
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.76rem',
                color: '#4ade80',
                marginBottom: '1rem',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Get-FileHash -Path .\FernClient-1.0.0-Portable.zip -Algorithm SHA256
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
              <strong>Signing Status:</strong> Build artifacts are verified via SHA-256 and Ed25519 manifests. Azure Trusted Signing Authenticode pipeline is configured and ready for production credential deployment.
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Signed with: <span className="code-inline">{release.signatureAlgorithm}</span>
              <br />
              Public Key Fingerprint: <span className="code-inline">{release.publicKeyFingerprint}</span>
            </div>
          </div>

          {/* System Requirements */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <HardDrive size={20} color="#3b82f6" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                System Requirements
              </h3>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <li><strong>OS:</strong> {SYSTEM_REQUIREMENTS.os}</li>
              <li><strong>RAM:</strong> {SYSTEM_REQUIREMENTS.memory}</li>
              <li><strong>Processor:</strong> {SYSTEM_REQUIREMENTS.processor}</li>
              <li><strong>Graphics:</strong> {SYSTEM_REQUIREMENTS.graphics}</li>
              <li><strong>Java:</strong> {SYSTEM_REQUIREMENTS.java}</li>
            </ul>
          </div>
        </div>

        {/* Installation & Trust Instructions Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
          {/* Step-by-Step Installation */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <FileArchive size={20} color="#eab308" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Installation Options & Instructions
              </h3>
            </div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.55, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <strong style={{ color: '#fff' }}>Option A: Windows Installer (Setup.exe)</strong>
                <ol style={{ paddingLeft: '1.25rem', marginTop: '0.35rem', marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <li>Run <span className="code-inline">FernClientSetup.exe</span> (silent install via <span className="code-inline">/S</span>).</li>
                  <li>Installs to <span className="code-inline">%LocalAppData%\Programs\Fern Client</span> without requiring administrator rights.</li>
                  <li>Creates Start Menu and Desktop shortcuts, and registers standard Windows Add/Remove Programs entry.</li>
                  <li>User settings and accounts in <span className="code-inline">%AppData%\Fern Client</span> are preserved across upgrades.</li>
                  <li>Clean uninstaller is provided in <span className="code-inline">Settings &gt; Apps &gt; Installed apps</span> or directly via <span className="code-inline">Uninstall.exe</span>.</li>
                </ol>
              </div>
              <div>
                <strong style={{ color: '#fff' }}>Option B: Portable ZIP</strong>
                <ol style={{ paddingLeft: '1.25rem', marginTop: '0.35rem', marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <li>Extract <span className="code-inline">FernClient-1.0.0-Portable.zip</span> to any folder or USB drive.</li>
                  <li>Run <span className="code-inline">FernClient-Portable.bat</span>. All user profiles and logs remain isolated inside <span className="code-inline">./data</span> with zero registry changes.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Code Signing & Trust Transparency */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <Info size={20} color="#a855f7" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                SmartScreen & Code Signing Disclosure
              </h3>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '0.75rem' }}>
              Fern Client release builds are secured with SHA-256 integrity digests and Ed25519 publisher manifests.
              The repository release pipeline incorporates Microsoft Azure Trusted Signing scaffolding for Authenticode certification.
            </p>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '0.75rem' }}>
              Until production signing credentials are authenticated in CI or download volume builds reputation, Windows Defender SmartScreen may display an initial protective dialog (<strong style={{ color: '#fff' }}>"Windows protected your PC"</strong>). Note that digital signing alone does not guarantee zero SmartScreen alerts—reputation is established progressively.
            </p>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '1rem' }}>
              To verify and proceed: verify the SHA-256 hash using the command above, click <strong style={{ color: '#fff' }}>"More info"</strong>, then select <strong style={{ color: '#fff' }}>"Run anyway"</strong>.
            </p>
            <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <a
                href="https://github.com/Sunny-876/fern-client/issues"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}
              >
                Need help or experiencing an issue? Report on GitHub &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
