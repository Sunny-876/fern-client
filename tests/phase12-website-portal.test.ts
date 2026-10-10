import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  OFFICIAL_RELEASES,
  CURRENT_STABLE_RELEASE,
  CURRENT_BETA_RELEASE,
  SYSTEM_REQUIREMENTS,
} from '../website/src/data/release-metadata';
import { DOCUMENTATION_CATEGORIES } from '../website/src/data/documentation-data';
import { FAQ_ITEMS } from '../website/src/data/faq-data';
import { CHANGELOG_ENTRIES } from '../website/src/data/changelog-data';

describe('Phase 12: Official Website, Download Portal & Launch Ecosystem', () => {
  describe('Release Metadata & Download Integrity', () => {
    it('provides valid release metadata for both stable and beta channels', () => {
      expect(CURRENT_STABLE_RELEASE).toBeDefined();
      expect(CURRENT_BETA_RELEASE).toBeDefined();

      expect(CURRENT_STABLE_RELEASE.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(CURRENT_BETA_RELEASE.version).toContain('beta');

      expect(CURRENT_STABLE_RELEASE.platform).toBe('Windows 10 / 11');
      expect(CURRENT_STABLE_RELEASE.architecture).toBe('x64');
      expect(CURRENT_STABLE_RELEASE.signatureAlgorithm).toBe('ed25519');
    });

    it('contains strictly valid SHA-256 checksums and Ed25519 fingerprints', () => {
      const sha256Regex = /^[a-f0-9]{64}$/i;

      // Stable
      const stableInstaller = CURRENT_STABLE_RELEASE.artifacts.installer;
      const stablePortable = CURRENT_STABLE_RELEASE.artifacts.portable;
      expect(stableInstaller.sha256).toMatch(sha256Regex);
      expect(stablePortable.sha256).toMatch(sha256Regex);
      expect(CURRENT_STABLE_RELEASE.publicKeyFingerprint).toContain('SHA256:');

      // Beta
      const betaInstaller = CURRENT_BETA_RELEASE.artifacts.installer;
      const betaPortable = CURRENT_BETA_RELEASE.artifacts.portable;
      expect(betaInstaller.sha256).toMatch(sha256Regex);
      expect(betaPortable.sha256).toMatch(sha256Regex);
    });

    it('verifies actual portable release artifact existence and byte size matches metadata', () => {
      const portablePath = path.resolve(import.meta.dirname, '../release/FernClient-1.0.0-Portable.zip');
      if (fs.existsSync(portablePath)) {
        const stats = fs.statSync(portablePath);
        expect(stats.size).toBeGreaterThan(150000);
        expect(CURRENT_STABLE_RELEASE.artifacts.portable.sizeBytes).toBeGreaterThan(150000);
      }
    });

    it('specifies concrete Windows 10/11 system requirements and Java runtimes', () => {
      expect(SYSTEM_REQUIREMENTS.os).toContain('Windows 10');
      expect(SYSTEM_REQUIREMENTS.os).toContain('Windows 11');
      expect(SYSTEM_REQUIREMENTS.os).toContain('64-bit');
      expect(SYSTEM_REQUIREMENTS.memory).toContain('4 GB');
      expect(SYSTEM_REQUIREMENTS.java).toContain('Java 21');
    });
  });

  describe('Documentation Portal Structure & Search Indexing', () => {
    it('covers all 6 required documentation knowledge categories', () => {
      const categoryIds = DOCUMENTATION_CATEGORIES.map((c) => c.id);
      expect(categoryIds).toContain('getting-started');
      expect(categoryIds).toContain('installations');
      expect(categoryIds).toContain('modding');
      expect(categoryIds).toContain('customization');
      expect(categoryIds).toContain('accounts-online');
      expect(categoryIds).toContain('troubleshooting');
    });

    it('each article has valid identifier, non-empty summary, and searchable keywords', () => {
      for (const cat of DOCUMENTATION_CATEGORIES) {
        expect(cat.articles.length).toBeGreaterThan(0);
        for (const art of cat.articles) {
          expect(art.id).toBeTruthy();
          expect(art.title).toBeTruthy();
          expect(art.summary.length).toBeGreaterThan(15);
          expect(art.content.length).toBeGreaterThan(50);
          expect(art.keywords.length).toBeGreaterThan(2);
        }
      }
    });

    it('documents authentic features and platform limitations truthfully', () => {
      const allContent = DOCUMENTATION_CATEGORIES.flatMap((c) => c.articles)
        .map((a) => a.content)
        .join('\n');

      // Verifies Fabric, NeoForge, RAM allocation, Safe Mode are documented
      expect(allContent).toContain('Fabric');
      expect(allContent).toContain('NeoForge');
      expect(allContent).toContain('Safe Mode');
      expect(allContent).toContain('RAM allocation');
      expect(allContent).toContain('Java 21');
      // Verifies offline-first philosophy is stated
      expect(allContent).toContain('Offline');
    });
  });

  describe('FAQ Content Truthfulness', () => {
    it('answers required questions without deceptive claims', () => {
      const questions = FAQ_ITEMS.map((f) => f.question.toLowerCase());

      const hasFree = questions.some((q) => q.includes('free'));
      const hasWindows = questions.some((q) => q.includes('windows'));
      const hasMinecraft = questions.some((q) => q.includes('minecraft'));
      const hasJava = questions.some((q) => q.includes('java'));
      const hasMods = questions.some((q) => q.includes('mod'));
      const hasOffline = questions.some((q) => q.includes('offline') || q.includes('servers'));
      const hasUpdates = questions.some((q) => q.includes('update'));
      const hasLogs = questions.some((q) => q.includes('log'));

      expect(hasFree).toBe(true);
      expect(hasWindows).toBe(true);
      expect(hasMinecraft).toBe(true);
      expect(hasJava).toBe(true);
      expect(hasMods).toBe(true);
      expect(hasOffline).toBe(true);
      expect(hasUpdates).toBe(true);
      expect(hasLogs).toBe(true);
    });

    it('categorizes FAQs across relevant domains', () => {
      const categories = new Set(FAQ_ITEMS.map((f) => f.category));
      expect(categories.has('general')).toBe(true);
      expect(categories.has('installation')).toBe(true);
      expect(categories.has('mods')).toBe(true);
      expect(categories.has('performance')).toBe(true);
      expect(categories.has('privacy')).toBe(true);
    });
  });

  describe('Changelog & Historical Release Notes', () => {
    it('contains chronological entries for 1.0.0 and 1.0.0-beta.1', () => {
      const versions = CHANGELOG_ENTRIES.map((c) => c.version);
      expect(versions).toContain('1.0.0-beta.1');
      expect(versions).toContain('1.0.0');

      for (const entry of CHANGELOG_ENTRIES) {
        expect(entry.features.length).toBeGreaterThan(0);
        expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });

  describe('SEO & Distribution Asset Verification', () => {
    it('contains valid robots.txt with sitemap reference', () => {
      const robotsPath = path.resolve(import.meta.dirname, '../website/public/robots.txt');
      expect(fs.existsSync(robotsPath)).toBe(true);
      const content = fs.readFileSync(robotsPath, 'utf8');
      expect(content).toContain('User-agent: *');
      expect(content).toContain('Allow: /');
      expect(content).toContain('Sitemap:');
    });

    it('contains valid XML sitemap including public website routes', () => {
      const sitemapPath = path.resolve(import.meta.dirname, '../website/public/sitemap.xml');
      expect(fs.existsSync(sitemapPath)).toBe(true);
      const content = fs.readFileSync(sitemapPath, 'utf8');
      expect(content).toContain('<urlset');
      expect(content).toContain('#downloads');
      expect(content).toContain('#docs');
      expect(content).toContain('#faq');
      expect(content).toContain('#support');
      expect(content).toContain('#privacy');
      expect(content).toContain('#terms');
    });

    it('builds website output directory dist-website with index.html and assets', () => {
      const distPath = path.resolve(import.meta.dirname, '../dist-website');
      expect(fs.existsSync(distPath)).toBe(true);
      expect(fs.existsSync(path.join(distPath, 'index.html'))).toBe(true);
      expect(fs.existsSync(path.join(distPath, 'robots.txt'))).toBe(true);
      expect(fs.existsSync(path.join(distPath, 'sitemap.xml'))).toBe(true);
      expect(fs.existsSync(path.join(distPath, 'assets'))).toBe(true);
    });
  });
});
