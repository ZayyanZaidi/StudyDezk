import React from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import { exportLibraryToJson, downloadBackupFile } from '../../db/backup';
import { AlertTriangle, ShieldAlert, Download, X, HardDrive } from 'lucide-react';

export const DurabilityBanner: React.FC = () => {
  const { storageStatus, dismissedBackupReminder, dismissBackupAlert, notifyBackupCompleted } = useStudyStore();

  const handleQuickBackup = async () => {
    try {
      const json = await exportLibraryToJson();
      downloadBackupFile(json);
      notifyBackupCompleted();
    } catch (e) {
      console.error('Quick backup failed:', e);
    }
  };

  // 1. Private Mode Warning (High Priority)
  if (storageStatus.isPrivateMode) {
    return (
      <div className="bg-amber-400 text-neutral-950 px-4 py-2 text-xs font-medium flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1">
          <ShieldAlert className="w-4 h-4 shrink-0 font-bold" />
          <span>
            <strong>Private Browsing Detected:</strong> Browser storage is temporary and will be cleared when your tab or session closes. Please export a backup to retain your notes!
          </span>
        </div>
        <button
          onClick={handleQuickBackup}
          className="ml-3 px-2.5 py-1 rounded-md bg-neutral-950 text-white font-bold hover:bg-neutral-800 transition shrink-0 cursor-pointer flex items-center gap-1"
        >
          <Download className="w-3 h-3" />
          <span>Export Now</span>
        </button>
      </div>
    );
  }

  // 2. Backup Reminder Banner (if > 7 days or > 3 changes)
  if (storageStatus.needsBackupReminder && !dismissedBackupReminder) {
    return (
      <div className="bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 px-4 py-2 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1">
          <HardDrive className="w-4 h-4 text-neutral-600 dark:text-neutral-400 shrink-0" />
          <span>
            {storageStatus.daysSinceLastBackup >= 7
              ? `It has been over ${storageStatus.daysSinceLastBackup === 999 ? '7' : storageStatus.daysSinceLastBackup} days since your last library backup.`
              : `You have ${storageStatus.changesCount} new changes since your last backup.`}
            {' '}Export a backup file to keep your study library safe across devices.
          </span>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <button
            onClick={handleQuickBackup}
            className="px-2.5 py-1 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold hover:opacity-90 transition cursor-pointer flex items-center gap-1 text-[11px]"
          >
            <Download className="w-3 h-3" />
            <span>Backup Library</span>
          </button>
          <button
            onClick={dismissBackupAlert}
            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            title="Dismiss reminder for now"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
