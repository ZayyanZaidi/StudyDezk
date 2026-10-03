const LAST_BACKUP_KEY = 'studydezk_last_backup_time';
const CHANGES_SINCE_BACKUP_KEY = 'studydezk_changes_since_backup';

export interface StorageStatus {
  isPersisted: boolean;
  isPrivateMode: boolean;
  needsBackupReminder: boolean;
  daysSinceLastBackup: number;
  changesCount: number;
  usageBytes: number;
  quotaBytes: number;
}

/**
 * Initializes browser storage persistence and estimates quota durability.
 */
export async function checkStorageDurability(): Promise<StorageStatus> {
  let isPersisted = false;
  let isPrivateMode = false;
  let usageBytes = 0;
  let quotaBytes = 0;

  // 1. Request persistent storage
  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      if (navigator.storage.persist) {
        isPersisted = await navigator.storage.persist();
      } else if (navigator.storage.persisted) {
        isPersisted = await navigator.storage.persisted();
      }

      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        usageBytes = estimate.usage || 0;
        quotaBytes = estimate.quota || 0;

        // Quota heuristic for private mode in modern browsers (typically restricted to ~100MB or small fraction)
        if (estimate.quota && estimate.quota < 120 * 1024 * 1024) {
          isPrivateMode = true;
        }
      }
    } catch (e) {
      console.warn('Storage persistence check failed:', e);
    }
  }

  // 2. Private browsing check fallback via FileSystem or IndexedDB quota
  if (!isPrivateMode && typeof window !== 'undefined') {
    try {
      // In Safari/Firefox private mode, persistence is strictly rejected
      if (!isPersisted && (window as unknown as { safari?: unknown }).safari) {
        isPrivateMode = true;
      }
    } catch {
      // ignore
    }
  }

  // 3. Backup age and changes count tracking
  const lastBackupStr = typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_BACKUP_KEY) : null;
  const lastBackupTime = lastBackupStr ? parseInt(lastBackupStr, 10) : 0;
  const changesCount = parseInt(typeof localStorage !== 'undefined' ? localStorage.getItem(CHANGES_SINCE_BACKUP_KEY) || '0' : '0', 10);

  const daysSinceLastBackup = lastBackupTime > 0
    ? Math.floor((Date.now() - lastBackupTime) / (1000 * 60 * 60 * 24))
    : 999; // Never backed up

  // Remind if > 7 days or more than 3 significant changes
  const needsBackupReminder = daysSinceLastBackup >= 7 || changesCount >= 3;

  return {
    isPersisted,
    isPrivateMode,
    needsBackupReminder,
    daysSinceLastBackup,
    changesCount,
    usageBytes,
    quotaBytes,
  };
}

export function recordDataChange() {
  if (typeof localStorage === 'undefined') return;
  const current = parseInt(localStorage.getItem(CHANGES_SINCE_BACKUP_KEY) || '0', 10);
  localStorage.setItem(CHANGES_SINCE_BACKUP_KEY, String(current + 1));
}

export function recordBackupExported() {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
  localStorage.setItem(CHANGES_SINCE_BACKUP_KEY, '0');
}
