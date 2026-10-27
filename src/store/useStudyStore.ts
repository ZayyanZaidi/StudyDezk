import { create } from 'zustand';
import { db, StoredEmbedding } from '../db';
import { StudyDocument, CourseCategory, ProcessingProgress } from '../types/document';
import { Flashcard } from '../types/flashcard';
import { GlossaryTerm } from '../types/glossary';
import { DiagramSpec, DiagramType } from '../types/diagram';
import { Workspace } from '../types/workspace';
import { SummarySession } from '../types/session';
import { mergeSlideLines } from '../logic/extraction/slideMerger';
import { extractPdf } from '../logic/extraction/pdf';
import { workerManager } from '../workers/workerManager';
import { extractGlossaryTerms } from '../logic/extraction/keywords';
import { generateFlashcardsFromText } from '../logic/flashcards/generator';
import { generateMindmap } from '../logic/diagrams/mindmap';
import { generateFlowchart } from '../logic/diagrams/flowchart';
import { generateConceptGraph } from '../logic/diagrams/conceptGraph';
import { defaultSummarizer } from '../logic/summarizer';
import { INITIAL_WORKSPACES, createInitialSampleDocuments } from './sampleData';
import {
  checkStorageDurability,
  recordDataChange,
  recordBackupExported,
  StorageStatus,
} from '../logic/durability/storageDurability';

