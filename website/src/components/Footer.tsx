import React from 'react';
import { ShieldCheck, ExternalLink, Heart } from 'lucide-react';
import { BRANDING } from '@shared/constants/branding';
import { OFFICIAL_RELEASES } from '../data/release-metadata';

interface FooterProps {
  onNavigate: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '3.5rem 0 2.5rem',
        marginTop: '5rem',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2.5rem',
            marginBottom: '3rem',
          }}
        >
          {/* Brand Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#052e16',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                }}
              >
                F
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Fern Client</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
              High-performance Minecraft Java Edition client and launcher engineered for modern Windows systems.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#4ade80' }}>
              <ShieldCheck size={15} />
              <span>Verified Windows x64 Build</span>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Product
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
              <button onClick={() => onNavigate('downloads')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textAlign: 'left', cursor: 'pointer' }}>
                Download v{OFFICIAL_RELEASES.stable.version}
              </button>
              <button onClick={() => onNavigate('features')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textAlign: 'left', cursor: 'pointer' }}>
                Features & Modules
              </button>
              <button onClick={() => onNavigate('changelog')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textAlign: 'left', cursor: 'pointer' }}>
                Release Changelog
              </button>
              <button onClick={() => onNavigate('faq')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textAlign: 'left', cursor: 'pointer' }}>
                Frequently Asked Questions
              </button>
            </div>
          </div>

          {/* Documentation */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Documentation
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
              <button onClick={() => onNavigate('docs')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textAlign: 'left', cursor: 'pointer' }}>
                Getting Started Guide
              </button>
              <button onClick={() => onNavigate('docs')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textAlign: 'left', cursor: 'pointer' }}>
                Modding & Fabric Setup
              </button>
              <button onClick={() => onNavigate('docs')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textAlign: 'left', cursor: 'pointer' }}>
                RAM Allocation & JVM Tuning
              </button>
              <button onClick={() => onNavigate('docs')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textAlign: 'left', cursor: 'pointer' }}>
                Safe Mode & Troubleshooting
              </button>
            </div>
          </div>

          {/* Legal & Privacy */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Legal & Community
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
              <button onClick={() => onNavigate('privacy')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textAlign: 'left', cursor: 'pointer' }}>
                Privacy Policy
              </button>
              <button onClick={() => onNavigate('terms')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textAlign: 'left', cursor: 'pointer' }}>
                Terms of Use
              </button>
              <button onClick={() => onNavigate('support')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textAlign: 'left', cursor: 'pointer' }}>
                Support & Bug Reports
              </button>
              <a href={BRANDING.GITHUB} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>Source Code</span> <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Disclaimer */}
        <div
          style={{
            paddingTop: '2rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            fontSize: '0.75rem',
            color: 'var(--text-dim)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <span>
              &copy; {new Date().getFullYear()} Fern Client Team. Open source under the MIT License.
            </span>
            <span>
              Version {OFFICIAL_RELEASES.beta.version} (Windows x64)
            </span>
          </div>
          <p style={{ lineHeight: 1.5 }}>
            <strong>Legal Disclaimer:</strong> Fern Client is not an official Minecraft product. Not approved by or associated with Mojang Studios or Microsoft. Minecraft is a registered trademark of Mojang Synergies AB. All mod loaders, modpack specifications, and assets are the property of their respective creators.
          </p>
        </div>
      </div>
    </footer>
  );
};
