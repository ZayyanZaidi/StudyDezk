import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useStudyStore } from '../../store/useStudyStore';
import {
  X,
  User,
  GraduationCap,
  BookOpen,
  Crown,
  Sparkles,
  Zap,
  Trash2,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sliders,
  ArrowRight,
} from 'lucide-react';

export const AccountModal: React.FC = () => {
  const {
    isAccountModalOpen,
    setAccountModalOpen,
    setSettingsModalOpen,
    user,
    profile,
    updateProfile,
    signOut,
    deleteAccount,
    todayUsage,
    refreshUsageStats,
    setPricingModalOpen,
    isLoading,
    error,
    successMessage,
    clearMessages,
  } = useAuthStore();

  const { workspaces, documents } = useStudyStore();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [university, setUniversity] = useState(profile?.university || '');
  const [program, setProgram] = useState(profile?.program || '');
  const [semester, setSemester] = useState(profile?.semester || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setUniversity(profile.university || '');
      setProgram(profile.program || '');
      setSemester(profile.semester || '');
    }
    refreshUsageStats(workspaces.length, documents.length);
  }, [profile, workspaces.length, documents.length]);

  if (!isAccountModalOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    await updateProfile({
      full_name: fullName,
      university,
      program,
      semester,
    });
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete your account? This action is permanent.')) {
      await deleteAccount();
      setShowDeleteConfirm(false);
    }
  };

  const isPro = profile?.plan === 'pro';
  const chunkPercent = Math.min(100, Math.round((todayUsage.chunksProcessed / todayUsage.maxChunksDaily) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-black shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-7 space-y-6 max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200 font-bold text-sm">
              {(profile?.full_name || user?.email || 'S').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <span>{profile?.full_name || 'Student Profile'}</span>
                {isPro ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    PRO
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                    FREE PLAN
                  </span>
                )}
              </h3>
              <p className="text-xs text-neutral-500 truncate max-w-xs">
                {user?.email || profile?.email || 'Local student account'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              clearMessages();
              setAccountModalOpen(false);
            }}
            className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Subscription & Today's Usage Card */}
        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-neutral-900 dark:text-white">
                Daily Capacity & Plan
              </span>
            </div>
            {!isPro && (
              <button
                type="button"
                onClick={() => setPricingModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-[11px] font-bold shadow-2xs transition cursor-pointer"
              >
                Upgrade to Pro
              </button>
            )}
          </div>

          {/* Today's Chunks Usage */}
          <div>
            <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400 mb-1">
              <span>Today's Processed Chunks</span>
              <span className="font-semibold text-neutral-900 dark:text-white">
                {todayUsage.chunksProcessed} / {isPro ? 'Unlimited (500)' : `${todayUsage.maxChunksDaily}/day`}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  chunkPercent > 90 ? 'bg-rose-500' : 'bg-neutral-900 dark:bg-white'
                }`}
                style={{ width: `${chunkPercent}%` }}
              />
            </div>
          </div>

          {/* Course & Documents Limits */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="p-2.5 rounded-xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800">
              <span className="text-neutral-500">Active Courses</span>
              <p className="font-bold text-neutral-900 dark:text-white mt-0.5">
                {workspaces.length} / {isPro ? 'Unlimited' : '2 Courses'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800">
              <span className="text-neutral-500">Total Documents</span>
              <p className="font-bold text-neutral-900 dark:text-white mt-0.5">
                {documents.length} / {isPro ? 'Unlimited' : '5 Documents'}
              </p>
            </div>
          </div>
        </div>

        {/* Study Preferences Quick Link */}
        <button
          type="button"
          onClick={() => {
            setAccountModalOpen(false);
            setSettingsModalOpen(true);
          }}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 hover:bg-neutral-100 dark:hover:bg-neutral-850 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-neutral-900 dark:text-white">
                Custom Study &amp; Typography Settings
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Reading fonts, auto-diagram synthesis, and default summary styles
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-400" />
        </button>

        {/* Edit Profile Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
            Academic Profile
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  University / College
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. UC Berkeley"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Program or Major
                </label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. Electrical Engineering"
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Semester / Academic Year
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. Fall 2026 / Year 3"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-xs font-bold text-white dark:text-black shadow-xs transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>

        {/* Footer Actions (Sign out & Delete Account) */}
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
