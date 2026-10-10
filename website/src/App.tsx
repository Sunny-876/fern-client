import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { DownloadPage } from './pages/DownloadPage';
import { DocumentationPage } from './pages/DocumentationPage';
import { ChangelogPage } from './pages/ChangelogPage';
import { FaqPage } from './pages/FaqPage';
import { SupportPage } from './pages/SupportPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { FeatureSection } from './components/FeatureSection';
import { ProductPreview } from './components/ProductPreview';
import { CompatibilityMatrixSection } from './components/CompatibilityMatrixSection';

export const App: React.FC = () => {
  // Sync tab with URL hash if present
  const getTabFromHash = (): string => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    const validTabs = ['home', 'features', 'downloads', 'docs', 'changelog', 'faq', 'support', 'privacy', 'terms'];
    if (validTabs.includes(hash)) return hash;
    return 'home';
  };

  const [currentTab, setCurrentTab] = useState<string>(getTabFromHash());

  // Listen to hash changes (back/forward navigation)
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentTab(getTabFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (tab: string) => {
    setCurrentTab(tab);
    window.location.hash = tab === 'home' ? '' : tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Update document title dynamically
  useEffect(() => {
    const titles: Record<string, string> = {
      home: 'Fern Client — Windows-First Minecraft Java Launcher',
      features: 'Features & Architecture — Fern Client',
      downloads: 'Download Fern Client — Verified Windows Releases',
      docs: 'Documentation & Technical Reference — Fern Client',
      changelog: 'Changelog & Release Notes — Fern Client',
      faq: 'Frequently Asked Questions — Fern Client',
      support: 'Support & Issue Reporting — Fern Client',
      privacy: 'Privacy Policy & Data Practices — Fern Client',
      terms: 'Terms of Use & Legal Notices — Fern Client',
    };
    document.title = titles[currentTab] || 'Fern Client';
  }, [currentTab]);

  return (
    <div className="min-h-screen bg-[#0a0e14] text-gray-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Navigation */}
      <Navbar currentTab={currentTab} onNavigate={handleNavigate} />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'home' && <HomePage onNavigate={handleNavigate} />}

        {currentTab === 'features' && (
          <div className="py-12 px-4 max-w-7xl mx-auto space-y-16">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs uppercase font-semibold text-emerald-400 tracking-wider">
                Engine & Client Capabilities
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
                Engineered for Performance & Control
              </h1>
              <p className="text-gray-400 mt-3 text-sm leading-relaxed">
                Explore our modular launch pipeline, zero-overhead HUD renderer, and isolated instance management.
              </p>
            </div>
            <ProductPreview />
            <FeatureSection />
            <CompatibilityMatrixSection />
          </div>
        )}

        {currentTab === 'downloads' && <DownloadPage onNavigate={handleNavigate} />}
        {currentTab === 'docs' && <DocumentationPage onNavigate={handleNavigate} />}
        {currentTab === 'changelog' && <ChangelogPage onNavigate={handleNavigate} />}
        {currentTab === 'faq' && <FaqPage onNavigate={handleNavigate} />}
        {currentTab === 'support' && <SupportPage />}
        {currentTab === 'privacy' && <PrivacyPage />}
        {currentTab === 'terms' && <TermsPage />}
      </main>

      {/* Site Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
};
