import React from 'react';
import { Download, ArrowRight, ShieldCheck, Cpu, Sparkles, Layers, Terminal } from 'lucide-react';
import { OFFICIAL_RELEASES } from '../data/release-metadata';

interface HeroSectionProps {
  onNavigate: (tab: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate }) => {
  const stable = OFFICIAL_RELEASES.stable;

  return (
    <section
      style={{
        padding: '5rem 0 3rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="container" style={{ textAlign: 'center' }}>
        {/* Release Pill Badge */}
        <div style={{ display: 'inline-flex', marginBottom: '1.5rem' }}>
          <div
            className="badge"
            style={{
              padding: '0.4rem 1rem',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            onClick={() => onNavigate('downloads')}
          >
            <Sparkles size={14} />
            <span>Fern Client v{stable.version} for Windows is available</span>
            <ArrowRight size={13} />
          </div>
        </div>

        {/* Main Title */}
        <h1
          style={{
            fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            color: '#ffffff',
            maxWidth: '850px',
            margin: '0 auto 1.25rem',
          }}
        >
          High-performance Minecraft client. Engineered for Windows.
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            color: 'var(--text-muted)',
            maxWidth: '680px',
            margin: '0 auto 2.25rem',
            lineHeight: 1.6,
          }}
        >
          Zero-GC HUD customization, native Fabric & Forge mod loaders, automated Java 21 detection, and offline-first launcher reliability.
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '3rem',
          }}
        >
          <button
            onClick={() => onNavigate('downloads')}
            className="btn-primary"
            style={{
              padding: '0.9rem 1.8rem',
              fontSize: '1rem',
              borderRadius: '12px',
            }}
          >
            <Download size={18} />
            <span>Download Fern Client</span>
          </button>

          <button
            onClick={() => onNavigate('features')}
            className="btn-secondary"
            style={{
              padding: '0.9rem 1.8rem',
              fontSize: '1rem',
              borderRadius: '12px',
            }}
          >
            <span>Explore Features</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Meta badges */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1.5rem',
            flexWrap: 'wrap',
            fontSize: '0.8rem',
            color: 'var(--text-dim)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={16} color="#22c55e" />
            <span>Windows 10/11 x64 Native</span>
          </div>
          <span>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Layers size={16} color="#3b82f6" />
            <span>Fabric • NeoForge • Forge</span>
          </div>
          <span>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Cpu size={16} color="#eab308" />
            <span>Java 21 LTS Auto-Tuning</span>
          </div>
          <span>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Terminal size={16} color="#a855f7" />
            <span>MIT Open Source</span>
          </div>
        </div>
      </div>
    </section>
  );
};
