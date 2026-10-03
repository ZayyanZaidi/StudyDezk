import React, { useState, useEffect, useRef } from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import { searchDocuments } from '../../logic/search/semantic';
import { SearchResult } from '../../types/search';
import { Search, X, Sparkles, FileText, ArrowRight, Loader2 } from 'lucide-react';

export const SemanticSearchModal: React.FC = () => {
  const { searchOpen, setSearchOpen, selectedCourse, setActiveDocument, setActiveTab } = useStudyStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [searchOpen]);

  // Global Ctrl+K / Cmd+K handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, setSearchOpen]);

  useEffect(() => {
    let isCancelled = false;
    const cleanQuery = query.trim();

    if (!cleanQuery) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchDocuments(cleanQuery, selectedCourse);
        if (!isCancelled) {
          setResults(res);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query, selectedCourse]);

  if (!searchOpen) return null;

  const handleSelectResult = (result: SearchResult) => {
    setActiveDocument(result.documentId);
    setActiveTab('rawText');
    setSearchOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-black shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[80dvh]">
        {/* Search Input Bar */}
        <div className="relative border-b border-neutral-200 dark:border-neutral-800 p-4 flex items-center gap-3 bg-white dark:bg-neutral-950">
          <Search className="w-5 h-5 text-neutral-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search across all lecture slides and notes (e.g. CIA triad, IaaS vs PaaS, unit test cycle)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none"
          />
          {isSearching && <Loader2 className="w-4 h-4 text-neutral-600 dark:text-neutral-400 animate-spin shrink-0" />}
          <button
            onClick={() => setSearchOpen(false)}
            className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          {query.trim() && !isSearching && results.length === 0 && (
            <div className="py-12 text-center text-neutral-400 text-xs">
              No matching sentences or concepts found across saved documents.
            </div>
          )}

          {!query.trim() && (
            <div className="py-8 text-center text-neutral-400 text-xs space-y-2">
              <Sparkles className="w-6 h-6 mx-auto text-neutral-400 opacity-60" />
              <p className="text-neutral-700 dark:text-neutral-300">Type keywords, natural questions, or acronyms to search.</p>
              <p className="text-[11px] text-neutral-500">
                Uses browser embeddings to rank meaning, not just exact keywords.
              </p>
            </div>
          )}

          {results.map((result, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectResult(result)}
              className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-900/50 hover:bg-neutral-100/50 dark:hover:bg-neutral-850 transition cursor-pointer flex items-start justify-between gap-3 group"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                    {result.documentTitle}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium shrink-0">
                    {result.course}
                  </span>
                  <span className="text-[10px] text-neutral-400 shrink-0">
                    Page {result.pageNumber}
                  </span>
                </div>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-2 leading-relaxed font-normal">
                  {result.snippet}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-center">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {Math.round(result.score * 100)}% match
                </span>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition" />
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center justify-between shrink-0">
          <span>{results.length} results found</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
};
