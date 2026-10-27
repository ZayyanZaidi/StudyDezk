import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { UserCustomSettings, DEFAULT_USER_SETTINGS } from '../../types/auth';
import {
  X,
  Sliders,
  Type,
  BookOpen,
  Sparkles,
  GitFork,
  Check,
  RotateCcw,
  Eye,
  FileText,
  Target,
  Download,
  List,
  AlignLeft,
} from 'lucide-react';

export const CustomSettingsModal: React.FC = () => {
  const {
    isSettingsModalOpen,
    setSettingsModalOpen,
    settings,
    updateSettings,
    successMessage,
    clearMessages,
  } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'study' | 'typography' | 'goals'>('study');
  const [localSettings, setLocalSettings] = useState<UserCustomSettings>(settings);

  // Sync when modal opens
  React.useEffect(() => {
    if (isSettingsModalOpen) {
      setLocalSettings(settings);
      clearMessages();
    }
  }, [isSettingsModalOpen, settings, clearMessages]);

  if (!isSettingsModalOpen) return null;

  const handleSave = () => {
    updateSettings(localSettings);
  };

  const handleResetDefaults = () => {
    setLocalSettings(DEFAULT_USER_SETTINGS);
    updateSettings(DEFAULT_USER_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-black shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-7 space-y-6 max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black flex items-center justify-center">
              <Sliders className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Custom Account &amp; Study Settings
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Tailor summary styles, reading ergonomics, and learning defaults.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSettingsModalOpen(false)}
            className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-900 p-1 border border-neutral-200 dark:border-neutral-800 shrink-0">
          <button
            onClick={() => setActiveTab('study')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'study'
                ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-2xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Summarization</span>
          </button>
          <button
            onClick={() => setActiveTab('typography')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'typography'
                ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-2xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Type className="w-3.5 h-3.5 text-blue-500" />
            <span>Reading &amp; Fonts</span>
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'goals'
                ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-2xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-emerald-500" />
            <span>Goals &amp; Export</span>
          </button>
        </div>

        {/* Scrollable Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-xs">
          {/* TAB 1: SUMMARIZATION */}
          {activeTab === 'study' && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                  Default Summary Representation Mode
                </label>
                <p className="text-neutral-500 dark:text-neutral-400 mb-2.5">
                  Choose the view format automatically loaded when you open a study session.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      id: 'structured',
                      title: 'Structured Outline',
                      desc: 'Sections, core takeaways, and concept deep-dives.',
                    },
                    {
                      id: 'bullets',
                      title: 'Key Bullets',
                      desc: 'Fast, scannable high-yield bullet list.',
                    },
                    {
                      id: 'paragraph',
                      title: 'Prose Narrative',
                      desc: 'Cohesive, textbook-style chapter summary.',
                    },
                    {
                      id: 'tldr',
                      title: 'TL;DR & Definitions',
                      desc: 'Core takeaway with bold key terms for exam cramming.',
                    },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() =>
                        setLocalSettings({
                          ...localSettings,
                          defaultSummaryStyle: mode.id as any,
                        })
                      }
                      className={`text-left p-3 rounded-xl border transition cursor-pointer ${
                        localSettings.defaultSummaryStyle === mode.id
                          ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900 shadow-2xs'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-neutral-900 dark:text-white">
                          {mode.title}
                        </span>
                        {localSettings.defaultSummaryStyle === mode.id && (
                          <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-white" />
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {mode.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                  Default Compression Density
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'concise', label: 'Concise (30%)', sub: 'Rapid review' },
                    { id: 'auto', label: 'Balanced (Auto)', sub: 'Optimal study' },
                    { id: 'detailed', label: 'Exhaustive (70%)', sub: 'Deep revision' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setLocalSettings({
                          ...localSettings,
                          defaultSummaryLength: opt.id as any,
                        })
                      }
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        localSettings.defaultSummaryLength === opt.id
                          ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900 font-bold text-neutral-900 dark:text-white'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <div className="font-bold">{opt.label}</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
                      Auto-Extract Diagrams
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Automatically synthesize Mindmaps &amp; Concept Flowcharts when processing files.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.autoExtractDiagrams}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        autoExtractDiagrams: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-neutral-900 dark:text-white cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
                      Auto-Save Summary Sessions
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Preserve living study session iterations in course history for later revision.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.autoSaveSessionLogs}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        autoSaveSessionLogs: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-neutral-900 dark:text-white cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: TYPOGRAPHY & READING */}
          {activeTab === 'typography' && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                  Reading Font Family
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'sans', name: 'Modern Sans', preview: 'Inter / UI' },
                    { id: 'serif', name: 'Editorial Serif', preview: 'Merriweather' },
                    { id: 'mono', name: 'Technical Mono', preview: 'JetBrains / Code' },
                  ].map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() =>
                        setLocalSettings({
                          ...localSettings,
                          fontPreference: font.id as any,
                        })
                      }
                      className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                        localSettings.fontPreference === font.id
                          ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-2xs'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <div className="font-bold">{font.name}</div>
                      <div
                        className={`text-xs mt-1 text-neutral-500 dark:text-neutral-400 ${
                          font.id === 'serif'
                            ? 'font-serif'
                            : font.id === 'mono'
                            ? 'font-mono'
                            : 'font-sans'
                        }`}
                      >
                        {font.preview}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                  Line Spacing &amp; Ergonomics
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'normal', label: 'Compact (1.5)' },
                    { id: 'relaxed', label: 'Relaxed (1.75)' },
                    { id: 'loose', label: 'Spacious (2.0)' },
                  ].map((lh) => (
                    <button
                      key={lh.id}
                      type="button"
                      onClick={() =>
                        setLocalSettings({
                          ...localSettings,
                          readingLineHeight: lh.id as any,
                        })
                      }
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        localSettings.readingLineHeight === lh.id
                          ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900 font-bold text-neutral-900 dark:text-white'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <span>{lh.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
                      High Readability Contrast
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Enhances text borders and increases paragraph contrast for fatigue-free reading.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.highReadabilityContrast}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        highReadabilityContrast: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-neutral-900 dark:text-white cursor-pointer"
                  />
                </label>
              </div>

              {/* Live Preview Box */}
              <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Typography Live Sample</span>
                </div>
                <div
                  className={`text-neutral-800 dark:text-neutral-200 ${
                    localSettings.fontPreference === 'serif'
                      ? 'font-serif'
                      : localSettings.fontPreference === 'mono'
                      ? 'font-mono'
                      : 'font-sans'
                  } ${
                    localSettings.readingLineHeight === 'loose'
                      ? 'leading-loose'
                      : localSettings.readingLineHeight === 'relaxed'
                      ? 'leading-relaxed'
                      : 'leading-normal'
                  }`}
                >
                  <p className="font-bold text-xs mb-1">Distributed Consensus Protocols</p>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                    In decentralized state replication, the Raft algorithm ensures safety
                    across non-byzantine cluster nodes through randomized election timers and log-matching invariants.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GOALS & EXPORT */}
          {activeTab === 'goals' && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                  Daily Study Chunk Target
                </label>
                <p className="text-neutral-500 dark:text-neutral-400 mb-2">
                  Set how many lecture paragraphs/slides you aim to master per day.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={localSettings.dailyChunkTarget}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        dailyChunkTarget: Number(e.target.value),
                      })
                    }
                    className="flex-1 accent-neutral-900 dark:accent-white cursor-pointer"
                  />
                  <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white w-14 text-right">
                    {localSettings.dailyChunkTarget} / day
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <label className="block font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                  Default Flashcards Export Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'anki', title: 'Anki TSV (.txt)', desc: 'Spaced repetition decks' },
                    { id: 'json', title: 'Structured JSON', desc: 'Raw data & backups' },
                    { id: 'csv', title: 'Standard CSV', desc: 'Spreadsheets & Quizlet' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() =>
                        setLocalSettings({
                          ...localSettings,
                          exportFormatFlashcards: fmt.id as any,
                        })
                      }
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        localSettings.exportFormatFlashcards === fmt.id
                          ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900 font-bold text-neutral-900 dark:text-white'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <div className="font-bold text-[11px]">{fmt.title}</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">{fmt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSettingsModalOpen(false)}
              className="px-3.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                handleSave();
                setSettingsModalOpen(false);
              }}
              className="px-4 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-xs font-bold text-white dark:text-black shadow-xs transition active:scale-98 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
