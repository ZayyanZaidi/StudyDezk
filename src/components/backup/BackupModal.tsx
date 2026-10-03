import React, { useState, useRef } from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import { exportLibraryToJson, downloadBackupFile, importLibraryFromJson, ImportResult } from '../../db/backup';
import { Download, Upload, Database, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export const BackupModal: React.FC = () => {
  const { backupOpen, setBackupOpen, documents, flashcards, glossaryTerms, diagrams, refreshAllData } = useStudyStore();
  const [isExporting, setIsExporting] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importStatus, setImportStatus] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!backupOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const json = await exportLibraryToJson();
      downloadBackupFile(json);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);

    try {
      const text = await file.text();
      const result = await importLibraryFromJson(text, importMode);
      setImportStatus(result);
      if (result.success) {
        await refreshAllData();
      }
    } catch (err) {
      setImportStatus({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to read file',
        importedCounts: { workspaces: 0, documents: 0, flashcards: 0, glossary: 0, diagrams: 0, sessions: 0 },
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-black shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6 space-y-5 max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Lightweight Study Archive
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Sync summary content, diagrams, &amp; flashcards
              </p>
            </div>
          </div>
          <button
            onClick={() => setBackupOpen(false)}
            className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lightweight storage notice */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1.5 text-xs">
          <span className="font-bold text-neutral-900 dark:text-white block">
            Feather-light JSON Format
          </span>
          <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
            Rather than carrying heavy raw PDFs or images, StudyDezk saves the extracted key points, Mermaid diagrams, flashcards, and glossary organized with original file names for context.
          </p>
        </div>

        {/* Current Library Snapshot */}
        <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="block font-bold text-neutral-900 dark:text-white text-sm">
              {documents.length}
            </span>
            <span className="text-[11px] text-neutral-500">Documents</span>
          </div>
          <div>
            <span className="block font-bold text-neutral-900 dark:text-white text-sm">
              {flashcards.length}
            </span>
            <span className="text-[11px] text-neutral-500">Flashcards</span>
          </div>
          <div>
            <span className="block font-bold text-neutral-900 dark:text-white text-sm">
              {glossaryTerms.length}
            </span>
            <span className="text-[11px] text-neutral-500">Glossary</span>
          </div>
        </div>

        {/* Export Section */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
            1. Export Lightweight Backup (JSON)
          </label>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-xs font-bold text-white dark:text-black shadow-xs transition active:scale-98 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating JSON...' : 'Export Lightweight Library'}</span>
          </button>
        </div>

        {/* Import Section */}
        <div className="space-y-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
          <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
            2. Import Backup File
          </label>

          <div className="flex items-center gap-4 text-xs text-neutral-700 dark:text-neutral-300">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="merge"
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
                className="accent-neutral-900 dark:accent-white"
              />
              <span>Merge with current</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="accent-neutral-900 dark:accent-white"
              />
              <span>Replace library</span>
            </label>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-xs font-bold text-neutral-800 dark:text-neutral-200 transition active:scale-98 cursor-pointer disabled:opacity-50"
          >
            {isImporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-neutral-600 dark:text-neutral-400" />
                <span>Validating & Restoring...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Select JSON Backup File</span>
              </>
            )}
          </button>

          {/* Import Result Alert */}
          {importStatus && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                importStatus.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
              }`}
            >
              {importStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{importStatus.message}</p>
                {importStatus.success && (
                  <p className="mt-0.5 text-[11px] opacity-90">
                    Restored {importStatus.importedCounts.documents} documents,{' '}
                    {importStatus.importedCounts.flashcards} flashcards,{' '}
                    {importStatus.importedCounts.glossary} glossary terms.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
