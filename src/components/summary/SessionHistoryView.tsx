import React, { useState, useEffect } from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import { SummarySession } from '../../types/session';
import { renderMermaidSvg } from '../../logic/diagrams/renderer';
import {
  History,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  ArrowUpRight,
  Clock,
  Sliders,
  Copy,
  FileText,
  GitFork,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SessionHistoryViewProps {
  onRestoreSession?: (session: SummarySession) => void;
}

export const SessionHistoryView: React.FC<SessionHistoryViewProps> = ({ onRestoreSession }) => {
  const { sessionHistories, activeWorkspaceId, renameSummarySession, deleteSummarySession, theme } = useStudyStore();

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedDiagramsSessionId, setExpandedDiagramsSessionId] = useState<string | null>(null);
  const [selectedDiagramIdx, setSelectedDiagramIdx] = useState<number>(0);
  const [renderedSvg, setRenderedSvg] = useState<string>('');

  // Filter sessions for active workspace
  const workspaceSessions = sessionHistories.filter(
    (s) => s.workspaceId === activeWorkspaceId
  );

  const filtered = workspaceSessions.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.documentTitle.toLowerCase().includes(q) ||
      (s.fileName && s.fileName.toLowerCase().includes(q)) ||
      (s.requirement && s.requirement.toLowerCase().includes(q)) ||
      s.result.text.toLowerCase().includes(q)
    );
  });

  const handleStartRename = (s: SummarySession) => {
    setEditingId(s.id);
    setEditTitle(s.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      renameSummarySession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Render diagram SVG for expanded session
  const activeSessionWithDiagrams = sessionHistories.find((s) => s.id === expandedDiagramsSessionId);
  const activeDiagram = activeSessionWithDiagrams?.diagrams?.[selectedDiagramIdx];

  useEffect(() => {
    let isCancelled = false;
    async function loadSvg() {
      if (!activeDiagram) {
        setRenderedSvg('');
        return;
      }
      try {
        const isDark =
          theme === 'dark' ||
          (theme === 'system' &&
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-color-scheme: dark)').matches) ||
          (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

        const svg = await renderMermaidSvg(activeDiagram.type, activeDiagram.mermaidCode, isDark);
        if (!isCancelled) {
          setRenderedSvg(svg);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Failed to render session diagram:', err);
          setRenderedSvg('');
        }
      }
    }
    loadSvg();
    return () => {
      isCancelled = true;
    };
  }, [activeDiagram, theme]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-white dark:bg-black p-4 sm:p-6 lg:p-8">
      {/* Header and Search */}
      <div className="max-w-4xl mx-auto w-full space-y-4 mb-6 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-neutral-900 dark:text-neutral-100" />
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Saved Summary Sessions
            </h3>
          </div>
          <span className="text-xs text-neutral-500 font-medium">
            {filtered.length} saved sessions
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search saved summaries, original file names, or focus prompts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 shadow-2xs"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full space-y-3 min-h-0">
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-neutral-400 text-xs space-y-2">
            <History className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-700" />
            <p className="font-semibold text-neutral-700 dark:text-neutral-300">No summary sessions yet in this workspace</p>
            <p className="text-[11px] text-neutral-500">
              Summaries and diagrams are automatically saved here with original file names for context.
            </p>
          </div>
        ) : (
          filtered.map((session) => (
            <div
              key={session.id}
              className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 space-y-3 hover:border-neutral-300 dark:hover:border-neutral-700 transition"
            >
              {/* Session Top Bar */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {editingId === session.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="px-2 py-1 text-xs font-bold border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none w-full"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveRename(session.id)}
                        className="p-1 rounded-md bg-neutral-900 dark:bg-white text-white dark:text-black hover:opacity-90 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                        {session.title}
                      </h4>
                      <button
                        onClick={() => handleStartRename(session)}
                        className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded transition cursor-pointer"
                        title="Rename summary session"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                    {/* File Name context */}
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-neutral-500" />
                      {session.fileName || session.documentTitle}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(session.createdAt).toLocaleDateString()} {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopy(session.id, session.result.text)}
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition cursor-pointer"
                    title="Copy summary text"
                  >
                    {copiedId === session.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {onRestoreSession && (
                    <button
                      onClick={() => onRestoreSession(session)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black text-xs font-bold transition cursor-pointer"
                      title="Restore session to workspace view"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                  )}

                  <button
                    onClick={() => deleteSummarySession(session.id)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Requirement badge, diagram toggle & settings */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                {session.requirement && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Focus: &ldquo;{session.requirement}&rdquo;
                  </span>
                )}

                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 font-medium border border-neutral-200 dark:border-neutral-800">
                  <Sliders className="w-3 h-3 text-neutral-500" />
                  Auto-Covered • {session.options.outputStyle}
                </span>

                <span className="text-neutral-500">
                  {session.result.wordCount} words (~{session.result.readingTimeMinutes} min)
                </span>

                {/* Diagrams toggle if session has diagrams saved */}
                {session.diagrams && session.diagrams.length > 0 && (
                  <button
                    onClick={() => {
                      if (expandedDiagramsSessionId === session.id) {
                        setExpandedDiagramsSessionId(null);
                      } else {
                        setExpandedDiagramsSessionId(session.id);
                        setSelectedDiagramIdx(0);
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                  >
                    <GitFork className="w-3 h-3 text-neutral-500" />
                    <span>Diagrams ({session.diagrams.length})</span>
                    {expandedDiagramsSessionId === session.id ? (
                      <ChevronUp className="w-3 h-3 ml-0.5" />
                    ) : (
                      <ChevronDown className="w-3 h-3 ml-0.5" />
                    )}
                  </button>
                )}
              </div>

              {/* Inline Diagrams Accordion */}
              {expandedDiagramsSessionId === session.id && session.diagrams && session.diagrams.length > 0 && (
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
                  <div className="flex items-center gap-1.5 border-b border-neutral-100 dark:border-neutral-800 pb-2">
                    {session.diagrams.map((d, dIdx) => (
                      <button
                        key={d.id || dIdx}
                        onClick={() => setSelectedDiagramIdx(dIdx)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer capitalize ${
                          selectedDiagramIdx === dIdx
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        {d.type.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-center p-3 overflow-x-auto min-h-[160px] bg-neutral-50 dark:bg-black rounded-lg">
                    {renderedSvg ? (
                      <div
                        className="w-full flex items-center justify-center overflow-auto"
                        dangerouslySetInnerHTML={{ __html: renderedSvg }}
                      />
                    ) : (
                      <pre className="text-[11px] font-mono text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                        {activeDiagram?.mermaidCode}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {/* Summary Snippet */}
              <p className="text-xs text-neutral-800 dark:text-neutral-200 line-clamp-3 leading-relaxed border-t border-neutral-200 dark:border-neutral-800 pt-2 font-normal">
                {session.result.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
