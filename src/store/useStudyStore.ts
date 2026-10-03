import { create } from 'zustand';
import { db, StoredEmbedding } from '../db';
import { StudyDocument, CourseCategory, ProcessingProgress } from '../types/document';
import { Flashcard } from '../types/flashcard';
import { GlossaryTerm } from '../types/glossary';
import { DiagramSpec, DiagramType } from '../types/diagram';
import { Workspace } from '../types/workspace';
import { SummarySession } from '../types/session';
import { ChatThread, ChatMessage } from '../types/chat';
import { ExtractedFigure, CropBox } from '../types/figure';
import { reCropFigureBlob } from '../logic/extraction/figures';
import { answerQuestionTokenEfficiently } from '../logic/chat/tokenEfficientQA';
import { mergeSlideLines } from '../logic/extraction/slideMerger';
import { extractPdf } from '../logic/extraction/pdf';
import { workerManager } from '../workers/workerManager';
import { extractGlossaryTerms } from '../logic/extraction/keywords';
import { generateFlashcardsFromText } from '../logic/flashcards/generator';
import { generateMindmap } from '../logic/diagrams/mindmap';
import { generateFlowchart } from '../logic/diagrams/flowchart';
import { generateConceptGraph } from '../logic/diagrams/conceptGraph';
import { defaultSummarizer } from '../logic/summarizer';
import { cleanDocumentPages } from '../logic/cleaning/documentCleaner';
import { detectSectionBoundaries } from '../logic/summarizer/paragraphFormatter';
import { INITIAL_WORKSPACES, createInitialSampleDocuments } from './sampleData';
import {
  CachedDocumentOutput,
  ManualUserEdit,
  CourseCompilation,
  CompilationPreset,
  DocumentCompilationConfig,
  CompilationSection,
} from '../types/compilation';
import { compileCourse } from '../logic/compilation/incrementalCompiler';
import { computeFileContentHash, computeStringHash } from '../logic/compilation/hasher';
import { makeSafeAnchorId } from '../logic/compilation/tocGenerator';
import {
  checkStorageDurability,
  recordDataChange,
  recordBackupExported,
  StorageStatus,
} from '../logic/durability/storageDurability';

