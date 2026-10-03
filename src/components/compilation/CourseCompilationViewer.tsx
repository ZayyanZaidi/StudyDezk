import React, { useState } from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import { CompilationPreset, DocumentCompilationConfig } from '../../types/compilation';
import { InlineFigure } from '../figures/InlineFigure';
import {
  openPrintableCourseCompilationWindow,
  downloadCourseCompilationMarkdown,
  downloadCourseCompilationHtml,
} from '../../logic/compilation/compilationExporter';
import {
  BookOpen,
  Sparkles,
  Printer,
  Download,
  RefreshCw,
  Clock,
  FileText,
  Bookmark,
  Layers,
  Edit3,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Info,
} from 'lucide-react';

export const CourseCompilationViewer: React.FC = () => {
  const {
    activeCompilation,
    coursePreset,
    courseRequirement,
    setCoursePreset,
    setCourseRequirement,
    recompileCourseCompilation,
    updateDocumentConfig,
    moveDocumentOrder,
    saveManualSectionEdit,
    activeWorkspaceId,
    workspaces,
    documents,
    extractedFigures,
    updateFigureStatus,
    reCropFigure,
    deleteFigure,
    duplicateWarning,
    dismissDuplicateWarning,
  } = useStudyStore();

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [editingSummary, setEditingSummary] = useState('');
  const [isRecompiling, setIsRecompiling] = useState(false);
  const [tempRequirement, setTempRequirement] = useState(courseRequirement || '');

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const wsDocs = documents.filter((d) => d.workspaceId === activeWorkspaceId);

  const handleManualEditStart = (secId: string, currentNotes?: string, currentSummary?: string) => {
    setEditingSectionId(secId);
    setEditingNotes(currentNotes || '');
    setEditingSummary(currentSummary || '');
  };

  const handleManualEditSave = async (secId: string, docId: string) => {
    await saveManualSectionEdit(secId, docId, {
      userNotes: editingNotes.trim() || undefined,
      customSummary: editingSummary.trim() || undefined,
    });
    setEditingSectionId(null);
  };

  const handleRecompileAll = async () => {
    setIsRecompiling(true);
    try {
      await recompileCourseCompilation(activeWorkspaceId);
    } finally {
      setIsRecompiling(false);
    }
  };

  const handleRequirementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await setCourseRequirement(tempRequirement.trim());
  };

  const presets: Array<{ id: CompilationPreset; label: string; desc: string }> = [
    { id: 'brief', label: 'Brief (~20%)', desc: 'Core bullet points & essentials' },
    { id: 'standard', label: 'Standard (~35%)', desc: 'Balanced conceptual coverage' },
    { id: 'detailed', label: 'Detailed (~50%)', desc: 'In-depth explanations & nuances' },
    { id: 'exam', label: 'Exam Focus (~40%)', desc: 'Definitions, rules, and distinction points' },
  ];

  if (!activeCompilation || activeCompilation.sections.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-black">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-neutral-900 dark:text-white">
          No Course Compilation Generated
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mt-1">
          Upload lecture slides, notes, or PDFs for {activeWs?.name || 'this course'}. An integrated compilation with inline figures, deduplicated concepts, and anchors will be generated automatically.
        </p>
        <button
          onClick={handleRecompileAll}
          disabled={isRecompiling}
          className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-xs font-bold text-white dark:text-black transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRecompiling ? 'animate-spin' : ''}`} />
          <span>Recompile Compilation</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-50/50 dark:bg-black">
      {/* Duplicate upload warning alert */}
      {duplicateWarning && (
        <div className="px-6 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{duplicateWarning.message}</span>
          </div>
          <button
            onClick={dismissDuplicateWarning}
            className="text-[11px] font-bold text-amber-900 dark:text-amber-300 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Compilation Controls Bar */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Course Compilation
              </span>
              <span className="text-xs text-neutral-400">
                {activeCompilation.stats.includedDocuments} of {activeCompilation.stats.totalDocuments} document(s) included
              </span>
              <span className="text-xs text-neutral-400">•</span>
              <span className="text-xs text-neutral-400">
                {activeCompilation.stats.wordCount.toLocaleString()} words (~{activeCompilation.stats.readingTimeMinutes} min)
              </span>
              <span className="text-xs text-neutral-400">•</span>
              <span className="text-xs text-neutral-400">
                {activeCompilation.stats.totalFigures} figure(s)
              </span>
            </div>
            <h1 className="text-lg font-bold font-serif text-neutral-900 dark:text-white mt-1">
              {activeCompilation.title}
            </h1>
          </div>

          {/* Action buttons: Recompile, Printable HTML, Markdown */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRecompileAll}
              disabled={isRecompiling}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-850 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition cursor-pointer"
              title="Recompile unified compilation from cache"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRecompiling ? 'animate-spin' : ''}`} />
              <span>Recompile All</span>
            </button>

            <button
              onClick={() => openPrintableCourseCompilationWindow(activeCompilation)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-xs font-bold text-white dark:text-black transition cursor-pointer"
              title="Open standalone printable HTML page with figures"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={() => downloadCourseCompilationMarkdown(activeCompilation)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition cursor-pointer"
              title="Download standalone Markdown compilation"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Markdown</span>
            </button>
          </div>
        </div>

        {/* Preset Selector & Requirement Input */}
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-850 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mr-1">Preset:</span>
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => setCoursePreset(p.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  coursePreset === p.id
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                    : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
                title={p.desc}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Requirement Focus text */}
          <form onSubmit={handleRequirementSubmit} className="flex items-center gap-1.5">
            <input
              type="text"
              value={tempRequirement}
              onChange={(e) => setTempRequirement(e.target.value)}
              placeholder="Requirement / Topic Focus (e.g. attack types, testing pyramid)..."
              className="w-64 px-2.5 py-1 rounded-md text-xs border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 transition cursor-pointer"
            >
              Apply
            </button>
          </form>
        </div>

        {/* Last updated timestamp indicator */}
        <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last compiled: {new Date(activeCompilation.lastUpdated).toLocaleTimeString()} ({new Date(activeCompilation.lastUpdated).toLocaleDateString()})
          </span>
          <span>Incremental cache enabled • Recompiles without re-reading files</span>
        </div>
      </div>

      {/* Main 2-Column Layout: Sticky TOC Navigation on Left, Continuous Document on Right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sticky Table of Contents & Document Reorder Controls */}
        <aside className="w-72 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-950/40 flex flex-col h-full overflow-hidden">
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-900/60 flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
              Table of Contents
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">
              {activeCompilation.toc.length} anchors
            </span>
          </div>

          {/* Anchor Links */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs">
            {activeCompilation.toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.anchorId}`}
                className={`block py-1 px-2 rounded-lg transition hover:bg-neutral-100 dark:hover:bg-neutral-900 truncate ${
                  item.level === 1
                    ? 'font-bold text-neutral-900 dark:text-white mt-1.5'
                    : 'ml-3 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
                title={item.heading}
              >
                {item.level === 2 && <span className="text-neutral-400 mr-1">•</span>}
                {item.heading}
              </a>
            ))}

            {/* Jump to Glossary */}
            {activeCompilation.mergedGlossary.length > 0 && (
              <a
                href="#course-glossary"
                className="block py-1 px-2 rounded-lg font-bold text-indigo-600 dark:text-indigo-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 mt-2 truncate"
              >
                Course Glossary ({activeCompilation.mergedGlossary.length})
              </a>
            )}

            {/* Jump to Flashcards */}
            {activeCompilation.mergedFlashcards.length > 0 && (
              <a
                href="#course-flashcards"
                className="block py-1 px-2 rounded-lg font-bold text-emerald-600 dark:text-emerald-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 truncate"
              >
                Course Flashcards ({activeCompilation.mergedFlashcards.length})
              </a>
            )}
          </div>

          {/* Document Sequence & Controls Box */}
          <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 text-xs">
            <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
              Source Sequence & Controls
            </h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {wsDocs.map((doc, idx) => {
                const cfg = activeCompilation.documentConfigs[doc.id] || {
                  documentId: doc.id,
                  order: idx + 1,
                  included: true,
                };
                return (
                  <div
                    key={doc.id}
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black flex items-center justify-between gap-1 text-[11px]"
                  >
                    <span className="font-mono text-neutral-400 w-4">{cfg.order}.</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate flex-1" title={doc.title}>
                      {doc.title}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {/* Move Up */}
                      <button
                        onClick={() => moveDocumentOrder(doc.id, 'up')}
                        disabled={idx === 0}
                        className="p-0.5 rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move Earlier in Compilation"
                      >
                        <MoveUp className="w-3 h-3" />
                      </button>
                      {/* Move Down */}
                      <button
                        onClick={() => moveDocumentOrder(doc.id, 'down')}
                        disabled={idx === wsDocs.length - 1}
                        className="p-0.5 rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move Later in Compilation"
                      >
                        <MoveDown className="w-3 h-3" />
                      </button>
                      {/* Toggle Included */}
                      <button
                        onClick={() => updateDocumentConfig(doc.id, { included: !cfg.included })}
                        className={`p-0.5 rounded cursor-pointer ${
                          cfg.included
                            ? 'text-indigo-600 hover:text-indigo-800'
                            : 'text-neutral-300 hover:text-neutral-500'
                        }`}
                        title={cfg.included ? 'Included in compilation' : 'Excluded from compilation'}
                      >
                        {cfg.included ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Continuous Compilation Content (Scrollable) */}
        <main className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scroll-smooth">
          {activeCompilation.sections.map((section, sIdx) => {
            const isEditing = editingSectionId === section.id;
            const isDocStart =
              sIdx === 0 || activeCompilation.sections[sIdx - 1]?.documentId !== section.documentId;

            return (
              <section
                key={section.id}
                id={section.anchorId}
                className="max-w-4xl mx-auto scroll-mt-6"
              >
                {/* Document Header Divider when transitioning to new document */}
                {isDocStart && (
                  <div
                    id={`doc-${section.documentId}`}
                    className="pt-6 pb-3 mb-6 border-b-2 border-indigo-600 dark:border-indigo-500 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
                        Source Document
                      </span>
                      <h2 className="text-xl font-bold font-serif text-neutral-900 dark:text-white">
                        {section.documentTitle}
                      </h2>
                    </div>
                    <span className="text-xs text-neutral-400">Page {section.pageNumber}</span>
                  </div>
                )}

                {/* Section Heading & Edit Controls */}
                <div className="group flex items-center justify-between border-b border-neutral-100 dark:border-neutral-850 pb-1.5 mb-3">
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <span>{section.heading}</span>
                    <span className="text-[11px] font-normal text-neutral-400">(p. {section.pageNumber})</span>
                  </h3>

                  {/* Manual Edit Button */}
                  {!isEditing && (
                    <button
                      onClick={() =>
                        handleManualEditStart(
                          section.id,
                          section.userNotes,
                          section.userSummaryOverride
                        )
                      }
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
                      title="Edit this section's summary or add study notes"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit Notes</span>
                    </button>
                  )}
                </div>

                {/* Cross-document deduplication badges */}
                {section.crossReferences && section.crossReferences.length > 0 && (
                  <div className="mb-3 px-3 py-1.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Cross-reference: Deduplicated point ({section.crossReferences.join(', ')})</span>
                  </div>
                )}

                {/* Section Summary Content or Inline Manual Editor */}
                {isEditing ? (
                  <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3 mb-4">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                        Custom Summary Rewrite (Optional):
                      </label>
                      <textarea
                        value={editingSummary}
                        onChange={(e) => setEditingSummary(e.target.value)}
                        placeholder="Override this section's generated summary text..."
                        rows={4}
                        className="w-full p-2.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                        Personal Study Notes:
                      </label>
                      <textarea
                        value={editingNotes}
                        onChange={(e) => setEditingNotes(e.target.value)}
                        placeholder="Add personal exam notes or reflections for this section..."
                        rows={2}
                        className="w-full p-2.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingSectionId(null)}
                        className="px-3 py-1 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleManualEditSave(section.id, section.documentId)}
                        className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Save Edits</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-neutral-800 dark:text-neutral-200 text-sm leading-relaxed">
                    {section.userSummaryOverride ? (
                      <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20">
                        <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 block mb-1">
                          Manual Summary Override:
                        </span>
                        <p className="whitespace-pre-line">{section.userSummaryOverride}</p>
                      </div>
                    ) : (
                      section.paragraphs.map((para, pIdx) => (
                        <p key={pIdx} className="leading-relaxed">
                          {para}
                        </p>
                      ))
                    )}

                    {/* User Study Notes Display */}
                    {section.userNotes && (
                      <div className="mt-2 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/30 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
                        <Bookmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-semibold mb-0.5">Study Note:</strong>
                          <p className="whitespace-pre-line">{section.userNotes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Inline Figures for this section */}
                {section.figures.length > 0 && (
                  <div className="mt-4 space-y-4">
                    {section.figures.map((fig) => (
                      <InlineFigure
                        key={fig.id}
                        figure={fig}
                        onUpdateStatus={updateFigureStatus}
                        onReCrop={reCropFigure}
                        onDelete={deleteFigure}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          {/* Unified Course Glossary Section */}
          {activeCompilation.mergedGlossary.length > 0 && (
            <section
              id="course-glossary"
              className="max-w-4xl mx-auto pt-10 border-t-2 border-neutral-200 dark:border-neutral-800 scroll-mt-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-xl font-bold font-serif text-neutral-900 dark:text-white">
                  Unified Course Glossary
                </h2>
                <span className="text-xs text-neutral-400">
                  ({activeCompilation.mergedGlossary.length} deduplicated terms)
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeCompilation.mergedGlossary.map((g) => (
                  <div
                    key={g.id}
                    className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-xs text-neutral-900 dark:text-white">{g.term}</span>
                      {g.isAcronym && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 font-mono font-semibold">
                          ACRONYM
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-snug">{g.definition}</p>
                    <span className="text-[10px] text-neutral-400 mt-2 block font-medium">Source: {g.documentTitle}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Unified Course Flashcards Section */}
          {activeCompilation.mergedFlashcards.length > 0 && (
            <section
              id="course-flashcards"
              className="max-w-4xl mx-auto pt-10 pb-16 border-t-2 border-neutral-200 dark:border-neutral-800 scroll-mt-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-xl font-bold font-serif text-neutral-900 dark:text-white">
                  Unified Course Flashcard Deck
                </h2>
                <span className="text-xs text-neutral-400">
                  ({activeCompilation.mergedFlashcards.length} deduplicated cards)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {activeCompilation.mergedFlashcards.slice(0, 12).map((card) => (
                  <div
                    key={card.id}
                    className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                        Question
                      </span>
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white mb-2">{card.front}</p>
                    </div>
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-850">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-0.5">
                        Answer
                      </span>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-3">{card.back}</p>
                    </div>
                  </div>
                ))}
              </div>
              {activeCompilation.mergedFlashcards.length > 12 && (
                <p className="text-xs text-neutral-400 text-center mt-3">
                  + {activeCompilation.mergedFlashcards.length - 12} more cards in study mode.
                </p>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
};