interface StudyState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  selectedCourse: string;
  documents: StudyDocument[];
  activeDocumentId: string | null;
  flashcards: Flashcard[];
  glossaryTerms: GlossaryTerm[];
  diagrams: DiagramSpec[];
  sessionHistories: SummarySession[];
  activeTab: 'summary' | 'flashcards' | 'glossary' | 'diagrams' | 'rawText' | 'history';
  activeDiagramType: DiagramType;
  processingProgress: ProcessingProgress;
  isProcessing: boolean;
  abortController: AbortController | null;
  searchOpen: boolean;
  backupOpen: boolean;
  workspaceModalOpen: boolean;
  guideModalOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  storageStatus: StorageStatus;
  dismissedBackupReminder: boolean;

  // Actions
  initialize: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
  setGuideModalOpen: (open: boolean) => void;
  setSelectedCourse: (course: string) => void;
  setActiveWorkspace: (id: string) => void;
  createWorkspace: (name: string, course: string, color: string, description?: string) => Promise<Workspace>;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  setActiveDocument: (id: string | null) => void;
  setActiveTab: (tab: 'summary' | 'flashcards' | 'glossary' | 'diagrams' | 'rawText' | 'history') => void;
  setActiveDiagramType: (type: DiagramType) => void;
  setSearchOpen: (open: boolean) => void;
  setBackupOpen: (open: boolean) => void;
  setWorkspaceModalOpen: (open: boolean) => void;
  dismissBackupAlert: () => void;

  processFile: (file: File, course: CourseCategory, customTitle?: string) => Promise<StudyDocument | null>;
  cancelProcessing: () => void;
  deleteDocument: (id: string) => Promise<void>;
  toggleSlideMerge: (id: string) => Promise<void>;
  updateDiagramMermaidCode: (diagramId: string, newCode: string) => Promise<void>;
  reviewFlashcard: (cardId: string, known: boolean) => Promise<void>;

  // Session History
  saveSummarySession: (params: {
    documentId: string;
    documentTitle: string;
    fileName?: string;
    title: string;
    requirement?: string;
    options: SummarySession['options'];
    result: SummarySession['result'];
    diagrams?: DiagramSpec[];
  }) => Promise<SummarySession>;
  renameSummarySession: (id: string, newTitle: string) => Promise<void>;
  deleteSummarySession: (id: string) => Promise<void>;

  refreshAllData: () => Promise<void>;
  notifyBackupCompleted: () => void;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: 'ws-cloud',
  selectedCourse: 'All Courses',
  documents: [],
  activeDocumentId: null,
  flashcards: [],
  glossaryTerms: [],
  diagrams: [],
  sessionHistories: [],
  activeTab: 'summary',
  activeDiagramType: 'mindmap',
  processingProgress: {
    stage: 'idle',
    percentage: 0,
    message: '',
    cancellable: false,
  },
  isProcessing: false,
  abortController: null,
  searchOpen: false,
  backupOpen: false,
  workspaceModalOpen: false,
  guideModalOpen: false,
  theme: 'light',
  dismissedBackupReminder: false,
  storageStatus: {
    isPersisted: false,
    isPrivateMode: false,
    needsBackupReminder: false,
    daysSinceLastBackup: 0,
    changesCount: 0,
    usageBytes: 0,
    quotaBytes: 0,
  },

  setTheme: (theme) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('studydezk_theme', theme);
    }
    const isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    }
    set({ theme });
  },

  toggleTheme: () => {
    const currentTheme = get().theme;
    const isDarkNow =
      currentTheme === 'dark' ||
      (currentTheme === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    const nextTheme = isDarkNow ? 'light' : 'dark';
    get().setTheme(nextTheme);
  },

  setGuideModalOpen: (open) => {
    set({ guideModalOpen: open });
  },

  initialize: async () => {
    try {
      // 0. Ensure default chats are purged (no default chat UI/threads)
      try {
        await db.chatThreads.clear();
        await db.chatMessages.clear();
      } catch {
        // ignore if not yet initialized
      }

      // 0b. Initialize Theme
      const savedTheme = (typeof localStorage !== 'undefined'
        ? localStorage.getItem('studydezk_theme')
        : null) as 'light' | 'dark' | 'system' | null;
      get().setTheme(savedTheme || 'light');

      // 1. Check storage durability and persist()
      const storageStatus = await checkStorageDurability();
      set({ storageStatus });

      // 2. Initialize workspaces
      let existingWorkspaces = await db.workspaces.toArray();
      if (existingWorkspaces.length === 0) {
        await db.workspaces.bulkPut(INITIAL_WORKSPACES);
        existingWorkspaces = INITIAL_WORKSPACES;
      }

      // 3. Initialize documents
      let docs = await db.documents.toArray();
      if (docs.length === 0) {
        const seedDocs = createInitialSampleDocuments();
        await db.documents.bulkPut(seedDocs);

        // Pre-generate flashcards, glossary, diagrams for seed docs
        const allCards: Flashcard[] = [];
        const allGlossary: GlossaryTerm[] = [];
        const allDiagrams: DiagramSpec[] = [];

        for (const doc of seedDocs) {
          const wsId = doc.workspaceId || 'ws-cloud';
          const cards = generateFlashcardsFromText(doc.processedText, doc.id, doc.course, wsId);
          const glossary = extractGlossaryTerms(doc.processedText, doc.id, doc.title, doc.course, wsId);
          const mindmap = generateMindmap(doc.processedText, doc.id, doc.title, wsId);
          const flowchart = generateFlowchart(doc.processedText, doc.id, doc.title, wsId);
          const conceptGraph = generateConceptGraph(doc.processedText, doc.id, doc.title, wsId);

          allCards.push(...cards);
          allGlossary.push(...glossary);
          allDiagrams.push(mindmap, flowchart, conceptGraph);
        }

        await db.flashcards.bulkPut(allCards);
        await db.glossary.bulkPut(allGlossary);
        await db.diagrams.bulkPut(allDiagrams);

        // Pre-generate initial summary sessions with diagrams and file names saved for context
        const initialSessions: SummarySession[] = [];
        for (const doc of seedDocs) {
          const wsId = doc.workspaceId || 'ws-cloud';
          const docDiagrams = allDiagrams.filter((d) => d.documentId === doc.id);
          const summaryRes = await defaultSummarizer.summarize(doc.processedText, {
            lengthMode: 'auto',
            outputStyle: 'bullets',
          });

          initialSessions.push({
            id: `sess-seed-${doc.id}`,
            workspaceId: wsId,
            documentId: doc.id,
            documentTitle: doc.title,
            fileName: doc.fileName,
            title: `Key Takeaways: ${doc.title}`,
            options: { lengthMode: 'auto', outputStyle: 'bullets' },
            result: summaryRes,
            diagrams: docDiagrams,
            createdAt: Date.now() - 1000 * 60 * 60 * 2,
            updatedAt: Date.now() - 1000 * 60 * 60 * 2,
          });
        }
        await db.sessionHistories.bulkPut(initialSessions);

        docs = seedDocs;
      }

      const activeWs = existingWorkspaces[0]?.id || 'ws-cloud';
      const wsDocs = docs.filter((d) => d.workspaceId === activeWs);
      const activeDocId = wsDocs[0]?.id || docs[0]?.id || null;

      set({
        workspaces: existingWorkspaces,
        activeWorkspaceId: activeWs,
        documents: docs,
        activeDocumentId: activeDocId,
      });

      await get().refreshAllData();
    } catch (err) {
      console.error('Failed to initialize database:', err);
    }
  },

  refreshAllData: async () => {
    const workspaces = await db.workspaces.toArray();
    const docs = await db.documents.toArray();
    const flashcards = await db.flashcards.toArray();
    const glossaryTerms = await db.glossary.toArray();
    const diagrams = await db.diagrams.toArray();
    const sessionHistories = await db.sessionHistories.toArray();

    // Re-check durability metrics
    const storageStatus = await checkStorageDurability();

    set({
      workspaces,
      documents: docs,
      flashcards,
      glossaryTerms,
      diagrams,
      sessionHistories,
      storageStatus,
    });
  },

  setSelectedCourse: (course) => {
    set({ selectedCourse: course });
  },

  setActiveWorkspace: (id) => {
    const { documents, workspaces } = get();
    const targetWs = workspaces.find((w) => w.id === id);
    const wsDocs = documents.filter((d) => d.workspaceId === id);
    set({
      activeWorkspaceId: id,
      selectedCourse: targetWs ? targetWs.course : 'All Courses',
      activeDocumentId: wsDocs[0]?.id || null,
      activeTab: 'summary',
    });
  },

  createWorkspace: async (name, course, color, description) => {
    const newWs: Workspace = {
      id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      course: course.trim(),
      color,
      description: description?.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.workspaces.put(newWs);
    recordDataChange();
    await get().refreshAllData();
    set({
      activeWorkspaceId: newWs.id,
      selectedCourse: newWs.course,
      activeDocumentId: null,
      activeTab: 'summary',
    });
    return newWs;
  },

  updateWorkspace: async (id, updates) => {
    const ws = get().workspaces.find((w) => w.id === id);
    if (!ws) return;

    const updated: Workspace = {
      ...ws,
      ...updates,
      updatedAt: Date.now(),
    };

    await db.workspaces.put(updated);
    recordDataChange();
    await get().refreshAllData();
  },

  deleteWorkspace: async (id) => {
    const { workspaces, activeWorkspaceId } = get();
    if (workspaces.length <= 1) {
      alert('You must have at least one workspace.');
      return;
    }

    await db.workspaces.delete(id);
    await db.documents.where('workspaceId').equals(id).delete();
    await db.flashcards.where('workspaceId').equals(id).delete();
    await db.glossary.where('workspaceId').equals(id).delete();
    await db.diagrams.where('workspaceId').equals(id).delete();
    await db.sessionHistories.where('workspaceId').equals(id).delete();
    await db.embeddings.where('workspaceId').equals(id).delete();

    recordDataChange();
    const remaining = workspaces.filter((w) => w.id !== id);
    const nextWs = remaining[0]?.id || 'ws-cloud';
    const nextWsObj = remaining[0];

    await get().refreshAllData();
    const nextDocs = get().documents.filter((d) => d.workspaceId === nextWs);
    set({
      activeWorkspaceId: nextWs,
      selectedCourse: nextWsObj ? nextWsObj.course : 'All Courses',
      activeDocumentId: nextDocs[0]?.id || null,
      activeTab: 'summary',
    });
  },

  setActiveDocument: (id) => {
    set({ activeDocumentId: id });
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  setActiveDiagramType: (type) => {
    set({ activeDiagramType: type });
  },

  setSearchOpen: (open) => {
    set({ searchOpen: open });
  },

  setBackupOpen: (open) => {
    set({ backupOpen: open });
  },

  setWorkspaceModalOpen: (open) => {
    set({ workspaceModalOpen: open });
  },

  dismissBackupAlert: () => {
    set({ dismissedBackupReminder: true });
  },

  notifyBackupCompleted: () => {
    recordBackupExported();
    get().refreshAllData();
  },

  cancelProcessing: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    set({
      isProcessing: false,
      abortController: null,
      processingProgress: {
        stage: 'idle',
        percentage: 0,
        message: 'Processing cancelled by user.',
        cancellable: false,
      },
    });
  },

  processFile: async (file: File, course: CourseCategory, customTitle?: string) => {
    const { activeWorkspaceId } = get();
    const abortController = new AbortController();
    const signal = abortController.signal;

    set({
      isProcessing: true,
      abortController,
      processingProgress: {
        stage: 'reading',
        percentage: 10,
        message: `Analyzing ${file.name}...`,
        cancellable: true,
      },
    });

    try {
      const lowerName = file.name.toLowerCase();
      const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
      const isImage =
        file.type.startsWith('image/') ||
        /\.(png|jpe?g|webp|bmp|gif|tiff|heic|heif|svg)$/i.test(lowerName);
      const isText =
        file.type.startsWith('text/') ||
        file.type === 'application/json' ||
        file.type === 'application/rtf' ||
        /\.(txt|md|markdown|rst|csv|tsv|json|rtf|html|htm|log)$/i.test(lowerName);

      let detectedFileType: 'pdf' | 'image' | 'text' | 'document' = 'document';
      let fullRawText = '';
      const pagesList: StudyDocument['pages'] = [];

      if (isPdf) {
        detectedFileType = 'pdf';
        set({
          processingProgress: {
            stage: 'extracting',
            percentage: 20,
            message: 'Parsing PDF text layers...',
            cancellable: true,
          },
        });

        const extraction = await extractPdf(
          file,
          (p) => {
            const pct = 20 + Math.round((p.currentPage / p.totalPages) * 45);
            set({
              processingProgress: {
                stage: p.stage,
                percentage: pct,
                message: p.message,
                currentPage: p.currentPage,
                totalPages: p.totalPages,
                cancellable: true,
              },
            });
          },
          signal
        );

        fullRawText = extraction.fullText;
        pagesList.push(...extraction.pages);
      } else if (isImage) {
        detectedFileType = 'image';
        set({
          processingProgress: {
            stage: 'ocr',
            percentage: 30,
            message: 'Running Tesseract OCR on image notes...',
            cancellable: true,
          },
        });

        const ocrText = await workerManager.runOcr(
          file,
          (pct, status) => {
            set({
              processingProgress: {
                stage: 'ocr',
                percentage: 30 + Math.round(pct * 0.4),
                message: status,
                cancellable: true,
              },
            });
          },
          signal
        );

        fullRawText = ocrText;
        pagesList.push({
          pageNumber: 1,
          text: ocrText,
          hasTextLayer: false,
          ocrApplied: true,
          wordCount: ocrText.split(/\s+/).filter(Boolean).length,
        });
      } else if (isText) {
        detectedFileType = 'text';
        set({
          processingProgress: {
            stage: 'extracting',
            percentage: 35,
            message: `Reading notes file (${file.name})...`,
            cancellable: true,
          },
        });

        const textContent = await file.text();
        fullRawText = textContent;

        // Partition into pages by form feeds \f or markdown heading breaks # or paragraph blocks
        const splits = textContent.split(/\f|\n(?=#{1,2}\s+)/).filter((s) => s.trim().length > 0);
        const effectivePages = splits.length > 0 ? splits : [textContent];

        effectivePages.forEach((chunk, idx) => {
          pagesList.push({
            pageNumber: idx + 1,
            text: chunk.trim(),
            hasTextLayer: true,
            ocrApplied: false,
            wordCount: chunk.split(/\s+/).filter(Boolean).length,
          });
        });
      } else {
        // Universal fallback: test UTF-8 readability, fallback to image OCR
        detectedFileType = 'document';
        set({
          processingProgress: {
            stage: 'reading',
            percentage: 25,
            message: `Analyzing file data (${file.name})...`,
            cancellable: true,
          },
        });

        try {
          const raw = await file.text();
          const nonPrintable = (raw.slice(0, 1000).match(/[\x00-\x08\x0E-\x1F]/g) || []).length;
          if (raw.trim().length > 10 && nonPrintable < 15) {
            fullRawText = raw;
            pagesList.push({
              pageNumber: 1,
              text: raw.trim(),
              hasTextLayer: true,
              ocrApplied: false,
              wordCount: raw.split(/\s+/).filter(Boolean).length,
            });
          } else {
            // Binary fallback: run OCR in case it's a mobile photo without extension
            detectedFileType = 'image';
            const ocrText = await workerManager.runOcr(
              file,
              (pct, status) => {
                set({
                  processingProgress: {
                    stage: 'ocr',
                    percentage: 30 + Math.round(pct * 0.4),
                    message: status,
                    cancellable: true,
                  },
                });
              },
              signal
            );
            fullRawText = ocrText;
            pagesList.push({
              pageNumber: 1,
              text: ocrText,
              hasTextLayer: false,
              ocrApplied: true,
              wordCount: ocrText.split(/\s+/).filter(Boolean).length,
            });
          }
        } catch {
          throw new Error(`Unable to extract text from ${file.name}. Please upload a readable document or image.`);
        }
      }

      if (!fullRawText.trim()) {
        throw new Error('No legible text could be extracted from this document.');
      }

      set({
        processingProgress: {
          stage: 'segmenting',
          percentage: 70,
          message: 'Merging slide bullets and segmenting sentences...',
          cancellable: true,
        },
      });

      const mergeResult = mergeSlideLines(fullRawText);
      const processedText = mergeResult.mergedText || fullRawText;

      const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const title =
        customTitle?.trim() ||
        file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      const newDoc: StudyDocument = {
        id: docId,
        workspaceId: activeWorkspaceId,
        title,
        course,
        fileName: file.name,
        fileType: detectedFileType,
        fileSize: file.size,
        totalPages: pagesList.length,
        pages: pagesList,
        fullText: fullRawText,
        processedText,
        slideMergeApplied: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      set({
        processingProgress: {
          stage: 'saving',
          percentage: 80,
          message: 'Extracting key terms, acronyms, and flashcards...',
          cancellable: false,
        },
      });

      const cards = generateFlashcardsFromText(processedText, docId, course, activeWorkspaceId);
      const glossary = extractGlossaryTerms(processedText, docId, title, course, activeWorkspaceId);
      const mindmap = generateMindmap(processedText, docId, title, activeWorkspaceId);
      const flowchart = generateFlowchart(processedText, docId, title, activeWorkspaceId);
      const conceptGraph = generateConceptGraph(processedText, docId, title, activeWorkspaceId);

      await db.documents.put(newDoc);
      if (cards.length > 0) await db.flashcards.bulkPut(cards);
      if (glossary.length > 0) await db.glossary.bulkPut(glossary);
      await db.diagrams.bulkPut([mindmap, flowchart, conceptGraph]);

      // Background vector embeddings
      set({
        processingProgress: {
          stage: 'embedding',
          percentage: 90,
          message: 'Generating offline semantic search index...',
          cancellable: true,
        },
      });

      const sentences = processedText.split(/(?<=[.?!])\s+/).filter((s) => s.length > 20);
      try {
        const vectors = await workerManager.getBatchEmbeddings(sentences.slice(0, 30), undefined, signal);
        const storedList: StoredEmbedding[] = [];
        for (let i = 0; i < vectors.length; i++) {
          storedList.push({
            id: `${docId}-sent-${i}`,
            workspaceId: activeWorkspaceId,
            documentId: docId,
            pageNumber: 1,
            text: sentences[i],
            vector: vectors[i],
          });
        }
        if (storedList.length > 0) {
          await db.embeddings.bulkPut(storedList);
        }
      } catch (embErr) {
        console.warn('Background embedding index skipped or deferred:', embErr);
      }

      recordDataChange();

      set({
        processingProgress: {
          stage: 'completed',
          percentage: 100,
          message: 'Extraction complete!',
          cancellable: false,
        },
        isProcessing: false,
        abortController: null,
        activeDocumentId: docId,
      });

      await get().refreshAllData();
      return newDoc;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        set({
          isProcessing: false,
          abortController: null,
          processingProgress: {
            stage: 'idle',
            percentage: 0,
            message: 'Processing was cancelled.',
            cancellable: false,
          },
        });
        return null;
      }

      const msg = err instanceof Error ? err.message : 'Unknown processing error';
      set({
        isProcessing: false,
        abortController: null,
        processingProgress: {
          stage: 'error',
          percentage: 0,
          message: msg,
          cancellable: false,
        },
      });
      return null;
    }
  },

  deleteDocument: async (id: string) => {
    await db.documents.delete(id);
    await db.flashcards.where('documentId').equals(id).delete();
    await db.glossary.where('documentId').equals(id).delete();
    await db.diagrams.where('documentId').equals(id).delete();
    await db.embeddings.where('documentId').equals(id).delete();
    await db.sessionHistories.where('documentId').equals(id).delete();

    recordDataChange();
    const { activeWorkspaceId } = get();
    const remaining = get().documents.filter((d) => d.id !== id);
    const wsDocs = remaining.filter((d) => d.workspaceId === activeWorkspaceId);
    const nextActive = wsDocs[0]?.id || null;

    set({
      documents: remaining,
      activeDocumentId: nextActive,
    });
    await get().refreshAllData();
  },

  toggleSlideMerge: async (id: string) => {
    const doc = get().documents.find((d) => d.id === id);
    if (!doc) return;

    const nextApplied = !doc.slideMergeApplied;
    let nextProcessedText = doc.processedText;

    if (nextApplied) {
      const result = mergeSlideLines(doc.fullText);
      nextProcessedText = result.mergedText;
    } else {
      nextProcessedText = doc.fullText;
    }

    const updatedDoc: StudyDocument = {
      ...doc,
      slideMergeApplied: nextApplied,
      processedText: nextProcessedText,
      updatedAt: Date.now(),
    };

    await db.documents.put(updatedDoc);
    await get().refreshAllData();
  },

  updateDiagramMermaidCode: async (diagramId: string, newCode: string) => {
    const diagram = get().diagrams.find((d) => d.id === diagramId);
    if (!diagram) return;

    const updated: DiagramSpec = {
      ...diagram,
      mermaidCode: newCode,
    };

    await db.diagrams.put(updated);
    const diagrams = await db.diagrams.toArray();
    set({ diagrams });
  },

  reviewFlashcard: async (cardId: string, known: boolean) => {
    const card = get().flashcards.find((c) => c.id === cardId);
    if (!card) return;

    const prev = card.reviewState;
    const knownCount = known ? prev.knownCount + 1 : prev.knownCount;
    const hardCount = !known ? prev.hardCount + 1 : prev.hardCount;
    const repetitions = known ? prev.repetitions + 1 : 0;
    const interval = known ? Math.max(1, Math.round(prev.interval * prev.easeFactor)) : 1;
    const easeFactor = known ? Math.min(2.8, prev.easeFactor + 0.1) : Math.max(1.3, prev.easeFactor - 0.2);

    const updatedCard: Flashcard = {
      ...card,
      reviewState: {
        interval,
        repetitions,
        easeFactor,
        knownCount,
        hardCount,
        lastReviewedAt: Date.now(),
        nextReviewAt: Date.now() + interval * 24 * 60 * 60 * 1000,
      },
    };

    await db.flashcards.put(updatedCard);
    const flashcards = await db.flashcards.toArray();
    set({ flashcards });
  },

  // Session History Management - Save summary content and diagrams with original file names for context
  saveSummarySession: async ({ documentId, documentTitle, fileName, title, requirement, options, result, diagrams }) => {
    const { activeWorkspaceId, documents, diagrams: allDiagrams } = get();
    const doc = documents.find((d) => d.id === documentId);
    const resolvedFileName = fileName || doc?.fileName || `${documentTitle}.pdf`;
    const resolvedDiagrams = diagrams || allDiagrams.filter((diag) => diag.documentId === documentId);

    const newSession: SummarySession = {
      id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      workspaceId: activeWorkspaceId,
      documentId,
      documentTitle,
      fileName: resolvedFileName,
      title: title.trim() || `Summary: ${documentTitle}`,
      requirement: requirement?.trim(),
      options,
      result,
      diagrams: resolvedDiagrams,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.sessionHistories.put(newSession);
    recordDataChange();
    await get().refreshAllData();
    return newSession;
  },

  renameSummarySession: async (id, newTitle) => {
    const sess = get().sessionHistories.find((s) => s.id === id);
    if (!sess) return;

    const updated: SummarySession = {
      ...sess,
      title: newTitle.trim(),
      updatedAt: Date.now(),
    };

    await db.sessionHistories.put(updated);
    await get().refreshAllData();
  },

  deleteSummarySession: async (id) => {
    await db.sessionHistories.delete(id);
    await get().refreshAllData();
  },
}));
