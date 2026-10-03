import React, { useState } from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import { Search, Sparkles, BookOpen, Tag, Hash } from 'lucide-react';

export const GlossaryView: React.FC = () => {
  const { activeDocumentId, documents, glossaryTerms, selectedCourse } = useStudyStore();
  const currentDoc = documents.find((d) => d.id === activeDocumentId);

  const [searchTerm, setSearchTerm] = useState('');
  const [acronymsOnly, setAcronymsOnly] = useState(false);

  // Filter terms by active document or course
  const docTerms = glossaryTerms.filter((t) => {
    if (activeDocumentId && t.documentId === activeDocumentId) return true;
    if (!activeDocumentId && selectedCourse !== 'All Courses') return t.course === selectedCourse;
    return true;
  });

  const filtered = docTerms.filter((item) => {
    if (acronymsOnly && !item.isAcronym) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.term.toLowerCase().includes(q) ||
      (item.expansion && item.expansion.toLowerCase().includes(q)) ||
      item.definition.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-white dark:bg-black p-4 sm:p-6 lg:p-8">
      {/* Header & Search */}
      <div className="max-w-4xl mx-auto w-full space-y-4 mb-6 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
              Glossary &amp; Key Terminology
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Extracted terms, definitions, and university course acronyms.
            </p>
          </div>

          {/* Toggle Acronyms */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAcronymsOnly(!acronymsOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                acronymsOnly
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:bg-white dark:text-black dark:border-white'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Acronyms Only</span>
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search keywords, acronyms, or definitions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 shadow-2xs"
          />
        </div>
      </div>

      {/* Grid of Terms */}
      <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full min-h-0">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 space-y-2">
            <BookOpen className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-700" />
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">No matching terms found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
            {filtered.map((term) => (
              <div
                key={term.id}
                className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 space-y-3 hover:border-neutral-300 dark:hover:border-neutral-700 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">
                      {term.term}
                    </span>
                    {term.expansion && (
                      <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mt-0.5">
                        {term.expansion}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {term.isAcronym && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 uppercase border border-amber-200 dark:border-amber-800">
                        Acronym
                      </span>
                    )}
                    {term.occurrences > 0 && (
                      <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                        <Hash className="w-3 h-3" />
                        {term.occurrences}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed font-normal">
                  {term.definition}
                </p>

                {term.contextSentence && term.contextSentence !== term.definition && (
                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400 italic">
                    &ldquo;{term.contextSentence.slice(0, 140)}...&rdquo;
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
