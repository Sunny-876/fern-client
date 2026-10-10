import React, { useState } from 'react';
import { Download, Menu, X, Shield, Terminal, BookOpen, HelpCircle } from 'lucide-react';
import { OFFICIAL_RELEASES } from '../data/release-metadata';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'features', label: 'Features' },
    { id: 'downloads', label: 'Downloads' },
    { id: 'docs', label: 'Documentation' },
    { id: 'changelog', label: 'Changelog' },
    { id: 'faq', label: 'FAQ' },
    { id: 'support', label: 'Support' },
  ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(10, 14, 20, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '68px',
        }}
      >
        {/* Brand Logo */}
        <div
          onClick={() => handleNavClick('home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#052e16',
              fontWeight: 800,
              fontSize: '1.1rem',
            }}
          >
            F
          </div>
          <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Fern Client
          </span>
          <span className="badge badge-blue" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
            Beta
          </span>
        </div>

        {/* Desktop Links */}
        <div
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '1.5rem',
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNavClick(link.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: currentTab === link.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontWeight: currentTab === link.id ? 600 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = currentTab === link.id ? 'var(--accent-primary)' : 'var(--text-muted)')
              }
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* CTA & Mobile Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => handleNavClick('downloads')}
            className="btn-primary"
            style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}
          >
            <Download size={15} />
            <span>Download</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-main)',
              display: 'flex',
              padding: '0.4rem',
            }}
            className="mobile-toggle"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '1rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNavClick(link.id)}
              style={{
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                color: currentTab === link.id ? 'var(--accent-primary)' : 'var(--text-main)',
                fontWeight: currentTab === link.id ? 600 : 500,
                fontSize: '0.95rem',
                padding: '0.5rem 0',
                cursor: 'pointer',
              }}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @media (min-width: 860px) {
          .desktop-nav { display: flex !important; }
          .mobile-toggle { display: none !important; }
        }
      `}</style>
    </nav>
  );
};
