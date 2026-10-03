/**
 * StudyDezk - Browser-Only University Offline Study Suite
 * Simple yet study-vibe UI with course workspaces, session history, and durability
 */

import React, { useEffect, useState } from 'react';
import { useStudyStore } from './store/useStudyStore';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DocumentViewer } from './components/document/DocumentViewer';
import { SemanticSearchModal } from './components/search/SemanticSearchModal';
import { BackupModal } from './components/backup/BackupModal';
import { WorkspaceModal } from './components/workspace/WorkspaceModal';
import { UsabilityGuideModal } from './components/guide/UsabilityGuideModal';
import { DurabilityBanner } from './components/durability/DurabilityBanner';
import { Menu, X } from 'lucide-react';

export default function App() {
  const { initialize } = useStudyStore();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="h-[100dvh] w-full bg-white dark:bg-black flex flex-col font-sans text-neutral-900 dark:text-neutral-100 antialiased overflow-hidden transition-colors">
      {/* Top Application Header */}
      <Header />

      {/* Durability / Private Mode / Backup Reminder Banner */}
      <DurabilityBanner />

      {/* Mobile Drawer Bar (Visible only on small screens < md) */}
      <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 shrink-0">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer"
        >
          {mobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span>{mobileSidebarOpen ? 'Close Drawer' : 'Lectures & Slides'}</span>
        </button>
        <span className="text-[11px] text-neutral-500 font-medium">
          StudyDezk
        </span>
      </div>

      {/* Main Workspace (Dynamically adjusted for any viewport) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:block shrink-0">
          <Sidebar />
        </div>

        {/* Mobile Drawer Sidebar */}
        {mobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative z-50 w-80 max-w-[85vw] bg-white dark:bg-black shadow-2xl h-full flex flex-col border-r border-neutral-200 dark:border-neutral-800">
              <Sidebar onCloseMobile={() => setMobileSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Active Document Viewer & Study Hub */}
        <DocumentViewer />
      </div>

      {/* Global Modals */}
      <SemanticSearchModal />
      <BackupModal />
      <WorkspaceModal />
      <UsabilityGuideModal />
    </div>
  );
}