export interface PipelineDebugStage {
  stage: 'extract' | 'clean' | 'segment' | 'summarize' | 'figures';
  name: string;
  inputSize: string;
  outputSize: string;
  itemCount: number;
  durationMs: number;
  details: string;
  skipped: boolean;
}

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
  chatThreads: ChatThread[];
  chatMessages: ChatMessage[];
  extractedFigures: ExtractedFigure[];
  pipelineDebugLogs: Record<string, PipelineDebugStage[]>;
  activeCompilation: CourseCompilation | null;
  compilations: Record<string, CourseCompilation>;
  cachedOutputs: Record<string, CachedDocumentOutput>;
  manualEdits: Record<string, ManualUserEdit>;
  coursePreset: CompilationPreset;
  courseRequirement: string;
  duplicateWarning: { open: boolean; message: string; duplicateDocTitle?: string } | null;
  activeThreadId: string | null;
  activeTab: 'summary' | 'flashcards' | 'glossary' | 'diagrams' | 'rawText' | 'history' | 'chat';
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
  setGuideModalOpen: (open: boolean) => void;
  setSelectedCourse: (course: string) => void;
  setActiveWorkspace: (id: string) => void;
  createWorkspace: (name: string, course: string, color: string, description?: string) => Promise<Workspace>;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  setActiveDocument: (id: string | null) => void;
  setActiveTab: (tab: 'summary' | 'flashcards' | 'glossary' | 'diagrams' | 'rawText' | 'history' | 'chat') => void;
  setActiveDiagramType: (type: DiagramType) => void;
  setSearchOpen: (open: boolean) => void;
  setBackupOpen: (open: boolean) => void;
  setWorkspaceModalOpen: (open: boolean) => void;
  dismissBackupAlert: () => void;

  processFile: (file: File, course: CourseCategory, customTitle?: string) => Promise<StudyDocument | null>;
  processMultipleFiles: (files: File[], course: CourseCategory, customCourseOrTitle?: string) => Promise<StudyDocument[]>;
  cancelProcessing: () => void;
  deleteDocument: (id: string) => Promise<void>;
  toggleSlideMerge: (id: string) => Promise<void>;
  updateDiagramMermaidCode: (diagramId: string, newCode: string) => Promise<void>;
  reviewFlashcard: (cardId: string, known: boolean) => Promise<void>;

  // Chat Actions
  createChatThread: (topic: string, documentId?: string) => Promise<ChatThread>;
  setActiveThreadId: (id: string | null) => void;
  updateThreadReferenceDocuments: (threadId: string, documentIds: string[]) => Promise<void>;
  sendChatMessage: (threadId: string, content: string, topic?: string) => Promise<void>;
  deleteChatThread: (id: string) => Promise<void>;
  renameChatThread: (id: string, newTitle: string) => Promise<void>;
  clearThreadMessages: (threadId: string) => Promise<void>;

  // Figure Actions
  updateFigureStatus: (figureId: string, status: 'kept' | 'removed') => Promise<void>;
  reCropFigure: (figureId: string, newCrop: CropBox) => Promise<void>;
  deleteFigure: (figureId: string) => Promise<void>;

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

  // Compilation Actions
  recompileCourseCompilation: (workspaceId?: string) => Promise<CourseCompilation | null>;
  setCoursePreset: (preset: CompilationPreset) => Promise<void>;
  setCourseRequirement: (requirement: string) => Promise<void>;
  updateDocumentConfig: (docId: string, updates: Partial<DocumentCompilationConfig>) => Promise<void>;
  moveDocumentOrder: (docId: string, direction: 'up' | 'down') => Promise<void>;
  saveManualSectionEdit: (sectionId: string, docId: string, updates: { userNotes?: string; customSummary?: string }) => Promise<void>;
  dismissDuplicateWarning: () => void;

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
  chatThreads: [],
  chatMessages: [],
  extractedFigures: [],
  pipelineDebugLogs: {},
  activeCompilation: null,
  compilations: {},
  cachedOutputs: {},
  manualEdits: {},
  coursePreset: 'standard',
  courseRequirement: '',
  duplicateWarning: null,
  activeThreadId: null,
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
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    set({ theme });
  },

  setGuideModalOpen: (open) => {
    set({ guideModalOpen: open });
  },

  initialize: async () => {
    try {
      // 0. Initialize Theme
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

        // Seed CachedDocumentOutput for each sample document
        const initialCached: CachedDocumentOutput[] = [];
        for (const doc of seedDocs) {
          const wsId = doc.workspaceId || 'ws-cloud';
          const docCards = allCards.filter((c) => c.documentId === doc.id);
          const docGlossary = allGlossary.filter((g) => g.documentId === doc.id);
          const docDiagrams = allDiagrams.filter((d) => d.documentId === doc.id);
          const boundaries = detectSectionBoundaries(doc.processedText, doc.title);
          const sections: CompilationSection[] = boundaries.map((b, bIdx) => ({
            id: `sec-${doc.id}-${bIdx}`,
            documentId: doc.id,
            documentTitle: doc.title,
            pageNumber: b.pageNumber,
            heading: b.heading,
            anchorId: makeSafeAnchorId('sec', `${doc.title}-${b.heading}`),
            summaryText: doc.processedText.slice(b.startIndex, b.endIndex || undefined).trim(),
            paragraphs: [doc.processedText.slice(b.startIndex, b.endIndex || undefined).trim()],
            figures: [],
          }));

          initialCached.push({
            documentId: doc.id,
            workspaceId: wsId,
            contentHash: computeStringHash(doc.fullText),
            fileName: doc.fileName,
            title: doc.title,
            cleanedText: doc.processedText,
            pageCount: 1,
            sections,
            figures: [],
            flashcards: docCards,
            glossaryTerms: docGlossary,
            diagrams: docDiagrams,
            processedAt: Date.now(),
          });
        }
        await db.cachedOutputs.bulkPut(initialCached);

        docs = seedDocs;
      }

      // Load chat threads, messages, and figures
      const chatThreads = await db.chatThreads.toArray();
      const chatMessages = await db.chatMessages.toArray();
      const extractedFigures = await db.extractedFigures.toArray();

      const activeWs = existingWorkspaces[0]?.id || 'ws-cloud';
      const wsDocs = docs.filter((d) => d.workspaceId === activeWs);
      const activeDocId = wsDocs[0]?.id || docs[0]?.id || null;

      const wsThreads = chatThreads.filter((t) => t.workspaceId === activeWs);
      const activeThreadId = wsThreads[0]?.id || chatThreads[0]?.id || null;

      set({
        workspaces: existingWorkspaces,
        activeWorkspaceId: activeWs,
        documents: docs,
        activeDocumentId: activeDocId,
        chatThreads,
        chatMessages,
        extractedFigures,
        activeThreadId,
      });

      await get().refreshAllData();

      // Ensure active workspace compilation is generated
      const { activeCompilation } = get();
      if (!activeCompilation) {
        await get().recompileCourseCompilation(activeWs);
      }
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
    const chatThreads = await db.chatThreads.toArray();
    const chatMessages = await db.chatMessages.toArray();
    const extractedFigures = await db.extractedFigures.toArray();
    const cachedOutputsList = await db.cachedOutputs.toArray();
    const manualEditsList = await db.manualEdits.toArray();
    const compilationsList = await db.compilations.toArray();

    const cachedOutputs: Record<string, CachedDocumentOutput> = {};
    for (const c of cachedOutputsList) {
      cachedOutputs[c.documentId] = c;
    }

    const manualEdits: Record<string, ManualUserEdit> = {};
    for (const e of manualEditsList) {
      manualEdits[e.sectionId] = e;
    }

    const compilations: Record<string, CourseCompilation> = {};
    for (const comp of compilationsList) {
      compilations[comp.workspaceId] = comp;
    }

    const { activeWorkspaceId } = get();
    const activeCompilation = compilations[activeWorkspaceId] || null;

    // Re-check durability metrics
    const storageStatus = await checkStorageDurability();

    set({
      workspaces,
      documents: docs,
      flashcards,
      glossaryTerms,
      diagrams,
      sessionHistories,
      chatThreads,
      chatMessages,
      extractedFigures,
      cachedOutputs,
      manualEdits,
      compilations,
      activeCompilation,
      storageStatus,
    });
  },

  setSelectedCourse: (course) => {
    set({ selectedCourse: course });
  },

  setActiveWorkspace: (id) => {
    const { documents, compilations } = get();
    const wsDocs = documents.filter((d) => d.workspaceId === id);
    const activeCompilation = compilations[id] || null;
    set({
      activeWorkspaceId: id,
      activeDocumentId: wsDocs[0]?.id || null,
      activeCompilation,
    });
    // If compilation doesn't exist yet, recompile for the workspace
    if (!activeCompilation) {
      get().recompileCourseCompilation(id);
    }
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
    set({ activeWorkspaceId: newWs.id, activeDocumentId: null });
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
    await db.extractedFigures.where('workspaceId').equals(id).delete();

    recordDataChange();
    const remaining = workspaces.filter((w) => w.id !== id);
    const nextWs = remaining[0]?.id || 'ws-cloud';

    set({ activeWorkspaceId: nextWs });
    await get().refreshAllData();
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
    const docs = await get().processMultipleFiles([file], course, customTitle);
    return docs[0] || null;
  },

  processMultipleFiles: async (files: File[], course: CourseCategory, customCourseOrTitle?: string) => {
    const { activeWorkspaceId } = get();
    if (!files || files.length === 0) return [];

    const abortController = new AbortController();
    const signal = abortController.signal;
    const totalFiles = files.length;
    const processedDocs: StudyDocument[] = [];

    const finalCourse = course === 'Custom'
      ? customCourseOrTitle?.trim() || 'General Studies'
      : course;

    set({
      isProcessing: true,
      abortController,
      processingProgress: {
        stage: 'reading',
        percentage: 5,
        message: `Preparing to process ${totalFiles} document(s)...`,
        cancellable: true,
      },
    });

    try {
      for (let i = 0; i < totalFiles; i++) {
        if (signal.aborted) break;
        const file = files[i];
        const fileWeight = 100 / totalFiles;
        const fileBasePct = Math.round(i * fileWeight);

        // Compute content hash to detect duplicates
        const contentHash = await computeFileContentHash(file);
        const existingWithHash = await db.cachedOutputs
          .where('workspaceId')
          .equals(activeWorkspaceId)
          .filter((c) => c.contentHash === contentHash)
          .first();

        if (existingWithHash) {
          set({
            duplicateWarning: {
              open: true,
              message: `"${file.name}" has already been uploaded to this course as "${existingWithHash.title}". Skipping duplicate.`,
              duplicateDocTitle: existingWithHash.title,
            },
          });
          continue;
        }

        set({
          processingProgress: {
            stage: 'reading',
            percentage: Math.min(95, fileBasePct + 5),
            message: `[${i + 1}/${totalFiles}] Reading ${file.name}...`,
            cancellable: true,
          },
        });

        const docId = `doc-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
        const docTitle = (totalFiles === 1 && customCourseOrTitle && course !== 'Custom')
          ? customCourseOrTitle.trim()
          : file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(file.name);

        const stageLogs: PipelineDebugStage[] = [];

        let fullRawText = '';
        const pagesList: StudyDocument['pages'] = [];
        const detectedFigures: ExtractedFigure[] = [];

        const tExtractStart = performance.now();
        if (isPdf) {
          const extraction = await extractPdf(
            file,
            (p) => {
              const innerPct = Math.round((p.currentPage / Math.max(1, p.totalPages)) * (fileWeight * 0.55));
              set({
                processingProgress: {
                  stage: p.stage,
                  percentage: Math.min(98, fileBasePct + innerPct),
                  message: `[${i + 1}/${totalFiles}] ${file.name}: ${p.message}`,
                  currentPage: p.currentPage,
                  totalPages: p.totalPages,
                  cancellable: true,
                },
              });
            },
            signal,
            { documentId: docId, workspaceId: activeWorkspaceId }
          );
          fullRawText = extraction.fullText;
          pagesList.push(...extraction.pages);
          if (extraction.figures && extraction.figures.length > 0) {
            detectedFigures.push(...extraction.figures);
          }
        } else if (isImage) {
          set({
            processingProgress: {
              stage: 'ocr',
              percentage: Math.min(98, fileBasePct + Math.round(fileWeight * 0.2)),
              message: `[${i + 1}/${totalFiles}] OCR scanning ${file.name}...`,
              cancellable: true,
            },
          });

          const ocrText = await workerManager.runOcr(
            file,
            (pct, status) => {
              set({
                processingProgress: {
                  stage: 'ocr',
                  percentage: Math.min(98, fileBasePct + Math.round((pct / 100) * fileWeight * 0.55)),
                  message: `[${i + 1}/${totalFiles}] ${file.name}: ${status}`,
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

          // Store the uploaded image as a figure directly
          try {
            const imgBitmap = await createImageBitmap(file);
            const canvas = document.createElement('canvas');
            canvas.width = imgBitmap.width;
            canvas.height = imgBitmap.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(imgBitmap, 0, 0);
              const fullBlob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', 0.85));
              // Thumbnail
              const thumbMax = 280;
              const tScale = Math.min(1, thumbMax / Math.max(imgBitmap.width, imgBitmap.height));
              const thumbCanvas = document.createElement('canvas');
              thumbCanvas.width = Math.max(1, Math.round(imgBitmap.width * tScale));
              thumbCanvas.height = Math.max(1, Math.round(imgBitmap.height * tScale));
              const tCtx = thumbCanvas.getContext('2d');
              let thumbBlob: Blob | null = null;
              if (tCtx) {
                tCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
                thumbBlob = await new Promise<Blob | null>((res) => thumbCanvas.toBlob(res, 'image/webp', 0.75));
              }
              if (fullBlob) {
                detectedFigures.push({
                  id: `fig-${docId}-1-0`,
                  documentId: docId,
                  workspaceId: activeWorkspaceId,
                  pageNumber: 1,
                  figureIndex: 0,
                  caption: `Image: ${docTitle}`,
                  blob: fullBlob,
                  thumbnailBlob: thumbBlob || fullBlob,
                  mimeType: 'image/webp',
                  width: imgBitmap.width,
                  height: imgBitmap.height,
                  cropBox: { x: 0, y: 0, width: imgBitmap.width, height: imgBitmap.height },
                  score: 1.0,
                  detectedBy: 'operator_list',
                  userStatus: 'kept',
                  createdAt: Date.now(),
                });
              }
            }
          } catch (imgErr) {
            console.warn('Could not generate figure blob for uploaded image:', imgErr);
          }
        }
        const tExtractEnd = performance.now();

        if (!fullRawText.trim()) {
          console.warn(`No text extracted for file: ${file.name}`);
          continue;
        }

        // 1. Log Extract Stage
        stageLogs.push({
          stage: 'extract',
          name: '1. Extraction',
          inputSize: `${(file.size / 1024).toFixed(1)} KB`,
          outputSize: `${fullRawText.length} chars (${pagesList.length} pages)`,
          itemCount: pagesList.length,
          durationMs: Math.max(1, Math.round(tExtractEnd - tExtractStart)),
          details: `Extracted text from ${file.name} using ${isPdf ? 'PDF text layer' : 'OCR'}.`,
          skipped: false,
        });

        // 2. Stage: CLEAN (Document Cleaner)
        const tCleanStart = performance.now();
        const rawChars = pagesList.reduce((acc: number, p) => acc + (p.text?.length || 0), 0);
        const cleanResult = cleanDocumentPages(pagesList);
        const cleanedPages = cleanResult.pages;
        const cleanedChars = cleanedPages.reduce((acc: number, p) => acc + (p.text?.length || 0), 0);

        const cleanedFullText = cleanedPages
          .map((p) => `--- Page ${p.pageNumber}: ${p.title || 'Slide'} ---\n\n${p.text}`)
          .join('\n\n');
        const mergeResult = mergeSlideLines(cleanedFullText);
        const processedText = mergeResult.mergedText || cleanedFullText;
        const tCleanEnd = performance.now();

        stageLogs.push({
          stage: 'clean',
          name: '2. Cleaning',
          inputSize: `${rawChars} chars`,
          outputSize: `${cleanedChars} chars`,
          itemCount: cleanedPages.length,
          durationMs: Math.max(1, Math.round(tCleanEnd - tCleanStart)),
          details: `Filtered ${cleanResult.stats.removedAdminPagesCount} admin slide(s), ${cleanResult.stats.removedFooterCount + cleanResult.stats.removedCopyrightCount} footer/copyright line(s), ${cleanResult.stats.removedGarbledLinesCount} garbled OCR line(s), fixed ${cleanResult.stats.fixedDefinitionTermsCount} definition-order pattern(s).`,
          skipped: false,
        });

        // 3. Stage: SEGMENT BY HEADING
        const tSegmentStart = performance.now();
        const detectedSections = detectSectionBoundaries(processedText);
        const tSegmentEnd = performance.now();

        stageLogs.push({
          stage: 'segment',
          name: '3. Heading Segmentation',
          inputSize: `${processedText.length} chars`,
          outputSize: `${detectedSections.length} section(s)`,
          itemCount: detectedSections.length,
          durationMs: Math.max(1, Math.round(tSegmentEnd - tSegmentStart)),
          details: `Identified ${detectedSections.length} structural section(s) (${detectedSections.slice(0, 3).map((s) => s.heading).join(', ')}${detectedSections.length > 3 ? '...' : ''}).`,
          skipped: false,
        });

        // 4. Stage: SUMMARIZE (Standard ~35% - Summarizer must NOT be bypassed)
        const tSummarizeStart = performance.now();
        const summaryRes = await defaultSummarizer.summarize(processedText, {
          lengthMode: 'percentage',
          lengthValue: 35,
          outputStyle: 'paragraph',
        });
        const tSummarizeEnd = performance.now();

        const compressionRatioPct = Math.round(
          (summaryRes.text.length / Math.max(1, processedText.length)) * 100
        );
        stageLogs.push({
          stage: 'summarize',
          name: '4. Summarization (Standard ~35%)',
          inputSize: `${processedText.length} chars`,
          outputSize: `${summaryRes.text.length} chars (~${compressionRatioPct}%)`,
          itemCount: summaryRes.structuredSections?.length || detectedSections.length,
          durationMs: Math.max(1, Math.round(tSummarizeEnd - tSummarizeStart)),
          details: `Generated Standard ~35% summary with ${summaryRes.summarySentenceCount} points across ${summaryRes.structuredSections?.length || 0} sections.`,
          skipped: false,
        });

        // 5. Stage: FIGURES
        const tFiguresStart = performance.now();
        const tFiguresEnd = performance.now();
        stageLogs.push({
          stage: 'figures',
          name: '5. Figure Extraction & Placement',
          inputSize: `${detectedFigures.length} figure(s) detected`,
          outputSize: `${detectedFigures.length} figure(s) mapped`,
          itemCount: detectedFigures.length,
          durationMs: Math.max(1, Math.round(tFiguresEnd - tFiguresStart)),
          details: `Processed ${detectedFigures.length} inline figure(s) mapped to respective pages/sections.`,
          skipped: false,
        });

        // Record debug logs in store state
        set((state) => ({
          pipelineDebugLogs: {
            ...state.pipelineDebugLogs,
            [docId]: stageLogs,
          },
        }));

        const newDoc: StudyDocument = {
          id: docId,
          workspaceId: activeWorkspaceId,
          title: docTitle,
          course: finalCourse,
          fileName: file.name,
          fileType: isPdf ? 'pdf' : 'image',
          fileSize: file.size,
          totalPages: Math.max(1, cleanedPages.length),
          pages: cleanedPages,
          fullText: fullRawText,
          processedText,
          slideMergeApplied: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const cards = generateFlashcardsFromText(processedText, docId, finalCourse, activeWorkspaceId);
        const glossary = extractGlossaryTerms(processedText, docId, docTitle, finalCourse, activeWorkspaceId);
        const mindmap = generateMindmap(processedText, docId, docTitle, activeWorkspaceId);
        const flowchart = generateFlowchart(processedText, docId, docTitle, activeWorkspaceId);
        const conceptGraph = generateConceptGraph(processedText, docId, docTitle, activeWorkspaceId);

        await db.documents.put(newDoc);
        if (cards.length > 0) await db.flashcards.bulkPut(cards);
        if (glossary.length > 0) await db.glossary.bulkPut(glossary);
        await db.diagrams.bulkPut([mindmap, flowchart, conceptGraph]);
        if (detectedFigures.length > 0) {
          await db.extractedFigures.bulkPut(detectedFigures);
        }

        // Save initial summary session so the summarizer output is immediately available
        await get().saveSummarySession({
          documentId: docId,
          documentTitle: docTitle,
          fileName: file.name,
          title: `Standard Summary (~35%): ${docTitle}`,
          options: {
            lengthMode: 'percentage',
            lengthValue: 35,
            outputStyle: 'paragraph',
          },
          result: summaryRes,
          diagrams: [mindmap, flowchart, conceptGraph],
        });

        // Background vector embeddings index
        const sentences = processedText.split(/(?<=[.?!])\s+/).filter((s: string) => s.length > 20);
        try {
          const vectors = await workerManager.getBatchEmbeddings(sentences.slice(0, 25), undefined, signal);
          const storedList: StoredEmbedding[] = [];
          for (let sIdx = 0; sIdx < vectors.length; sIdx++) {
            storedList.push({
              id: `${docId}-sent-${sIdx}`,
              workspaceId: activeWorkspaceId,
              documentId: docId,
              pageNumber: 1,
              text: sentences[sIdx],
              vector: vectors[sIdx],
            });
          }
          if (storedList.length > 0) {
            await db.embeddings.bulkPut(storedList);
          }
        } catch (embErr) {
          console.warn('Batch embedding index skipped or deferred:', embErr);
        }

        // Build structured sections for cache
        const compilationSections: CompilationSection[] = (
          summaryRes.structuredSections && summaryRes.structuredSections.length > 0
            ? summaryRes.structuredSections
            : detectedSections.map((ds, sIdx) => ({
                id: `sec-${docId}-${sIdx}`,
                heading: ds.heading,
                pageNumber: ds.pageNumber,
                paragraphs: [processedText.slice(ds.startIndex, ds.endIndex || undefined).trim()],
                sentenceScores: [],
                rawText: processedText.slice(ds.startIndex, ds.endIndex || undefined),
              }))
        ).map((sBlock, sIdx) => {
          const secFigures = detectedFigures.filter((f) => f.pageNumber === sBlock.pageNumber);
          return {
            id: `sec-${docId}-${sIdx}`,
            documentId: docId,
            documentTitle: docTitle,
            pageNumber: sBlock.pageNumber,
            heading: sBlock.heading,
            anchorId: makeSafeAnchorId('sec', `${docTitle}-${sBlock.heading}`),
            summaryText: sBlock.paragraphs.join('\n\n'),
            paragraphs: sBlock.paragraphs,
            figures: secFigures,
          };
        });

        // Save CachedDocumentOutput to IndexedDB
        const cachedDoc: CachedDocumentOutput = {
          documentId: docId,
          workspaceId: activeWorkspaceId,
          contentHash,
          fileName: file.name,
          title: docTitle,
          cleanedText: processedText,
          pageCount: Math.max(1, cleanedPages.length),
          sections: compilationSections,
          figures: detectedFigures,
          flashcards: cards,
          glossaryTerms: glossary,
          diagrams: [mindmap, flowchart, conceptGraph],
          processedAt: Date.now(),
        };
        await db.cachedOutputs.put(cachedDoc);

        processedDocs.push(newDoc);
      }

      recordDataChange();
      await get().refreshAllData();

      // Automatically recompile the unified course compilation with newly added document
      await get().recompileCourseCompilation(activeWorkspaceId);

      if (processedDocs.length > 0) {
        set({ activeDocumentId: processedDocs[0].id });
      }

      set({
        processingProgress: {
          stage: 'completed',
          percentage: 100,
          message: `Finished processing ${processedDocs.length} material(s)!`,
          cancellable: false,
        },
        isProcessing: false,
        abortController: null,
      });

      return processedDocs;
    } catch (err: any) {
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
        return processedDocs;
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
      return processedDocs;
    }
  },

  // Chat Actions
  createChatThread: async (topic: string, documentId?: string) => {
    const { activeWorkspaceId } = get();
    const cleanTopic = topic.trim() || 'General Study Discussion';
    const newThread: ChatThread = {
      id: `thread-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      workspaceId: activeWorkspaceId,
      documentId: documentId || undefined,
      title: cleanTopic,
      topic: cleanTopic,
      scope: documentId ? 'document' : 'workspace',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.chatThreads.put(newThread);
    const chatThreads = await db.chatThreads.toArray();
    set({ chatThreads, activeThreadId: newThread.id });
    return newThread;
  },

  setActiveThreadId: (id) => {
    set({ activeThreadId: id });
  },

  updateThreadReferenceDocuments: async (threadId: string, documentIds: string[]) => {
    const thread = get().chatThreads.find((t) => t.id === threadId);
    if (!thread) return;
    const updated: ChatThread = {
      ...thread,
      documentIds,
      scope: documentIds.length > 0 ? 'document' : 'workspace',
      updatedAt: Date.now(),
    };
    await db.chatThreads.put(updated);
    const chatThreads = await db.chatThreads.toArray();
    set({ chatThreads });
  },

  sendChatMessage: async (threadId: string, content: string, topic?: string) => {
    const { documents, activeDocumentId, activeWorkspaceId, chatThreads } = get();
    const cleanContent = content.trim();
    if (!cleanContent) return;

    const thread = chatThreads.find((t) => t.id === threadId);
    const effectiveTopic = topic?.trim() || thread?.topic || thread?.title || '';

    // Determine target documents (thread's custom reference documentIds, thread documentId, active doc, or workspace docs)
    let targetDocs: StudyDocument[] = [];
    if (thread?.documentIds && thread.documentIds.length > 0) {
      targetDocs = documents.filter((d) => thread.documentIds!.includes(d.id));
    } else if (thread?.documentId && thread.documentId !== 'all') {
      const doc = documents.find((d) => d.id === thread.documentId);
      if (doc) targetDocs = [doc];
    } else if (thread?.scope === 'document' && activeDocumentId) {
      const doc = documents.find((d) => d.id === activeDocumentId);
      if (doc) targetDocs = [doc];
    }

    if (targetDocs.length === 0) {
      targetDocs = documents.filter((d) => d.workspaceId === (thread?.workspaceId || activeWorkspaceId));
    }

    // 1. Create and persist user message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      threadId,
      role: 'user',
      content: cleanContent,
      topic: effectiveTopic,
      createdAt: Date.now(),
    };

    await db.chatMessages.put(userMsg);
    set((state) => ({
      chatMessages: [...state.chatMessages, userMsg],
    }));

    // Retrieve full chat history for chat continuance across conversation turns
    const threadHistory = get().chatMessages.filter((m) => m.threadId === threadId);

    // 2. Perform token-efficient grounded QA with chat history
    const qaResult = await answerQuestionTokenEfficiently(
      cleanContent,
      targetDocs,
      effectiveTopic,
      undefined,
      threadHistory
    );

    // 3. Create and persist assistant response
    const assistantMsg: ChatMessage = {
      id: `msg-${Date.now() + 1}-${Math.random().toString(36).slice(2, 6)}`,
      threadId,
      role: 'assistant',
      content: qaResult.answer,
      topic: effectiveTopic,
      citations: qaResult.citations,
      tokenStats: qaResult.tokenStats,
      createdAt: Date.now(),
    };

    await db.chatMessages.put(assistantMsg);

    // 4. Update thread updatedAt and topic title if initial
    if (thread) {
      const updatedThread: ChatThread = {
        ...thread,
        topic: effectiveTopic || thread.topic,
        title: thread.title === 'New Chat' || thread.title === 'General Study Discussion'
          ? (effectiveTopic || cleanContent.slice(0, 35))
          : thread.title,
        updatedAt: Date.now(),
      };
      await db.chatThreads.put(updatedThread);
    }

    const updatedThreads = await db.chatThreads.toArray();
    const updatedMessages = await db.chatMessages.toArray();
    set({
      chatThreads: updatedThreads,
      chatMessages: updatedMessages,
    });
  },

  deleteChatThread: async (id) => {
    await db.chatThreads.delete(id);
    await db.chatMessages.where('threadId').equals(id).delete();
    const chatThreads = await db.chatThreads.toArray();
    const chatMessages = await db.chatMessages.toArray();
    set((state) => ({
      chatThreads,
      chatMessages,
      activeThreadId: state.activeThreadId === id ? (chatThreads[0]?.id || null) : state.activeThreadId,
    }));
  },

  renameChatThread: async (id, newTitle) => {
    const thread = get().chatThreads.find((t) => t.id === id);
    if (!thread) return;
    const cleanTitle = newTitle.trim();
    const updated: ChatThread = {
      ...thread,
      title: cleanTitle,
      topic: cleanTitle,
      updatedAt: Date.now(),
    };
    await db.chatThreads.put(updated);
    const chatThreads = await db.chatThreads.toArray();
    set({ chatThreads });
  },

  clearThreadMessages: async (threadId) => {
    await db.chatMessages.where('threadId').equals(threadId).delete();
    const chatMessages = await db.chatMessages.toArray();
    set({ chatMessages });
  },

  deleteDocument: async (id: string) => {
    await db.documents.delete(id);
    await db.flashcards.where('documentId').equals(id).delete();
    await db.glossary.where('documentId').equals(id).delete();
    await db.diagrams.where('documentId').equals(id).delete();
    await db.embeddings.where('documentId').equals(id).delete();
    await db.sessionHistories.where('documentId').equals(id).delete();
    await db.extractedFigures.where('documentId').equals(id).delete();
    await db.cachedOutputs.delete(id);
    await db.manualEdits.where('documentId').equals(id).delete();

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
    await get().recompileCourseCompilation(activeWorkspaceId);
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

  // Figure Actions
  updateFigureStatus: async (figureId: string, status: 'kept' | 'removed') => {
    const fig = await db.extractedFigures.get(figureId);
    if (!fig) return;

    const updated: ExtractedFigure = {
      ...fig,
      userStatus: status,
    };

    await db.extractedFigures.put(updated);
    const extractedFigures = await db.extractedFigures.toArray();
    set({ extractedFigures });
  },

  reCropFigure: async (figureId: string, newCrop: CropBox) => {
    const fig = await db.extractedFigures.get(figureId);
    if (!fig) return;

    try {
      const { fullBlob, thumbnailBlob } = await reCropFigureBlob(fig.blob, newCrop);
      const updated: ExtractedFigure = {
        ...fig,
        blob: fullBlob,
        thumbnailBlob,
        cropBox: newCrop,
        width: Math.round(newCrop.width),
        height: Math.round(newCrop.height),
      };

      await db.extractedFigures.put(updated);
      const extractedFigures = await db.extractedFigures.toArray();
      set({ extractedFigures });
    } catch (err) {
      console.error('Failed to re-crop figure:', err);
    }
  },

  deleteFigure: async (figureId: string) => {
    await db.extractedFigures.delete(figureId);
    const extractedFigures = await db.extractedFigures.toArray();
    set({ extractedFigures });
    // Recompile after figure deletion
    get().recompileCourseCompilation();
  },

  // Compilation Actions
  recompileCourseCompilation: async (workspaceId?: string) => {
    const {
      activeWorkspaceId,
      workspaces,
      cachedOutputs,
      manualEdits,
      coursePreset,
      courseRequirement,
      compilations,
    } = get();

    const targetWsId = workspaceId || activeWorkspaceId;
    const ws = workspaces.find((w) => w.id === targetWsId);
    if (!ws) return null;

    // Load fresh cached outputs and manual edits from DB
    const allCached = await db.cachedOutputs.where('workspaceId').equals(targetWsId).toArray();
    const allEdits = await db.manualEdits.where('workspaceId').equals(targetWsId).toArray();
    const existingComp = await db.compilations.get(`compilation-${targetWsId}`);

    const docConfigs = existingComp?.documentConfigs || {};

    // Ensure all cached documents have a config entry
    allCached.forEach((doc, idx) => {
      if (!docConfigs[doc.documentId]) {
        docConfigs[doc.documentId] = {
          documentId: doc.documentId,
          order: idx + 1,
          included: true,
        };
      }
    });

    const compiled = compileCourse({
      workspaceId: targetWsId,
      course: ws.course || ws.name,
      title: `${ws.course || ws.name} Compilation`,
      preset: coursePreset,
      requirement: courseRequirement,
      cachedDocs: allCached,
      documentConfigs: docConfigs,
      manualEdits: allEdits,
    });

    await db.compilations.put(compiled);

    const updatedCachedMap: Record<string, CachedDocumentOutput> = {};
    for (const c of allCached) {
      updatedCachedMap[c.documentId] = c;
    }
    const updatedEditsMap: Record<string, ManualUserEdit> = {};
    for (const e of allEdits) {
      updatedEditsMap[e.sectionId] = e;
    }

    set({
      activeCompilation: compiled,
      compilations: {
        ...compilations,
        [targetWsId]: compiled,
      },
      cachedOutputs: {
        ...cachedOutputs,
        ...updatedCachedMap,
      },
      manualEdits: {
        ...manualEdits,
        ...updatedEditsMap,
      },
    });

    return compiled;
  },

  setCoursePreset: async (preset: CompilationPreset) => {
    set({ coursePreset: preset });
    await get().recompileCourseCompilation();
  },

  setCourseRequirement: async (requirement: string) => {
    set({ courseRequirement: requirement });
    await get().recompileCourseCompilation();
  },

  updateDocumentConfig: async (docId: string, updates: Partial<DocumentCompilationConfig>) => {
    const { activeCompilation, activeWorkspaceId } = get();
    if (!activeCompilation) return;

    const currentConfigs = { ...activeCompilation.documentConfigs };
    const prev = currentConfigs[docId] || {
      documentId: docId,
      order: 1,
      included: true,
    };

    currentConfigs[docId] = {
      ...prev,
      ...updates,
    };

    const updatedComp = {
      ...activeCompilation,
      documentConfigs: currentConfigs,
    };

    await db.compilations.put(updatedComp);
    await get().recompileCourseCompilation(activeWorkspaceId);
  },

  moveDocumentOrder: async (docId: string, direction: 'up' | 'down') => {
    const { activeCompilation, activeWorkspaceId, documents } = get();
    if (!activeCompilation) return;

    const wsDocs = documents.filter((d) => d.workspaceId === activeWorkspaceId);
    const configs = { ...activeCompilation.documentConfigs };

    // Build ordered list of doc IDs
    const ordered = [...wsDocs].sort((a, b) => {
      const ordA = configs[a.id]?.order ?? 9999;
      const ordB = configs[b.id]?.order ?? 9999;
      return ordA - ordB;
    });

    const currentIndex = ordered.findIndex((d) => d.id === docId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;

    // Swap positions
    const temp = ordered[currentIndex];
    ordered[currentIndex] = ordered[targetIndex];
    ordered[targetIndex] = temp;

    // Reassign orders
    ordered.forEach((doc, idx) => {
      configs[doc.id] = {
        ...(configs[doc.id] || { documentId: doc.id, included: true }),
        order: idx + 1,
      };
    });

    const updatedComp = {
      ...activeCompilation,
      documentConfigs: configs,
    };

    await db.compilations.put(updatedComp);
    await get().recompileCourseCompilation(activeWorkspaceId);
  },

  saveManualSectionEdit: async (sectionId: string, docId: string, updates: { userNotes?: string; customSummary?: string }) => {
    const { activeWorkspaceId } = get();
    const editId = `edit-${activeWorkspaceId}-${sectionId}`;
    const existing = await db.manualEdits.get(editId);

    const editRecord: ManualUserEdit = {
      id: editId,
      workspaceId: activeWorkspaceId,
      sectionId,
      documentId: docId,
      userNotes: updates.userNotes !== undefined ? updates.userNotes : existing?.userNotes,
      customSummary: updates.customSummary !== undefined ? updates.customSummary : existing?.customSummary,
      updatedAt: Date.now(),
    };

    await db.manualEdits.put(editRecord);
    recordDataChange();
    await get().recompileCourseCompilation(activeWorkspaceId);
  },

  dismissDuplicateWarning: () => {
    set({ duplicateWarning: null });
  },
}));
