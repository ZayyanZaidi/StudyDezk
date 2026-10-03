import React, { useState } from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import { Copy, Check, FileText, ToggleLeft, ToggleRight, ScanText, Sparkles } from 'lucide-react';

export const ExtractedTextViewer: React.FC = () => {
  const { activeDocumentId, documents, toggleSlideMerge } = useStudyStore();
  const currentDoc = documents.find((d) => d.id === activeDocumentId);

  const [copied, setCopied] = useState(false);
  const [selectedPageNum, setSelectedPageNum] = useState<number | 'all'>('all');

  if (!currentDoc) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
        Select a document from the sidebar to view extracted text.
      </div>
    );
  }

  const handleCopy = () => {
    const textToCopy =
      selectedPageNum === 'all'
        ? currentDoc.processedText
        : currentDoc.pages.find((p) => p.pageNumber === selectedPageNum)?.text || '';
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayText =
    selectedPageNum === 'all'
      ? currentDoc.slideMergeApplied
        ? currentDoc.processedText
        : currentDoc.fullText
      : currentDoc.pages.find((p) => p.pageNumber === selectedPageNum)?.text || '';

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-neutral-50/50 dark:bg-black">
      {/* Action Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Page selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
            Pages:
          </span>
          <div className="flex items-center gap-1 overflow-x-auto max-w-sm">
            <button
              onClick={() => setSelectedPageNum('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedPageNum === 'all'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200'
              }`}
            >
              All ({currentDoc.totalPages})
            </button>
            {currentDoc.pages.map((p) => (
              <button
                key={p.pageNumber}
                onClick={() => setSelectedPageNum(p.pageNumber)}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                  selectedPageNum === p.pageNumber
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200'
                }`}
                title={`Page ${p.pageNumber} • ${p.ocrApplied ? 'OCR Applied' : 'Text Layer'}`}
              >
                <span>p.{p.pageNumber}</span>
                {p.ocrApplied && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Slide merger toggle */}
          <button
            onClick={() => toggleSlideMerge(currentDoc.id)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
            title="Merges fragmented bullet lines from lecture slides into complete sentences"
          >
            {currentDoc.slideMergeApplied ? (
              <ToggleRight className="w-4 h-4 text-emerald-600" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-neutral-400" />
            )}
            <span>Slide Line Merger: {currentDoc.slideMergeApplied ? 'ON' : 'OFF'}</span>
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>
        </div>
      </div>

      {/* Text Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 min-h-0">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-500 pb-2 border-b border-neutral-200 dark:border-neutral-800">
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
              {selectedPageNum === 'all'
                ? `Full Document Text (${currentDoc.pages.reduce((acc, p) => acc + p.wordCount, 0)} words)`
                : `Page ${selectedPageNum}`}
            </span>
            <div className="flex items-center gap-2">
              {currentDoc.pages.some((p) => p.ocrApplied) && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 text-[11px] font-semibold border border-amber-200 dark:border-amber-800">
                  <ScanText className="w-3 h-3" />
                  Contains OCR text
                </span>
              )}
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 shadow-xs border border-neutral-200 dark:border-neutral-800">
            <pre className="font-sans text-xs md:text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed">
              {displayText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
