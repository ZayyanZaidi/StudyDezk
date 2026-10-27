import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { X, Check, Crown, Zap, ShieldCheck, Sparkles } from 'lucide-react';

export const PricingModal: React.FC = () => {
  const { isPricingModalOpen, setPricingModalOpen, profile, upgradePlan } = useAuthStore();

  if (!isPricingModalOpen) return null;

  const currentPlan = profile?.plan || 'free';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-black shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 space-y-6 max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>StudyDezk Plans</span>
              <span className="text-xs font-normal text-neutral-500">
                Simple, transparent student pricing
              </span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              One living study guide per course with diagrams, flashcards, and quizzes
            </p>
          </div>
          <button
            onClick={() => setPricingModalOpen(false)}
            className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Free Tier */}
          <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
            currentPlan === 'free'
              ? 'border-neutral-900 dark:border-white bg-neutral-50/60 dark:bg-neutral-900/60'
              : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black'
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Free Plan</h4>
                  <p className="text-[11px] text-neutral-500">For semester coursework</p>
                </div>
                <span className="text-lg font-extrabold text-neutral-900 dark:text-white">$0</span>
              </div>

              <ul className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-neutral-800 dark:text-neutral-200 shrink-0" />
                  <span>Up to 2 Course Workspaces</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-neutral-800 dark:text-neutral-200 shrink-0" />
                  <span>5 Documents Total</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-neutral-800 dark:text-neutral-200 shrink-0" />
                  <span>30 Text Chunks / Day</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-neutral-800 dark:text-neutral-200 shrink-0" />
                  <span>Interactive Mermaid Diagrams</span>
                </li>
                <li className="flex items-center gap-2 text-neutral-400">
                  <span className="w-3.5 h-3.5 text-center text-xs shrink-0">—</span>
                  <span>PDF & Anki Exports (Pro only)</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              disabled={currentPlan === 'free'}
              onClick={() => upgradePlan('free')}
              className="mt-6 w-full py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 transition cursor-pointer"
            >
              {currentPlan === 'free' ? 'Current Plan' : 'Downgrade to Free'}
            </button>
          </div>

          {/* Pro Tier */}
          <div className={`p-5 rounded-2xl border relative flex flex-col justify-between ${
            currentPlan === 'pro'
              ? 'border-amber-500 dark:border-amber-400 bg-amber-50/20 dark:bg-amber-950/20 ring-1 ring-amber-500'
              : 'border-neutral-900 dark:border-neutral-700 bg-neutral-900 dark:bg-neutral-900 text-white'
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Pro Scholar</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-neutral-950">
                      POPULAR
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">For degree completion</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-neutral-900 dark:text-white">$9</span>
                  <span className="text-[10px] text-neutral-400">/mo</span>
                </div>
              </div>

              <ul className="space-y-2 text-xs text-neutral-700 dark:text-neutral-200">
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Unlimited Course Workspaces</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Unlimited Document Uploads</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>500 Chunks / Day High Limit</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Full Course Markdown & PDF Exports</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>CSV Flashcards Export for Anki</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Active Recall MCQ Quizzes & Review</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              disabled={currentPlan === 'pro'}
              onClick={() => upgradePlan('pro')}
              className="mt-6 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-xs transition active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {currentPlan === 'pro' ? 'Active Pro Member' : 'Upgrade to Pro (Demo Stub)'}
            </button>
          </div>
        </div>

        {/* Payment Stub Info */}
        <p className="text-[11px] text-neutral-500 text-center">
          Payment integration stub: clicking upgrade instantly unlocks Pro limits for your account session. Plan can also be manually toggled in Supabase <code>profiles.plan</code>.
        </p>
      </div>
    </div>
  );
};
