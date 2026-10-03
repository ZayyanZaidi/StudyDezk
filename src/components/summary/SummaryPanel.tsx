import React, { useState, useEffect, useMemo } from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import { defaultSummarizer, SummaryResult, SummarizeOptions } from '../../logic/summarizer';
import { workerManager } from '../../workers/workerManager';
import { SessionHistoryView } from './SessionHistoryView';
import { SummarySession } from '../../types/session';
import {
  AlignLeft,
  List,
  Sparkles,
  Copy,
  Check,
  Download,
  Clock,
  BarChart3,
  RefreshCw,
  History,
  FileText,
  Star,
  CheckCircle2,
  Info,
} from 'lucide-react';

export const SummaryPanel: React.FC = () => {
  const { activeDocumentId, documents, diagrams, saveSummarySession, sessionHistories, activeWorkspaceId } = useStudyStore();
  const currentDoc = documents.find((d) => d.id === activeDocumentId);

  // Controls state - User does NOT control content limits; auto-coverage is always active
  const [outputStyle, setOutputStyle] = useState<'paragraph' | 'bullets'>('bullets');
  const [filterMode, setFilterMode] = useState<'all' | 'highlights'>('all');
  const [requirement, setRequirement] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showHistoryView, setShowHistoryView] = useState(false);

  // Workspace-filtered sessions count
  const wsSessionsCount = sessionHistories.filter(
    (s) => s.workspaceId === activeWorkspaceId && (!currentDoc || s.documentId === currentDoc.id)
  ).length;

  // Suggestions based on course
  const requirementSuggestions = useMemo(() => {
    if (!currentDoc) return [];
    if (currentDoc.course === 'Information Security') {
      return ['focus on attack types & threats', 'focus on encryption and CIA triad', 'focus on authentication and access control'];
    }
    if (currentDoc.course === 'Cloud Computing') {
      return ['focus on IaaS, PaaS, and SaaS', 'focus on elasticity and multi-tenancy', 'focus on SLAs and availability'];
    }
    if (currentDoc.course === 'Mobile App Development') {
      return ['focus on MVVM architecture', 'focus on activity lifecycle', 'focus on token security and REST API'];
    }
    if (currentDoc.course === 'Software Testing Strategies') {
      return ['focus on TDD cycle', 'focus on verification vs validation', 'focus on unit vs integration testing'];
    }
    return ['focus on primary definitions', 'focus on key operational principles'];
  }, [currentDoc]);

  // Run summarization covering all content while highlighting key points
  const handleGenerateSummary = async (autoSave = true) => {
    if (!currentDoc) return;
    setIsSummarizing(true);

    try {
      const textToSummarize = currentDoc.processedText || currentDoc.fullText;

      let requirementEmbedding: number[] | undefined;
      if (requirement.trim()) {
        try {
          requirementEmbedding = await workerManager.getEmbedding(requirement.trim());
        } catch (err) {
          console.warn('Embedding boost deferred to token overlap:', err);
        }
      }

      const options: SummarizeOptions = {
        lengthMode: 'auto', // Automatically covers all content sections
        outputStyle,
        requirement: requirement.trim() || undefined,
        requirementWeight: 0.65,
        requirementEmbedding,
      };

      const result = await defaultSummarizer.summarize(textToSummarize, options);
      setSummaryResult(result);

      if (autoSave && result.text) {
        await saveSummarySession({
          documentId: currentDoc.id,
          documentTitle: currentDoc.title,
          fileName: currentDoc.fileName,
          title: requirement.trim()
            ? `Focus: ${requirement.trim()}`
            : `Key Points: ${currentDoc.title}`,
          requirement: requirement.trim() || undefined,
          options,
          result,
          diagrams: diagrams.filter((d) => d.documentId === currentDoc.id),
        });
      }
    } catch (err) {
      console.error('Summarization failed:', err);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Restore past session
  const handleRestoreSession = (session: SummarySession) => {
    setOutputStyle(session.options.outputStyle || 'bullets');
    setRequirement(session.requirement || '');
    setSummaryResult(session.result);
    setShowHistoryView(false);
  };

  // Auto-generate initial summary when active document changes
  useEffect(() => {
    if (currentDoc) {
      handleGenerateSummary(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDoc?.id]);

  const handleCopy = () => {
    if (!summaryResult) return;
    navigator.clipboard.writeText(summaryResult.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!summaryResult || !currentDoc) return;
    const content = `# Key Points Summary: ${currentDoc.title}\n\n**File:** ${currentDoc.fileName}\n**Course:** ${currentDoc.course}\n**Requirement:** ${requirement || 'Comprehensive coverage'}\n\n${summaryResult.text}\n\n---\n*Extractive Key Points generated by StudyDezk*`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDoc.title.replace(/\s+/g, '_')}_key_points.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!currentDoc) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-neutral-400">
        Select a document from the sidebar to view summaries.
      </div>
    );
  }

  if (showHistoryView) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-neutral-50 dark:bg-black">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              Workspace Summary Sessions
            </span>
          </div>
          <button
            onClick={() => setShowHistoryView(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Back to Active Summary</span>
          </button>
        </div>
        <SessionHistoryView onRestoreSession={handleRestoreSession} />
      </div>
    );
  }

  // Filter sentences if user chose "Primary Highlights Only"
  const displayedSentences = summaryResult?.selectedSentences.filter((s) => {
    if (filterMode === 'highlights') {
      return s.isKeyPoint;
    }
    return true;
  }) || [];

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 w-full">
      {/* Controls Column */}
      <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-neutral-800 p-4 sm:p-5 lg:p-6 overflow-y-auto bg-neutral-50/60 dark:bg-neutral-950 space-y-5 shrink-0 max-h-[42vh] lg:max-h-full min-h-0">
        <div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            Key Points &amp; Salience
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Automated comprehensive coverage across all sections.
          </p>
        </div>

        {/* Auto Coverage Guarantee Card (No user limit sliders) */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 dark:text-white">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Auto-Covering All Sections</span>
          </div>
          <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
            StudyDezk partitions the lecture notes and preserves core insights from every single section, eliminating filler without manual length limits.
          </p>
        </div>

        {/* Output Style */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
            Output Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOutputStyle('bullets')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                outputStyle === 'bullets'
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:bg-white dark:text-black dark:border-white'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Key Bullets</span>
            </button>
            <button
              onClick={() => setOutputStyle('paragraph')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                outputStyle === 'paragraph'
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:bg-white dark:text-black dark:border-white'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <AlignLeft className="w-4 h-4" />
              <span>Paragraph</span>
            </button>
          </div>
        </div>

        {/* Free-text Requirement Focus */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Semantic Focus (Optional)
            </label>
            {requirement && (
              <button
                onClick={() => setRequirement('')}
                className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                Clear
              </button>
            )}
          </div>
          <input
            type="text"
            placeholder="e.g. focus on attack types, TDD cycle..."
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
          />

          {/* Quick suggestion tags */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {requirementSuggestions.map((sug) => (
              <button
                key={sug}
                onClick={() => setRequirement(sug)}
                className="text-[10px] px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        {/* Generate / Refresh Button */}
        <button
          onClick={() => handleGenerateSummary(true)}
          disabled={isSummarizing}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-bold shadow-xs hover:opacity-90 disabled:opacity-60 transition active:scale-98 cursor-pointer"
        >
          {isSummarizing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing All Sections...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Synthesize Key Points</span>
            </>
          )}
        </button>
      </div>

      {/* Summary Output Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-white dark:bg-black">
        {/* Output Header with Stats and Filters */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-black shrink-0">
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
            {summaryResult && (
              <>
                <span className="flex items-center gap-1 font-semibold text-neutral-900 dark:text-neutral-100">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                  {summaryResult.summarySentenceCount} Key Points Extracted
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  ~{summaryResult.readingTimeMinutes} min read
                </span>
                <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-[10px] font-semibold border border-neutral-200 dark:border-neutral-800">
                  Full Document Covered
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Highlights filter toggle */}
            <div className="flex items-center p-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
                }`}
              >
                All Sections
              </button>
              <button
                onClick={() => setFilterMode('highlights')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                  filterMode === 'highlights'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
                }`}
              >
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>Highlights</span>
              </button>
            </div>

            <button
              onClick={() => setShowHistoryView(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              title="View all saved summary sessions for this workspace"
            >
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">History</span>
              {wsSessionsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold">
                  {wsSessionsCount}
                </span>
              )}
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition cursor-pointer"
              title="Copy summary text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition cursor-pointer"
              title="Export as Markdown"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Text / Bullets Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 min-h-0">
          {summaryResult ? (
            <div className="max-w-3xl space-y-4">
              {outputStyle === 'bullets' ? (
                <ul className="space-y-3">
                  {displayedSentences.map((item, idx) => (
                    <li
                      key={idx}
                      className={`p-4 rounded-2xl border transition ${
                        item.isKeyPoint
                          ? 'border-neutral-300 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-900/60 shadow-2xs'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-neutral-900 dark:text-neutral-100 leading-relaxed">
                            {item.sentence}
                          </p>

                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            {item.isKeyPoint && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                Key Point
                              </span>
                            )}
                            {requirement && item.requirementScore > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-900">
                                Focus Match: {Math.round(item.requirementScore * 100)}%
                              </span>
                            )}
                            <span className="text-[10px] text-neutral-400">
                              Salience: {Math.round(item.textRankScore * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-4 leading-relaxed text-sm text-neutral-900 dark:text-neutral-100 font-normal">
                  <p className="leading-7 whitespace-pre-line">
                    {filterMode === 'highlights'
                      ? displayedSentences.map((s) => s.sentence).join(' ')
                      : summaryResult.text}
                  </p>

                  {requirement && (
                    <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>
                        Sentences elevated by focus requirement: <em>&ldquo;{requirement}&rdquo;</em>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center text-neutral-400 text-xs">
              Synthesizing key points across document sections...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

