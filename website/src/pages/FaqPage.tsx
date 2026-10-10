import React, { useState, useMemo } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Search, MessageSquare, ArrowRight } from 'lucide-react';
import { FAQ_ITEMS, FaqItem } from '../data/faq-data';

interface FaqPageProps {
  onNavigate?: (tab: string) => void;
}

export const FaqPage: React.FC<FaqPageProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    'is-free': true,
    'windows-support': true,
  });

  const categories = [
    { id: 'all', label: 'All Questions' },
    { id: 'general', label: 'General' },
    { id: 'installation', label: 'Installation & Setup' },
    { id: 'mods', label: 'Modding' },
    { id: 'performance', label: 'Performance' },
    { id: 'privacy', label: 'Privacy & Offline' },
  ];

  const filteredFaqs = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="py-12 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-4">
          <HelpCircle size={14} /> Frequently Asked Questions
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Help & FAQs
        </h1>
        <p className="text-gray-400 mt-3 text-sm leading-relaxed">
          Clear, authentic answers regarding installation requirements, Minecraft compatibility, offline functionality, and modding support.
        </p>

        {/* Search */}
        <div className="relative mt-6 max-w-xl mx-auto">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions (e.g. Java, updates, offline, logs)..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#111620] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 text-sm transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-black font-semibold'
                  : 'bg-[#111620] border border-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ Accordions */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="bg-[#111620] border border-gray-800 rounded-2xl p-8 text-center text-gray-400 text-sm">
            No matching questions found for "{searchQuery}".
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isExpanded = !!expandedIds[faq.id];
            return (
              <div
                key={faq.id}
                className="bg-[#111620] border border-gray-800/80 rounded-xl overflow-hidden transition-colors hover:border-gray-700/80"
              >
                <button
                  onClick={() => toggleExpand(faq.id)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="text-sm sm:text-base font-semibold text-white">
                    {faq.question}
                  </span>
                  <span className="text-gray-500 shrink-0">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-gray-300 leading-relaxed border-t border-gray-800/50">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Support Callout */}
      <div className="mt-12 bg-gradient-to-r from-emerald-950/30 to-[#111620] border border-emerald-500/20 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">
            Still have an unresolved question?
          </h3>
          <p className="text-xs sm:text-sm text-gray-400">
            Check the extensive technical documentation or submit a diagnostic feedback report to our engineering team.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate && onNavigate('docs')}
            className="px-4 py-2 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg text-xs font-semibold text-gray-300 hover:text-white transition-all"
          >
            Browse Docs
          </button>
          <button
            onClick={() => onNavigate && onNavigate('support')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all"
          >
            <MessageSquare size={14} /> Open Support Form
          </button>
        </div>
      </div>
    </div>
  );
};
