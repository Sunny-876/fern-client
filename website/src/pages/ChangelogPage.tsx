import React, { useState } from 'react';
import { History, ShieldCheck, CheckCircle2, Wrench, Calendar, Sparkles } from 'lucide-react';
import { CHANGELOG_ENTRIES } from '../data/changelog-data';

interface ChangelogPageProps {
  onNavigate?: (tab: string) => void;
}

export const ChangelogPage: React.FC<ChangelogPageProps> = ({ onNavigate }) => {
  const [activeChannel, setActiveChannel] = useState<'all' | 'stable' | 'beta'>('all');

  const filteredEntries = CHANGELOG_ENTRIES.filter((entry) => {
    if (activeChannel === 'all') return true;
    return entry.channel === activeChannel;
  });

  return (
    <div className="py-12 px-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-4">
          <History size={14} /> Release History & Updates
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Fern Client Changelog
        </h1>
        <p className="text-gray-400 mt-3 text-sm leading-relaxed">
          Transparent, verifiable release notes for every version of Fern Client. All builds are digitally signed and verifiable via SHA-256 and Ed25519 signatures.
        </p>

        {/* Channel Filter Pills */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setActiveChannel('all')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeChannel === 'all'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                : 'bg-[#111620] border border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            All Releases
          </button>
          <button
            onClick={() => setActiveChannel('stable')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeChannel === 'stable'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                : 'bg-[#111620] border border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Stable Channel
          </button>
          <button
            onClick={() => setActiveChannel('beta')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeChannel === 'beta'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-[#111620] border border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Beta Channel
          </button>
        </div>
      </div>

      {/* Release Timeline */}
      <div className="space-y-8 relative before:absolute before:inset-0 before:left-4 sm:before:left-8 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500/50 before:via-gray-800 before:to-transparent">
        {filteredEntries.map((entry) => (
          <div key={entry.version} className="relative pl-10 sm:pl-16">
            {/* Timeline Dot */}
            <div className={`absolute left-2.5 sm:left-6.5 top-5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0e14] ${
              entry.channel === 'stable' ? 'bg-emerald-500' : 'bg-amber-500'
            }`} />

            {/* Release Card */}
            <div className="bg-[#111620] border border-gray-800/80 rounded-2xl p-6 sm:p-8 hover:border-gray-700/80 transition-all">
              {/* Header Info */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                    v{entry.version}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                      entry.channel === 'stable'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {entry.channel}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar size={14} />
                  <span>{entry.date}</span>
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-bold text-gray-200 mb-2">
                {entry.title}
              </h3>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                {entry.description}
              </p>

              {/* Features Section */}
              {entry.features.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2.5">
                    <Sparkles size={14} /> New Features & Enhancements
                  </div>
                  <ul className="space-y-1.5 pl-2">
                    {entry.features.map((feat, i) => (
                      <li key={i} className="text-xs sm:text-sm text-gray-300 flex items-start gap-2">
                        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500/70" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Bug Fixes Section */}
              {entry.fixes.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2.5">
                    <Wrench size={14} /> Bug Fixes & Stability
                  </div>
                  <ul className="space-y-1.5 pl-2">
                    {entry.fixes.map((fix, i) => (
                      <li key={i} className="text-xs sm:text-sm text-gray-300 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                        <span>{fix}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Security & Hardening Section */}
              {entry.security.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2.5">
                    <ShieldCheck size={14} /> Security & Hardening
                  </div>
                  <ul className="space-y-1.5 pl-2">
                    {entry.security.map((sec, i) => (
                      <li key={i} className="text-xs sm:text-sm text-gray-300 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                        <span>{sec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Link to Downloads */}
              <div className="mt-6 pt-4 border-t border-gray-800/60 flex justify-end">
                <button
                  onClick={() => onNavigate && onNavigate('downloads')}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Download v{entry.version} Artifacts &rarr;
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
