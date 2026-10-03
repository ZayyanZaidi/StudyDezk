import React, { useState, useEffect, useRef } from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import { DiagramType } from '../../types/diagram';
import {
  renderMermaidSvg,
  exportDiagramAsSvg,
  exportDiagramAsPng,
} from '../../logic/diagrams/renderer';
import {
  GitFork,
  Workflow,
  Network,
  Download,
  Code2,
  Check,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export const DiagramViewer: React.FC = () => {
  const {
    activeDocumentId,
    documents,
    diagrams,
    activeDiagramType,
    setActiveDiagramType,
    updateDiagramMermaidCode,
    theme,
  } = useStudyStore();

  const currentDoc = documents.find((d) => d.id === activeDocumentId);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find diagrams for active document
  const currentDiagram = diagrams.find(
    (d) => d.documentId === activeDocumentId && d.type === activeDiagramType
  );

  const [svgContent, setSvgContent] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editorCode, setEditorCode] = useState('');
  const [isExportingPng, setIsExportingPng] = useState(false);

  useEffect(() => {
    if (currentDiagram) {
      setEditorCode(currentDiagram.mermaidCode);
    }
  }, [currentDiagram?.id, currentDiagram?.mermaidCode, activeDiagramType]);

  // Render SVG whenever code or theme changes
  useEffect(() => {
    let isCancelled = false;

    async function render() {
      if (!editorCode.trim()) {
        setSvgContent('');
        return;
      }

      try {
        setRenderError(null);
        const isDark =
          theme === 'dark' ||
          (theme === 'system' &&
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-color-scheme: dark)').matches) ||
          (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

        const svg = await renderMermaidSvg(activeDiagramType, editorCode, isDark);
        if (!isCancelled) {
          setSvgContent(svg);
        }
      } catch (err) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : 'Invalid Mermaid syntax';
          setRenderError(msg);
        }
      }
    }

    render();

    return () => {
      isCancelled = true;
    };
  }, [editorCode, activeDiagramType, theme]);

  const handleSaveCode = () => {
    if (currentDiagram) {
      updateDiagramMermaidCode(currentDiagram.id, editorCode);
    }
  };

  const handleExportSvg = () => {
    if (!svgContent) return;
    exportDiagramAsSvg(svgContent, `${currentDoc?.title || 'diagram'}_${activeDiagramType}.svg`);
  };

  const handleExportPng = async () => {
    const svgElem = containerRef.current?.querySelector('svg');
    if (!svgElem) return;

    try {
      setIsExportingPng(true);
      await exportDiagramAsPng(svgElem, `${currentDoc?.title || 'diagram'}_${activeDiagramType}.png`);
    } catch (err) {
      console.error('PNG export failed:', err);
    } finally {
      setIsExportingPng(false);
    }
  };

  const tabs: Array<{ type: DiagramType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { type: 'mindmap', label: 'Mind Map', icon: GitFork },
    { type: 'flowchart', label: 'Step Flowchart', icon: Workflow },
    { type: 'concept_graph', label: 'Concept Graph', icon: Network },
  ];

  if (!currentDoc) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
        Select a document from the sidebar to view diagrams.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-black">
      {/* Sub-header Navigation */}
      <div className="p-3.5 sm:p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Type tabs */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeDiagramType === tab.type;
            return (
              <button
                key={tab.type}
                onClick={() => setActiveDiagramType(tab.type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              isEditing
                ? 'border-neutral-900 bg-neutral-900 text-white dark:bg-white dark:text-black dark:border-white'
                : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Hide Editor' : 'Edit Source'}</span>
          </button>

          <button
            onClick={handleExportSvg}
            disabled={!svgContent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 transition cursor-pointer"
            title="Download vector SVG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>SVG</span>
          </button>

          <button
            onClick={handleExportPng}
            disabled={!svgContent || isExportingPng}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-xs font-semibold text-white dark:text-black shadow-xs disabled:opacity-50 transition cursor-pointer"
            title="Download high-res PNG image"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingPng ? 'Rasterizing...' : 'PNG'}</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Editor Drawer */}
        {isEditing && (
          <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-900 text-neutral-100 flex flex-col overflow-hidden max-h-[40vh] lg:max-h-full">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <span className="text-xs font-mono font-bold text-neutral-300 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-blue-400" />
                Mermaid Code Editor
              </span>
              <button
                onClick={handleSaveCode}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white text-black dark:bg-white dark:text-black hover:opacity-90 text-[11px] font-semibold transition cursor-pointer"
              >
                <Check className="w-3 h-3" />
                <span>Save</span>
              </button>
            </div>

            <textarea
              value={editorCode}
              onChange={(e) => setEditorCode(e.target.value)}
              className="flex-1 w-full mt-3 p-3 bg-black font-mono text-xs text-neutral-200 rounded-xl border border-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-500 resize-none leading-relaxed"
              spellCheck={false}
            />

            <p className="text-[10px] text-neutral-400 mt-2">
              Edits update live in the right canvas. Press Save to persist changes to IndexedDB.
            </p>
          </div>
        )}

        {/* Canvas Display */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center min-h-0 bg-neutral-50/50 dark:bg-black">
          {renderError && (
            <div className="w-full max-w-xl mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Mermaid Rendering Error</p>
                <p className="mt-0.5 font-mono text-[11px] opacity-90">{renderError}</p>
              </div>
            </div>
          )}

          <div
            ref={containerRef}
            className="w-full max-w-4xl p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 shadow-xs border border-neutral-200 dark:border-neutral-800 flex items-center justify-center overflow-auto min-h-[360px]"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </div>
      </div>
    </div>
  );
};
