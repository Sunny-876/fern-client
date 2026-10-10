import React, { useState, useMemo } from 'react';
import { Search, BookOpen, ChevronRight, FileText, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';
import { DOCUMENTATION_CATEGORIES, DocArticle } from '../data/documentation-data';

interface DocumentationPageProps {
  onNavigate?: (tab: string) => void;
}

export const DocumentationPage: React.FC<DocumentationPageProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('getting-started');
  const [selectedArticleId, setSelectedArticleId] = useState<string>('installing-fern');

  // Filtered articles based on search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: DocArticle[] = [];

    DOCUMENTATION_CATEGORIES.forEach((cat) => {
      cat.articles.forEach((art) => {
        const titleMatch = art.title.toLowerCase().includes(q);
        const summaryMatch = art.summary.toLowerCase().includes(q);
        const keywordMatch = art.keywords.some((k) => k.toLowerCase().includes(q));
        const contentMatch = art.content.toLowerCase().includes(q);

        if (titleMatch || summaryMatch || keywordMatch || contentMatch) {
          results.push(art);
        }
      });
    });

    return results;
  }, [searchQuery]);

  const currentCategory = useMemo(() => {
    return DOCUMENTATION_CATEGORIES.find((c) => c.id === selectedCategoryId) || DOCUMENTATION_CATEGORIES[0];
  }, [selectedCategoryId]);

  const activeArticle = useMemo(() => {
    if (searchQuery.trim() && searchResults.length > 0) {
      const foundInSearch = searchResults.find((a) => a.id === selectedArticleId);
      if (foundInSearch) return foundInSearch;
      return searchResults[0];
    }

    for (const cat of DOCUMENTATION_CATEGORIES) {
      const art = cat.articles.find((a) => a.id === selectedArticleId);
      if (art) return art;
    }
    return DOCUMENTATION_CATEGORIES[0].articles[0];
  }, [selectedArticleId, searchQuery, searchResults]);

  // Basic Markdown-like renderer for formatted article content
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-xl font-bold text-white mt-6 mb-3">
            {trimmed.replace('### ', '')}
          </h3>
        );
      }
      if (trimmed.startsWith('#### ')) {
        return (
          <h4 key={idx} className="text-lg font-semibold text-gray-200 mt-4 mb-2">
            {trimmed.replace('#### ', '')}
          </h4>
        );
      }
      if (trimmed.startsWith('> [!NOTE]')) {
        return (
          <div key={idx} className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-lg text-blue-200 text-sm my-3 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-blue-400" />
            <span>Note</span>
          </div>
        );
      }
      if (trimmed.startsWith('> [!TIP]')) {
        return (
          <div key={idx} className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-emerald-200 text-sm my-3 flex items-start gap-2">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-emerald-400" />
            <span>Tip</span>
          </div>
        );
      }
      if (trimmed.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-2 border-emerald-500/40 pl-3 my-2 text-gray-300 italic text-sm">
            {trimmed.replace('> ', '')}
          </blockquote>
        );
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const bulletText = trimmed.substring(2);
        return (
          <li key={idx} className="text-gray-300 text-sm ml-4 list-disc my-1 leading-relaxed">
            {renderInlineCode(bulletText)}
          </li>
        );
      }
      if (/^\d+\.\s/.test(trimmed)) {
        const itemText = trimmed.replace(/^\d+\.\s/, '');
        return (
          <li key={idx} className="text-gray-300 text-sm ml-4 list-decimal my-1 leading-relaxed">
            {renderInlineCode(itemText)}
          </li>
        );
      }
      if (trimmed.startsWith('```')) {
        return null; // Handle code blocks simply
      }
      if (trimmed === '') {
        return <div key={idx} className="h-2" />;
      }
      return (
        <p key={idx} className="text-gray-300 text-sm my-2 leading-relaxed">
          {renderInlineCode(line)}
        </p>
      );
    });
  };

  const renderInlineCode = (text: string) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 bg-gray-900 border border-gray-800 rounded font-mono text-xs text-emerald-300">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="py-12 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold tracking-wider uppercase mb-2">
          <BookOpen size={16} /> Official Documentation & Guides
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Fern Client Documentation
        </h1>
        <p className="text-gray-400 mt-2 max-w-2xl text-sm leading-relaxed">
          Technical specifications, installation procedures, modding configurations, customization guides, and diagnostic references.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative mb-8 max-w-2xl">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
          <Search size={18} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documentation (e.g., Fabric, RAM allocation, Java setup, HUD)..."
          className="w-full pl-10 pr-4 py-3 bg-[#111620] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 text-sm transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-gray-500 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Main Documentation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar (Categories & Articles) */}
        <div className="lg:col-span-4 bg-[#111620] border border-gray-800/80 rounded-2xl p-4 sticky top-20">
          {searchQuery ? (
            <div>
              <div className="text-xs uppercase font-semibold text-gray-400 tracking-wider mb-3 px-2">
                Search Results ({searchResults.length})
              </div>
              {searchResults.length === 0 ? (
                <div className="text-xs text-gray-500 p-4 text-center">
                  No matching documentation found for "{searchQuery}".
                </div>
              ) : (
                <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
                  {searchResults.map((art) => (
                    <button
                      key={art.id}
                      onClick={() => setSelectedArticleId(art.id)}
                      className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-start gap-2 ${
                        activeArticle?.id === art.id
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          : 'text-gray-300 hover:bg-gray-800/60'
                      }`}
                    >
                      <FileText size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                      <div>
                        <div className="font-medium text-white">{art.title}</div>
                        <div className="text-gray-500 text-[11px] truncate mt-0.5">{art.category}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Category Selector */}
              <div className="text-xs uppercase font-semibold text-gray-400 tracking-wider mb-3 px-2">
                Knowledge Base Topics
              </div>
              <div className="space-y-1 mb-6">
                {DOCUMENTATION_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      setSelectedArticleId(cat.articles[0].id);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                      selectedCategoryId === cat.id
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-900 border border-gray-800 text-gray-500">
                      {cat.articles.length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Articles in Category */}
              <div className="border-t border-gray-800/60 pt-4">
                <div className="text-[11px] uppercase font-semibold text-gray-500 tracking-wider mb-2 px-2">
                  {currentCategory.name} Articles
                </div>
                <div className="space-y-1">
                  {currentCategory.articles.map((art) => (
                    <button
                      key={art.id}
                      onClick={() => setSelectedArticleId(art.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between ${
                        activeArticle?.id === art.id
                          ? 'bg-emerald-500/15 text-white font-medium border border-emerald-500/40'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
                      }`}
                    >
                      <span className="truncate pr-2">{art.title}</span>
                      <ChevronRight size={12} className={activeArticle?.id === art.id ? 'text-emerald-400' : 'text-gray-600'} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Content Area (Active Article) */}
        <div className="lg:col-span-8 bg-[#111620] border border-gray-800/80 rounded-2xl p-6 sm:p-8">
          {activeArticle ? (
            <div>
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                <span>Docs</span>
                <ChevronRight size={12} />
                <span>{activeArticle.category}</span>
                <ChevronRight size={12} />
                <span className="text-emerald-400 font-medium">{activeArticle.title}</span>
              </div>

              {/* Title & Summary */}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                {activeArticle.title}
              </h2>
              <p className="text-gray-400 text-sm mb-6 pb-6 border-b border-gray-800">
                {activeArticle.summary}
              </p>

              {/* Article Content */}
              <div className="prose prose-invert max-w-none">
                {renderFormattedContent(activeArticle.content)}
              </div>

              {/* Keywords Tagging */}
              <div className="mt-8 pt-6 border-t border-gray-800 flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500 mr-2">Related tags:</span>
                {activeArticle.keywords.map((kw, i) => (
                  <span
                    key={i}
                    onClick={() => setSearchQuery(kw)}
                    className="px-2 py-0.5 bg-gray-900 border border-gray-800 hover:border-emerald-500/50 rounded text-[11px] text-gray-400 hover:text-emerald-300 cursor-pointer transition-colors"
                  >
                    #{kw}
                  </span>
                ))}
              </div>

              {/* Help & Feedback Footer */}
              <div className="mt-8 p-4 bg-gray-900/60 border border-gray-800 rounded-xl flex items-center justify-between text-xs">
                <span className="text-gray-400">Did not resolve your question?</span>
                <button
                  onClick={() => onNavigate && onNavigate('support')}
                  className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline flex items-center gap-1"
                >
                  Contact Support or Submit Feedback <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">
              Select an article to view documentation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
