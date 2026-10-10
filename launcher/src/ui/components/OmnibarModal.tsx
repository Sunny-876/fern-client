import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Compass, Cpu, Palette, Sliders, BookOpen, Layers, Monitor, CornerDownLeft } from 'lucide-react';
import { GlobalSearchService, SearchResultItem, SearchResultCategory } from '../../search/global-search-service';

interface OmnibarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (target: string, payload?: any) => void;
  searchService?: GlobalSearchService;
}

export const OmnibarModal: React.FC<OmnibarModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  searchService,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const localSearchService = useRef(searchService || new GlobalSearchService());

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults(localSearchService.current.search(''));
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open triggered by parent if wired
        }
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    const searchResults = localSearchService.current.search(val);
    setResults(searchResults);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        executeResult(results[selectedIndex]);
      }
    }
  };

  const executeResult = (item: SearchResultItem) => {
    onClose();
    if (onNavigate) {
      onNavigate(item.action.target, item.action.payload);
    }
  };

  const renderCategoryIcon = (category: SearchResultCategory) => {
    switch (category) {
      case 'installation':
        return <Compass size={14} className="text-emerald-400" />;
      case 'module':
        return <Cpu size={14} className="text-cyan-400" />;
      case 'theme':
        return <Palette size={14} className="text-fuchsia-400" />;
      case 'setting':
        return <Sliders size={14} className="text-amber-400" />;
      case 'docs':
        return <BookOpen size={14} className="text-sky-400" />;
      case 'workspace':
        return <Layers size={14} className="text-emerald-300" />;
      case 'hud':
        return <Monitor size={14} className="text-purple-400" />;
      default:
        return <Search size={14} className="text-zinc-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fern Global Omnibar Search"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '70vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-800 gap-3 bg-zinc-900/90">
          <Search size={18} className="text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search installations, mods, modules, HUD widgets, settings, themes..."
            aria-label="Search query"
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-800 border border-zinc-700 rounded">
            ESC
          </kbd>
          <button
            onClick={onClose}
            aria-label="Close search"
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1 divide-y divide-zinc-800/40">
          {results.length === 0 && query.trim() !== '' ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              <p className="font-medium text-zinc-400 text-sm">No matches found for "{query}"</p>
              <p className="mt-1">Try searching for keywords like "fps", "memory", "dark theme", or "shortcuts".</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs">
              <p className="text-zinc-400">Type a keyword to search across the entire client.</p>
              <p className="mt-1 text-[11px] text-zinc-600">Quick suggestions: FPS Display, Coordinates, RAM Allocation, Fern Dark</p>
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => executeResult(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-emerald-500/15 border border-emerald-500/30' : 'hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-md bg-zinc-800 shrink-0">
                      {renderCategoryIcon(item.category)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-200 truncate">{item.title}</span>
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 shrink-0">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">{item.description}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 shrink-0 ml-3">
                      <span>Jump</span>
                      <CornerDownLeft size={12} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2 border-t border-zinc-800/80 bg-zinc-950/40 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-[10px]">↑</kbd>
              <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-[10px]">↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-[10px]">Enter</kbd> Select
            </span>
          </div>
          <span>Local Search • Privacy Safe</span>
        </div>
      </div>
    </div>
  );
};
