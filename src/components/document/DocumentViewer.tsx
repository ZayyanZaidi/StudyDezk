import React from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import { SummaryPanel } from '../summary/SummaryPanel';
import { FlashcardDeck } from '../flashcards/FlashcardDeck';
import { GlossaryView } from '../glossary/GlossaryView';
import { DiagramViewer } from '../diagrams/DiagramViewer';
import { ExtractedTextViewer } from './ExtractedTextViewer';
import { SessionHistoryView } from '../summary/SessionHistoryView';
import {
  FileText,
  Sparkles,
  BookOpen,
  GitFork,
  AlignLeft,
  Calendar,
  Layers,
  History,
} from 'lucide-react';

export const DocumentViewer: React.FC = () => {
  const {
    activeDocumentId,
    documents,
    activeTab,
    setActiveTab,
    flashcards,
    glossaryTerms,
    sessionHistories,
    activeWorkspaceId,
  } = useStudyStore();

  const currentDoc = documents.find((d) => d.id === activeDocumentId);

  if (!currentDoc) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white dark:bg-black">
        <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white flex items-center justify-center mb-3">
          <Layers className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
          No Lecture Document Selected
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mt-1">
          Select a lecture from the sidebar or upload a new PDF or photo to begin studying.
        </p>
      </main>
    );
  }

  // Count metrics for badges
  const docCardsCount = flashcards.filter((c) => c.documentId === currentDoc.id).length;
  const docTermsCount = glossaryTerms.filter((t) => t.documentId === currentDoc.id).length;
  const docSessionsCount = sessionHistories.filter(
    (s) => s.workspaceId === activeWorkspaceId && s.documentId === currentDoc.id
  ).length;

  const tabs: Array<{
    id: 'summary' | 'flashcards' | 'glossary' | 'diagrams' | 'rawText' | 'history';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'summary', label: 'Summary', icon: Sparkles },
    { id: 'flashcards', label: 'Flashcards', icon: BookOpen, count: docCardsCount },
    { id: 'glossary', label: 'Glossary', icon: FileText, count: docTermsCount },
    { id: 'diagrams', label: 'Diagrams', icon: GitFork },
    { id: 'history', label: 'History', icon: History, count: docSessionsCount },
    { id: 'rawText', label: 'Extracted Text', icon: AlignLeft },
  ];

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-black">
      {/* Document Top Bar */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800">
                {currentDoc.course}
              </span>
              <span className="text-[11px] text-neutral-400">
                {(currentDoc.fileSize / 1024).toFixed(0)} KB
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 dark:text-white mt-1 tracking-tight">
              {currentDoc.title}
            </h2>
          </div>

          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <span className="flex items-center gap-1 text-[11px]">
              <Calendar className="w-3 h-3" />
              {new Date(currentDoc.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="flex items-center gap-1 mt-3 overflow-x-auto border-b border-neutral-200 dark:border-neutral-850 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition border-b-2 cursor-pointer whitespace-nowrap ${
                  active
                    ? 'border-neutral-900 text-neutral-900 dark:border-white dark:text-white'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      active
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                        : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-850 dark:text-neutral-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feature Content Switcher */}
      <div className="flex-1 flex overflow-hidden bg-white dark:bg-black">
        {activeTab === 'summary' && <SummaryPanel />}
        {activeTab === 'flashcards' && <FlashcardDeck />}
        {activeTab === 'glossary' && <GlossaryView />}
        {activeTab === 'diagrams' && <DiagramViewer />}
        {activeTab === 'history' && <SessionHistoryView />}
        {activeTab === 'rawText' && <ExtractedTextViewer />}
      </div>
    </main>
  );
};
