import React, { useState } from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import {
  BookOpen,
  X,
  Layers,
  FileText,
  Sparkles,
  CheckCircle,
  HelpCircle,
  GitFork,
  Search,
  HardDrive,
  Keyboard,
  Smartphone,
  Shield,
  UploadCloud,
  ArrowRight,
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

export const UsabilityGuideModal: React.FC = () => {
  const { guideModalOpen, setGuideModalOpen } = useStudyStore();
  const [activeSectionId, setActiveSectionId] = useState('getting-started');

  if (!guideModalOpen) return null;

  const sections: GuideSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: BookOpen,
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
          <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <h4 className="font-serif font-bold text-sm text-neutral-900 dark:text-white mb-1">
              Welcome to StudyDezk
            </h4>
            <p className="text-neutral-600 dark:text-neutral-400">
              StudyDezk is a minimalist, distraction-free study suite designed for university students.
              It operates <strong>100% locally in your browser</strong>—no remote LLM APIs, no account setup, and zero monthly fees.
            </p>
          </div>

          <div>
            <h5 className="font-bold text-neutral-900 dark:text-white text-xs mb-2 uppercase tracking-wider">
              Core Study Workflow
            </h5>
            <ol className="space-y-2 list-decimal list-inside text-neutral-600 dark:text-neutral-300 pl-1">
              <li>
                <strong>Select or Create a Workspace</strong>: Organize your notes by course (e.g. <em>Cloud Computing</em>, <em>Information Security</em>).
              </li>
              <li>
                <strong>Import Lecture Slides or Notes</strong>: Drag-and-drop lecture PDFs or photo notes into the sidebar.
              </li>
              <li>
                <strong>Review Comprehensive Key Points</strong>: The system scans the entire document and automatically extracts core takeaways across all sections.
              </li>
              <li>
                <strong>Active Recall Practice</strong>: Flip through rule-based flashcards generated from definition patterns using spaced repetition.
              </li>
              <li>
                <strong>Visualize Concepts</strong>: Explore auto-generated Mind Maps, Process Flowcharts, and Concept Graphs.
              </li>
            </ol>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px]">
              <strong>Privacy First:</strong> Your documents, summaries, and lecture notes never leave your computer. Everything is stored in IndexedDB.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'workspaces',
      title: 'Course Workspaces',
      icon: Layers,
      content: (
        <div className="space-y-3.5 text-xs text-neutral-700 dark:text-neutral-300">
          <p>
            Workspaces keep your materials strictly separated by university subject. Each workspace possesses its own:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <li className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <span className="font-semibold text-neutral-900 dark:text-white">📄 Lecture Documents:</span> PDFs and images assigned exclusively to the course.
            </li>
            <li className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <span className="font-semibold text-neutral-900 dark:text-white">✨ Key Points History:</span> Persistent summary sessions saved with prompts.
            </li>
            <li className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <span className="font-semibold text-neutral-900 dark:text-white">🗂️ Flashcard Decks:</span> Active recall decks tailored to that syllabus.
            </li>
            <li className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <span className="font-semibold text-neutral-900 dark:text-white">🗺️ Diagrams:</span> Mindmaps, flowcharts, and concept graphs for that course.
            </li>
          </ul>
          <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <h6 className="font-semibold text-neutral-900 dark:text-white mb-1">Switching & Managing Workspaces</h6>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">
              Use the dropdown at the top of the screen to quickly switch between courses, or click the <strong>+</strong> button to add a new course with custom color accents and course descriptions.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'summarization',
      title: 'Key Points Summarizer',
      icon: Sparkles,
      content: (
        <div className="space-y-3.5 text-xs text-neutral-700 dark:text-neutral-300">
          <p>
            StudyDezk uses an intelligent graph algorithm (TextRank + Semantic Salience) that <strong>automatically covers every section of your document</strong> rather than cutting off arbitrarily.
          </p>

          <div className="space-y-2">
            <h6 className="font-semibold text-neutral-900 dark:text-white">How Auto-Coverage Works:</h6>
            <div className="space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
              <p>
                • <strong>Full Document Representation:</strong> The algorithm partitions slides and paragraphs, selecting top key insights from every single section.
              </p>
              <p>
                • <strong>Zero Length Guesswork:</strong> You don't need to tweak sliders or guess sentence limits—it eliminates filler while preserving complete conceptual coverage.
              </p>
              <p>
                • <strong>Key Point Highlights:</strong> Primary takeaways are marked with an indicator so you can quickly scan the most vital definitions and takeaways.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <h6 className="font-semibold text-neutral-900 dark:text-white mb-1">Optional Semantic Focus Prompt:</h6>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">
              Have a test on a specific topic? Enter a focus requirement such as <em>&ldquo;focus on attack types &amp; CIA triad&rdquo;</em> or <em>&ldquo;focus on TDD cycle&rdquo;</em>. The summarizer computes mathematical embeddings to elevate sentences related to your focus topic.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'flashcards',
      title: 'Flashcards & Active Recall',
      icon: CheckCircle,
      content: (
        <div className="space-y-3.5 text-xs text-neutral-700 dark:text-neutral-300">
          <p>
            Flashcards are automatically synthesized from formal definition patterns found in your slides:
          </p>
          <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 font-mono text-[11px] text-neutral-800 dark:text-neutral-200">
            &ldquo;X is defined as Y&rdquo; • &ldquo;X refers to Y&rdquo; • &ldquo;X means Y&rdquo; • &ldquo;X: Y&rdquo;
          </div>

          <div>
            <h6 className="font-semibold text-neutral-900 dark:text-white mb-1.5">Interactive 3D Study Controls:</h6>
            <ul className="space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
              <li>• Click the card or press <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 font-mono">Space</kbd> to flip between Question and Definition.</li>
              <li>• Use <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 font-mono">←</kbd> and <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 font-mono">→</kbd> keys to cycle through cards.</li>
              <li>• Rate your recall as <strong>&ldquo;Review Again&rdquo;</strong> or <strong>&ldquo;Known&rdquo;</strong> to update spaced repetition intervals.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'diagrams',
      title: 'Mermaid Diagrams',
      icon: GitFork,
      content: (
        <div className="space-y-3.5 text-xs text-neutral-700 dark:text-neutral-300">
          <p>
            StudyDezk synthesizes three visual representations directly from text:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <span className="font-bold text-neutral-900 dark:text-white block mb-0.5">🧠 Mind Map</span>
              Hierarchical breakdown from document headings and slide structure.
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <span className="font-bold text-neutral-900 dark:text-white block mb-0.5">🔄 Step Flowchart</span>
              Extracted from numbered sequences, pipelines, and execution stages.
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <span className="font-bold text-neutral-900 dark:text-white block mb-0.5">🕸️ Concept Graph</span>
              Interconnected graph of co-occurring terms and university acronyms.
            </div>
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            You can live-edit the underlying Mermaid syntax or export vector SVG / high-resolution PNG images for your assignments.
          </p>
        </div>
      ),
    },
    {
      id: 'shortcuts',
      title: 'Shortcuts & Responsiveness',
      icon: Smartphone,
      content: (
        <div className="space-y-3.5 text-xs text-neutral-700 dark:text-neutral-300">
          <p>
            StudyDezk is dynamically responsive and adapts to smartphones, tablets, laptops, and ultra-wide screens.
          </p>
          <div className="space-y-2">
            <h6 className="font-semibold text-neutral-900 dark:text-white">Keyboard Shortcuts:</h6>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-between">
                <span>Semantic Search</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 font-mono text-[10px] border border-neutral-200 dark:border-neutral-700">⌘K / Ctrl+K</kbd>
              </div>
              <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-between">
                <span>Flip Flashcard</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 font-mono text-[10px] border border-neutral-200 dark:border-neutral-700">Space</kbd>
              </div>
              <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-between">
                <span>Next Flashcard</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 font-mono text-[10px] border border-neutral-200 dark:border-neutral-700">→</kbd>
              </div>
              <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-between">
                <span>Previous Flashcard</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 font-mono text-[10px] border border-neutral-200 dark:border-neutral-700">←</kbd>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <h6 className="font-semibold text-neutral-900 dark:text-white mb-1">On Mobile Devices:</h6>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">
              Tap the <strong>Lecture Documents</strong> button at top to reveal the slide drawer, and use the scrollable study tabs to switch between Summary, Flashcards, Glossary, and Diagrams.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'durability',
      title: 'Backups & Durability',
      icon: HardDrive,
      content: (
        <div className="space-y-3.5 text-xs text-neutral-700 dark:text-neutral-300">
          <p>
            StudyDezk stores your data in browser IndexedDB. To protect your work against browser cache clearing:
          </p>
          <ul className="space-y-2 text-[11px] text-neutral-600 dark:text-neutral-400">
            <li className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <strong className="text-neutral-900 dark:text-white">Storage Persistence:</strong> StudyDezk automatically requests <code>navigator.storage.persist()</code> so the operating system preserves your notes under storage pressure.
            </li>
            <li className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <strong className="text-neutral-900 dark:text-white">Private Browsing Notice:</strong> Incognito/Private tabs delete data when closed. Always export a JSON backup if studying in private mode.
            </li>
            <li className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <strong className="text-neutral-900 dark:text-white">One-Click Backup:</strong> Click <strong>Backup</strong> in the header to download a complete JSON archive of all workspaces, documents, flashcards, diagrams, and summary sessions.
            </li>
            <li className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <strong className="text-neutral-900 dark:text-white">Lightweight Saving Files:</strong> Rather than keeping and exporting heavy raw PDFs and images, StudyDezk preserves the summary content and diagrams alongside the original file names for context. Saved study archives stay feather-light (under 50KB) and load instantly.
            </li>
          </ul>
        </div>
      ),
    },
  ];

  const activeSection = sections.find((s) => s.id === activeSectionId) || sections[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-black shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90dvh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-white dark:bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                StudyDezk Usability Guide
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Simple, focused offline university study suite manual
              </p>
            </div>
          </div>
          <button
            onClick={() => setGuideModalOpen(false)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition cursor-pointer"
            aria-label="Close guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Two-column layout (sidebar nav + content) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Section Navigation */}
          <nav className="w-full md:w-56 border-b md:border-b-0 md:border-r border-neutral-200 dark:border-neutral-800 p-2 md:p-3 overflow-x-auto md:overflow-y-auto shrink-0 bg-neutral-50/70 dark:bg-neutral-950 flex md:flex-col gap-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === activeSection.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSectionId(section.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer whitespace-nowrap text-left ${
                    isActive
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{section.title}</span>
                </button>
              );
            })}
          </nav>

          {/* Section Content Area */}
          <div className="flex-1 p-5 md:p-6 overflow-y-auto bg-white dark:bg-black">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-neutral-100 dark:border-neutral-900">
              <activeSection.icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="font-serif font-bold text-base text-neutral-900 dark:text-white">
                {activeSection.title}
              </h4>
            </div>
            {activeSection.content}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-neutral-500">
            StudyDezk v1.0 • No remote servers • Offline
          </span>
          <button
            onClick={() => setGuideModalOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold hover:opacity-90 transition cursor-pointer text-xs"
          >
            Got it, let's study!
          </button>
        </div>
      </div>
    </div>
  );
};
