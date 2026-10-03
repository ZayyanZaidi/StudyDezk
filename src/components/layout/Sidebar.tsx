import React, { useState } from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import { FileUploaderModal } from '../upload/FileUploaderModal';
import {
  Plus,
  FileText,
  Image as ImageIcon,
  Trash2,
  Layers,
  BookMarked,
  Sparkles,
  History,
  FolderCog,
} from 'lucide-react';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const {
    workspaces,
    activeWorkspaceId,
    documents,
    activeDocumentId,
    setActiveDocument,
    deleteDocument,
    flashcards,
    glossaryTerms,
    sessionHistories,
    setWorkspaceModalOpen,
  } = useStudyStore();

  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const wsDocuments = documents.filter((doc) => doc.workspaceId === activeWorkspaceId);
  const wsCards = flashcards.filter((c) => c.workspaceId === activeWorkspaceId);
  const wsTerms = glossaryTerms.filter((t) => t.workspaceId === activeWorkspaceId);
  const wsSessions = sessionHistories.filter((s) => s.workspaceId === activeWorkspaceId);

  const handleDelete = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to remove "${title}"?`)) {
      deleteDocument(id);
    }
  };

  const handleSelectDoc = (id: string) => {
    setActiveDocument(id);
    onCloseMobile?.();
  };

  return (
    <>
      <aside className="w-80 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-black flex flex-col h-full">
        {/* Workspace Active Header Banner */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                  {activeWs?.name || 'Workspace'}
                </h3>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                  {activeWs?.course}
                </p>
              </div>
            </div>
            <button
              onClick={() => setWorkspaceModalOpen(true)}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              title="Manage workspaces"
              aria-label="Manage workspaces"
            >
              <FolderCog className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Upload Action Button */}
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/40 dark:bg-black">
          <button
            onClick={() => setUploadModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-xs font-bold text-white dark:text-black shadow-xs transition active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Notes or Slides</span>
          </button>
        </div>

        {/* Documents Section Header */}
        <div className="px-4 py-2.5 bg-neutral-100/60 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
            Documents ({wsDocuments.length})
          </span>
          <span className="text-[10px] text-neutral-400 font-mono">
            {wsSessions.length} {wsSessions.length === 1 ? 'session' : 'sessions'}
          </span>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {wsDocuments.length === 0 ? (
            <div className="py-12 text-center px-4 space-y-2">
              <div className="w-10 h-10 mx-auto rounded-xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
                <FileText className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Workspace Empty
              </p>
              <p className="text-[11px] text-neutral-500">
                Upload PDFs, slides, or whiteboard photos for this course.
              </p>
            </div>
          ) : (
            wsDocuments.map((doc) => {
              const isActive = doc.id === activeDocumentId;
              return (
                <div
                  key={doc.id}
                  onClick={() => handleSelectDoc(doc.id)}
                  className={`group relative flex items-start gap-2.5 p-2.5 rounded-xl transition cursor-pointer ${
                    isActive
                      ? 'bg-neutral-200/60 dark:bg-neutral-800 text-neutral-950 dark:text-white font-medium border border-neutral-300 dark:border-neutral-700 shadow-2xs'
                      : 'hover:bg-white dark:hover:bg-neutral-900 border border-transparent text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div
                    className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                      doc.fileType === 'pdf'
                        ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                        : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                    }`}
                  >
                    {doc.fileType === 'pdf' ? (
                      <FileText className="w-3.5 h-3.5" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-6">
                    <h4
                      className={`text-xs font-bold truncate leading-snug ${
                        isActive
                          ? 'text-neutral-950 dark:text-white'
                          : 'text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      {doc.title}
                    </h4>

                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                      <span>{doc.totalPages} {doc.totalPages === 1 ? 'page' : 'pages'}</span>
                      <span>•</span>
                      <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(e, doc.id, doc.title)}
                    className="absolute right-2 top-2 p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footbar Stats for this workspace */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <BookMarked className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300" />
            <span>{wsCards.length} Cards</span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{wsTerms.length} Terms</span>
          </div>
          <div className="flex items-center gap-1">
            <History className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300" />
            <span>{wsSessions.length} Logs</span>
          </div>
        </div>
      </aside>

      <FileUploaderModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />
    </>
  );
};
