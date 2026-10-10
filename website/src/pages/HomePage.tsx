import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { ProductPreview } from '../components/ProductPreview';
import { FeatureSection } from '../components/FeatureSection';
import { CompatibilityMatrixSection } from '../components/CompatibilityMatrixSection';
import { Download, ArrowRight, ShieldCheck } from 'lucide-react';
import { OFFICIAL_RELEASES } from '../data/release-metadata';

interface HomePageProps {
  onNavigate: (tab: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div>
      <HeroSection onNavigate={onNavigate} />
      <ProductPreview />
      <FeatureSection />
      <CompatibilityMatrixSection />

      {/* Final Call to Action */}
      <section style={{ padding: '4.5rem 0', textAlign: 'center' }}>
        <div className="container">
          <div
            className="card"
            style={{
              maxWidth: '840px',
              margin: '0 auto',
              padding: '3rem 2rem',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(16, 22, 32, 0.8) 100%)',
              borderColor: 'rgba(34, 197, 94, 0.25)',
            }}
          >
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
              Ready to experience Fern Client?
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '540px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
              Download the Windows x64 installer or portable zip package today. Free, open source, and offline-first.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => onNavigate('downloads')}
                className="btn-primary"
                style={{ padding: '0.85rem 1.6rem', fontSize: '0.95rem' }}
              >
                <Download size={18} />
                <span>Download v{OFFICIAL_RELEASES.stable.version} for Windows</span>
              </button>

              <button
                onClick={() => onNavigate('docs')}
                className="btn-secondary"
                style={{ padding: '0.85rem 1.6rem', fontSize: '0.95rem' }}
              >
                <span>Read the Documentation</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
