import React from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import { useAuthStore } from '../../store/useAuthStore';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { OfflineIndicator } from '../pwa/OfflineIndicator';
import {
  Search,
  Database,
  BookOpen,
  Layers,
  HardDrive,
  ShieldCheck,
  Plus,
  HelpCircle,
  Sun,
  Moon,
  Laptop,
  User,
  Crown,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    setSearchOpen,
    setBackupOpen,
    setWorkspaceModalOpen,
    setGuideModalOpen,
    theme,
    setTheme,
    storageStatus,
  } = useStudyStore();

  const {
    user,
    profile,
    setAuthModalOpen,
    setAccountModalOpen,
    setPricingModalOpen,
  } = useAuthStore();

  const isPro = profile?.plan === 'pro';

  return (
    <header className="sticky top-0 z-30 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-black/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand: StudyDezk with minimalist study vibe */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-black shadow-xs">
            <BookOpen className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-black text-lg sm:text-xl text-neutral-950 dark:text-white tracking-tight">
                StudyDezk
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800">
                Study
              </span>
            </div>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 hidden md:block">
              Offline University Suite
            </p>
          </div>
        </div>

        {/* Workspace Switcher */}
        <div className="flex items-center gap-1.5 flex-1 max-w-[170px] xs:max-w-xs sm:max-w-sm">
          <div className="relative w-full flex items-center">
            <Layers className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
            <select
              aria-label="Course Workspaces"
              value={activeWorkspaceId}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  setWorkspaceModalOpen(true);
                } else {
                  setActiveWorkspace(e.target.value);
                }
              }}
              className="w-full pl-8 sm:pl-9 pr-6 sm:pr-8 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition truncate cursor-pointer"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} ({ws.course})
                </option>
              ))}
              <option value="__new__">+ Manage Workspaces...</option>
            </select>
          </div>

          <button
            onClick={() => setWorkspaceModalOpen(true)}
            className="p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer shrink-0"
            title="Create or manage course workspaces"
            aria-label="Manage workspaces"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Usability Guide Button */}
          <button
            onClick={() => setGuideModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            title="Open StudyDezk Usability Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Guide</span>
          </button>

          {/* Manual Theme Toggle: Explicit Light / Dark mode switcher */}
          <div
            className="flex items-center p-0.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/90 dark:bg-neutral-900 text-xs shrink-0"
            role="radiogroup"
            aria-label="Theme mode"
          >
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                theme === 'light'
                  ? 'bg-white text-neutral-950 shadow-2xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
              title="Switch explicitly to Light mode"
              aria-checked={theme === 'light'}
              role="radio"
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Light</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                theme === 'dark'
                  ? 'bg-neutral-800 text-white shadow-2xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
              title="Switch explicitly to Dark mode"
              aria-checked={theme === 'dark'}
              role="radio"
            >
              <Moon className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Dark</span>
            </button>
          </div>

          {/* Storage persistence indicator */}
          <div
            className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              storageStatus.isPersisted
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800'
            }`}
            title={
              storageStatus.isPersisted
                ? 'Storage persistence granted: browser will preserve your offline notes across storage pressures.'
                : 'Storage persistence: best effort (browser may evict under extreme disk pressure).'
            }
          >
            {storageStatus.isPersisted ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <HardDrive className="w-3.5 h-3.5 text-neutral-400" />
            )}
            <span>{storageStatus.isPersisted ? 'Persistent' : 'Local DB'}</span>
          </div>

          {/* Offline indicator */}
          <OfflineIndicator />

          {/* Semantic Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            title="Semantic search across all documents (Ctrl + K)"
            aria-label="Search documents"
          >
            <Search className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden lg:inline text-[10px] px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Backup Button with badge if reminder needed */}
          <button
            onClick={() => setBackupOpen(true)}
            className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            title="Export or restore JSON backup"
            aria-label="Backup library"
          >
            <Database className="w-3.5 h-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Backup</span>
            {storageStatus.needsBackupReminder && (
              <span className="w-2 h-2 rounded-full bg-blue-600 absolute -top-0.5 -right-0.5 ring-2 ring-white dark:ring-black animate-pulse" />
            )}
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Account / Auth Action */}
          {user || profile ? (
            <div className="flex items-center gap-1.5">
              {!isPro && (
                <button
                  onClick={() => setPricingModalOpen(true)}
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                  title="Upgrade to Pro"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Pro</span>
                </button>
              )}
              <button
                onClick={() => setAccountModalOpen(true)}
                className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                title="Account & Profile Settings"
                aria-label="Account Settings"
              >
                <div className="w-6 h-6 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-[11px]">
                  {(profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-[100px]">
                  {profile?.full_name?.split(' ')[0] || 'Account'}
                </span>
                {isPro && (
                  <Crown className="w-3 h-3 text-amber-500 hidden sm:inline" />
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true, 'login')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

