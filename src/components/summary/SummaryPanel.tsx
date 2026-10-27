import React, { useState, useEffect, useMemo } from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import { useAuthStore } from '../../store/useAuthStore';
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
  BookOpen,
  Layers,
  ChevronDown,
  ChevronRight,
  TrendingDown,
  CheckSquare,
  Square,
  FileCode,
} from 'lucide-react';

export const SummaryPanel: React.FC = () => {
  const {
    activeDocumentId,
    documents,
    diagrams,
    saveSummarySession,
    sessionHistories,
    activeWorkspaceId,
  } = useStudyStore();
  const { settings } = useAuthStore();
  const currentDoc = documents.find(
    (d) => d.id === activeDocumentId && d.workspaceId === activeWorkspaceId
  );

  // Representation view: 'structured' | 'bullets' | 'paragraph' | 'tldr'
  const [viewMode, setViewMode] = useState<'structured' | 'bullets' | 'paragraph' | 'tldr'>(
    settings.defaultSummaryStyle || 'structured'
  );
  const [filterMode, setFilterMode] = useState<'all' | 'highlights'>('all');
  const [requirement, setRequirement] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showHistoryView, setShowHistoryView] = useState(false);
  const [understoodIndices, setUnderstoodIndices] = useState<Set<number>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Workspace-filtered sessions count
  const wsSessionsCount = sessionHistories.filter(
    (s) => s.workspaceId === activeWorkspaceId && (!currentDoc || s.documentId === currentDoc.id)
  ).length;

  // Suggestions based on course
  const requirementSuggestions = useMemo(() => {
    if (!currentDoc) return [];
    const course = currentDoc.course.toLowerCase();
    if (course.includes('security')) {
      return ['focus on attack types & threats', 'focus on encryption and CIA triad', 'focus on authentication'];
    }
    if (course.includes('cloud')) {
      return ['focus on IaaS, PaaS, and SaaS', 'focus on elasticity and multi-tenancy', 'focus on SLAs'];
    }
    if (course.includes('mobile')) {
      return ['focus on MVVM architecture', 'focus on component lifecycles', 'focus on API token security'];
    }
    if (course.includes('testing')) {
      return ['focus on TDD cycle', 'focus on verification vs validation', 'focus on unit vs integration testing'];
    }
    return ['focus on primary definitions', 'focus on key architectural principles', 'focus on implementation steps'];
  }, [currentDoc]);

  // Run summarization
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
        lengthMode: 'auto',
        outputStyle: viewMode === 'paragraph' ? 'paragraph' : 'bullets',
        requirement: requirement.trim() || undefined,
        requirementWeight: 0.65,
        requirementEmbedding,
      };

      const result = await defaultSummarizer.summarize(textToSummarize, options);
      setSummaryResult(result);
      setUnderstoodIndices(new Set());

      if (autoSave && result.text) {
        await saveSummarySession({
          documentId: currentDoc.id,
          documentTitle: currentDoc.title,
          fileName: currentDoc.fileName,
          title: requirement.trim()
            ? `Focus: ${requirement.trim()}`
            : `Living Guide: ${currentDoc.title}`,
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
    setViewMode(session.options.outputStyle === 'paragraph' ? 'paragraph' : 'structured');
    setRequirement(session.requirement || '');
    setSummaryResult(session.result);
    setUnderstoodIndices(new Set());
    setShowHistoryView(false);
  };

  // Auto-generate initial summary when active document changes
  useEffect(() => {
    if (currentDoc) {
      handleGenerateSummary(false);
    } else {
      setSummaryResult(null);
      setRequirement('');
      setUnderstoodIndices(new Set());
      setCollapsedSections(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDoc?.id]);

  const toggleUnderstood = (idx: number) => {
    setUnderstoodIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const toggleSectionCollapse = (secId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(secId)) next.delete(secId);
      else next.add(secId);
      return next;
    });
  };

  const handleCopy = (format: 'markdown' | 'bullets' | 'text' = 'markdown') => {
    if (!summaryResult || !currentDoc) return;
    let contentToCopy = summaryResult.text;

    if (format === 'markdown') {
      const defsMd = (summaryResult.keyDefinitions || [])
        .map((d) => `### ${d.term}\n> ${d.definition}\n`)
        .join('\n');

      contentToCopy = `# ${currentDoc.title} — Living Study Guide\n\n**Executive Summary**\n${summaryResult.executiveSummary || summaryResult.text}\n\n${defsMd ? `## Key Definitions\n${defsMd}\n` : ''}## Study Points\n${summaryResult.bullets?.map((b) => `- ${b}`).join('\n') || summaryResult.text}`;
    }

    navigator.clipboard.writeText(contentToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!summaryResult || !currentDoc) return;
    const defsSection = (summaryResult.keyDefinitions || [])
      .map((d) => `### ${d.term}\n> ${d.definition}\n\n*Source: ${d.sourceSentence}*\n`)
      .join('\n');

    const content = `# Study Guide: ${currentDoc.title}
**Course:** ${currentDoc.course}
**Source File:** ${currentDoc.fileName}
**Generated:** ${new Date().toLocaleDateString()}
${requirement ? `**Focus Filter:** ${requirement}\n` : ''}

---

## 1. Executive Summary
${summaryResult.executiveSummary || 'Comprehensive lecture distillation.'}

${defsSection ? `## 2. Key Definitions & Primitives\n${defsSection}\n` : ''}

## 3. Core Synthesis
${summaryResult.bullets?.map((b, i) => `${i + 1}. ${b}`).join('\n\n') || summaryResult.text}

---
*Created with StudyDezk — 100% In-Browser Living Study Guide*`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDoc.title.replace(/\s+/g, '_')}_study_guide.md`;
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

  // Filter sentences if user chose "Highlights Only"
  const displayedSentences =
    summaryResult?.selectedSentences.filter((s) => {
      if (filterMode === 'highlights') {
        return s.isKeyPoint;
      }
      return true;
    }) || [];

  const totalPoints = displayedSentences.length;
  const understoodCount = displayedSentences.filter((s) => understoodIndices.has(s.originalIndex)).length;
  const understoodPercent = totalPoints > 0 ? Math.round((understoodCount / totalPoints) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 w-full">
      {/* Controls Sidebar */}
      <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-neutral-800 p-4 sm:p-5 overflow-y-auto bg-neutral-50/60 dark:bg-neutral-950 space-y-5 shrink-0 max-h-[42vh] lg:max-h-full min-h-0">
        <div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            Living Study Guide
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Automatic multi-representation lecture synthesis with coverage guarantee.
          </p>
        </div>

        {/* Representation Mode Switcher */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
            Representation View
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setViewMode('structured')}
              className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
                viewMode === 'structured'
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:bg-white dark:text-black dark:border-white shadow-2xs font-semibold'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Structured</span>
            </button>
            <button
              onClick={() => setViewMode('bullets')}
              className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
                viewMode === 'bullets'
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:bg-white dark:text-black dark:border-white shadow-2xs font-semibold'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Key Bullets</span>
            </button>
            <button
              onClick={() => setViewMode('paragraph')}
              className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
                viewMode === 'paragraph'
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:bg-white dark:text-black dark:border-white shadow-2xs font-semibold'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Prose Narrative</span>
            </button>
            <button
              onClick={() => setViewMode('tldr')}
              className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
                viewMode === 'tldr'
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:bg-white dark:text-black dark:border-white shadow-2xs font-semibold'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Definitions &amp; TL;DR</span>
            </button>
          </div>
        </div>

        {/* Free-text Semantic Focus Requirement */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Focus Requirement (Optional)
            </label>
            {requirement && (
              <button
                onClick={() => setRequirement('')}
                className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <input
            type="text"
            placeholder="e.g. focus on architectural layers, CIA triad..."
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
          />

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {requirementSuggestions.map((sug) => (
              <button
                key={sug}
                onClick={() => setRequirement(sug)}
                className="text-[10px] px-2 py-0.8 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        {/* Re-synthesize Button */}
        <button
          onClick={() => handleGenerateSummary(true)}
          disabled={isSummarizing}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-bold shadow-xs hover:opacity-90 disabled:opacity-60 transition active:scale-98 cursor-pointer"
        >
          {isSummarizing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing Document Sections...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Regenerate Summary</span>
            </>
          )}
        </button>

        {/* Compression & Efficiency Stat Card */}
        {summaryResult && (
          <div className="p-3.5 rounded-2xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400 font-semibold text-[11px] uppercase tracking-wider">
              <span>Compression Metrics</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                {Math.round((1 - summaryResult.compressionRatio) * 100)}% compressed
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800/80">
                <span className="text-neutral-500">Words Saved</span>
                <p className="font-bold text-neutral-900 dark:text-white mt-0.5">
                  {summaryResult.wordsSaved || 0} words
                </p>
              </div>
              <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800/80">
                <span className="text-neutral-500">Reading Time</span>
                <p className="font-bold text-neutral-900 dark:text-white mt-0.5">
                  ~{summaryResult.readingTimeMinutes} min <span className="text-[10px] text-neutral-400 line-through">({summaryResult.originalReadingTimeMinutes || 5} min)</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-white dark:bg-black">
        {/* Output Action Bar */}
        <div className="p-3.5 sm:p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-black shrink-0">
          {/* Understood Progress Bar */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                Understood: {understoodCount}/{totalPoints} ({understoodPercent}%)
              </span>
            </div>
            <div className="w-24 sm:w-32 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden hidden sm:block">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${understoodPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter mode */}
            <div className="flex items-center p-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode('highlights')}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                  filterMode === 'highlights'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
                }`}
              >
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>Stars</span>
              </button>
            </div>

            {/* Sessions history button */}
            <button
              onClick={() => setShowHistoryView(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              title="View past summary sessions"
            >
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Sessions</span>
              {wsSessionsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold">
                  {wsSessionsCount}
                </span>
              )}
            </button>

            {/* Copy button */}
            <button
              onClick={() => handleCopy('markdown')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition cursor-pointer"
              title="Copy living guide as Markdown"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Export download button */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-semibold shadow-2xs hover:opacity-90 transition cursor-pointer"
              title="Download formatted markdown study guide"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download MD</span>
            </button>
          </div>
        </div>

        {/* Content View Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-0">
          {summaryResult ? (
            <div className="max-w-3xl space-y-6">
              {/* Executive Summary Callout (Always visible across all modes for fast orienting) */}
              {summaryResult.executiveSummary && (
                <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/70 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-black text-[10px] font-bold uppercase tracking-wider">
                      Executive Summary
                    </span>
                    <span className="text-xs text-neutral-500 font-serif italic">
                      Core takeaway distillation
                    </span>
                  </div>
                  <p className="text-sm font-serif leading-relaxed text-neutral-800 dark:text-neutral-200">
                    {summaryResult.executiveSummary}
                  </p>
                </div>
              )}

              {/* Mode 1: STRUCTURED SECTIONS */}
              {viewMode === 'structured' && (
                <div className="space-y-6">
                  {/* Key Definitions Callout if present */}
                  {summaryResult.keyDefinitions && summaryResult.keyDefinitions.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                        Key Definitions &amp; Primitives ({summaryResult.keyDefinitions.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {summaryResult.keyDefinitions.map((def, dIdx) => (
                          <div
                            key={dIdx}
                            className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-1 shadow-2xs"
                          >
                            <span className="font-bold text-xs text-neutral-900 dark:text-white">
                              {def.term}
                            </span>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                              {def.definition}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section Groups */}
                  <div className="space-y-5">
                    {summaryResult.sectionGroups?.map((group) => {
                      const isCollapsed = collapsedSections.has(group.id);
                      const filteredGroupSentences = group.sentences.filter((s) => {
                        if (filterMode === 'highlights') return s.isKeyPoint;
                        return true;
                      });

                      if (filteredGroupSentences.length === 0) return null;

                      return (
                        <div
                          key={group.id}
                          className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-950"
                        >
                          <div
                            onClick={() => toggleSectionCollapse(group.id)}
                            className="p-3.5 bg-neutral-100/60 dark:bg-neutral-900/60 flex items-center justify-between cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
                          >
                            <div className="flex items-center gap-2">
                              {isCollapsed ? (
                                <ChevronRight className="w-4 h-4 text-neutral-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-neutral-400" />
                              )}
                              <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                                {group.title}
                              </h4>
                              <span className="text-[10px] text-neutral-400 font-mono">
                                ({filteredGroupSentences.length} points)
                              </span>
                            </div>
                          </div>

                          {!isCollapsed && (
                            <ul className="p-3 sm:p-4 space-y-2.5 divide-y divide-neutral-100 dark:divide-neutral-900">
                              {filteredGroupSentences.map((item, idx) => {
                                const isUnderstood = understoodIndices.has(item.originalIndex);
                                return (
                                  <li
                                    key={idx}
                                    className={`pt-2.5 first:pt-0 flex items-start gap-3 transition ${
                                      isUnderstood ? 'opacity-60' : 'opacity-100'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => toggleUnderstood(item.originalIndex)}
                                      className="mt-0.5 text-neutral-400 hover:text-emerald-600 transition cursor-pointer shrink-0"
                                      title={isUnderstood ? 'Mark as needs review' : 'Mark as understood'}
                                    >
                                      {isUnderstood ? (
                                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                                      ) : (
                                        <Square className="w-4 h-4" />
                                      )}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs sm:text-sm leading-relaxed text-neutral-900 dark:text-neutral-100 ${
                                        isUnderstood ? 'line-through text-neutral-500' : ''
                                      }`}>
                                        {item.sentence}
                                      </p>
                                      {item.isKeyPoint && (
                                        <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                          <Star className="w-2.5 h-2.5 fill-amber-500" />
                                          <span>High-yield takeaway</span>
                                        </div>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mode 2: KEY BULLETS */}
              {viewMode === 'bullets' && (
                <ul className="space-y-3">
                  {displayedSentences.map((item, idx) => {
                    const isUnderstood = understoodIndices.has(item.originalIndex);
                    return (
                      <li
                        key={idx}
                        className={`p-4 rounded-2xl border transition ${
                          isUnderstood
                            ? 'border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/20 dark:bg-emerald-950/10 opacity-75'
                            : item.isKeyPoint
                            ? 'border-neutral-300 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-900/60 shadow-2xs'
                            : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => toggleUnderstood(item.originalIndex)}
                            className="mt-0.5 text-neutral-400 hover:text-emerald-600 transition cursor-pointer shrink-0"
                            title={isUnderstood ? 'Mark as needs review' : 'Mark as understood'}
                          >
                            {isUnderstood ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>

                          <div className="flex-1">
                            <p className={`text-sm leading-relaxed text-neutral-900 dark:text-neutral-100 ${
                              isUnderstood ? 'line-through text-neutral-500' : ''
                            }`}>
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
                    );
                  })}
                </ul>
              )}

              {/* Mode 3: PROSE NARRATIVE */}
              {viewMode === 'paragraph' && (
                <div className="p-6 sm:p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-4 leading-relaxed text-sm text-neutral-900 dark:text-neutral-100 font-serif">
                  <p className="leading-7 whitespace-pre-line text-[15px]">
                    {filterMode === 'highlights'
                      ? displayedSentences.map((s) => s.sentence).join(' ')
                      : summaryResult.text}
                  </p>

                  {requirement && (
                    <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 font-sans flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>
                        Elevated by focus requirement: <em>&ldquo;{requirement}&rdquo;</em>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 4: TL;DR & DEFINITIONS */}
              {viewMode === 'tldr' && (
                <div className="space-y-6">
                  {/* High Yield Definition Cards */}
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-3">
                      Glossary &amp; Primitives
                    </h4>
                    {summaryResult.keyDefinitions && summaryResult.keyDefinitions.length > 0 ? (
                      <div className="space-y-2.5">
                        {summaryResult.keyDefinitions.map((d, i) => (
                          <div
                            key={i}
                            className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-1"
                          >
                            <h5 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-600" />
                              {d.term}
                            </h5>
                            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed pl-4">
                              {d.definition}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400">No explicit definitions detected.</p>
                    )}
                  </div>

                  {/* Top Takeaways */}
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-3">
                      Top 3 Critical Takeaways
                    </h4>
                    <div className="space-y-2.5">
                      {summaryResult.highlights?.slice(0, 3).map((hl, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/20 flex items-start gap-3"
                        >
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                          <p className="text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 font-medium leading-relaxed">
                            {hl}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
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
