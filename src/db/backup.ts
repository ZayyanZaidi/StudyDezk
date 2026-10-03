import { db } from './index';
import { StudyDocument } from '../types/document';
import { Flashcard } from '../types/flashcard';
import { GlossaryTerm } from '../types/glossary';
import { DiagramSpec } from '../types/diagram';
import { Workspace } from '../types/workspace';
import { SummarySession } from '../types/session';
import { ChatThread, ChatMessage } from '../types/chat';
import { ExtractedFigure, SerializedFigure } from '../types/figure';

import {
  CachedDocumentOutput,
  ManualUserEdit,
  CourseCompilation,
} from '../types/compilation';

export async function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof blob.arrayBuffer === 'function') {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return `data:${blob.type || 'image/webp'};base64,${base64}`;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/webp';
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

export interface BackupPayload {
  version: number;
  appName: 'StudyDezk' | 'StudyDesk';
  exportedAt: string;
  metadata: {
    totalWorkspaces: number;
    totalDocuments: number;
    totalFlashcards: number;
    totalGlossaryTerms: number;
    totalDiagrams: number;
    totalSessions: number;
    totalFigures?: number;
    totalChatThreads?: number;
    totalCompilations?: number;
  };
  data: {
    workspaces: Workspace[];
    documents: StudyDocument[];
    flashcards: Flashcard[];
    glossary: GlossaryTerm[];
    diagrams: DiagramSpec[];
    sessionHistories: SummarySession[];
    chatThreads?: ChatThread[];
    chatMessages?: ChatMessage[];
    extractedFigures?: SerializedFigure[];
    cachedOutputs?: CachedDocumentOutput[];
    manualEdits?: ManualUserEdit[];
    compilations?: CourseCompilation[];
  };
}

export async function exportLibraryToJson(): Promise<string> {
  const workspaces = await db.workspaces.toArray();
  const documents = await db.documents.toArray();
  const flashcards = await db.flashcards.toArray();
  const glossary = await db.glossary.toArray();
  const diagrams = await db.diagrams.toArray();
  const sessionHistories = await db.sessionHistories.toArray();
  const chatThreads = await db.chatThreads.toArray();
  const chatMessages = await db.chatMessages.toArray();
  const figures = await db.extractedFigures.toArray();
  const cachedOutputs = await db.cachedOutputs.toArray();
  const manualEdits = await db.manualEdits.toArray();
  const compilations = await db.compilations.toArray();

  // Convert figure Blobs to base64 Data URLs for JSON portability
  const serializedFigures: SerializedFigure[] = [];
  for (const fig of figures) {
    try {
      const sourceBlob = fig.blob || fig.fullBlob;
      const fullDataUrl = await blobToDataUrl(sourceBlob);
      const thumbnailDataUrl = await blobToDataUrl(fig.thumbnailBlob || sourceBlob);
      serializedFigures.push({
        id: fig.id,
        workspaceId: fig.workspaceId,
        documentId: fig.documentId,
        pageNumber: fig.pageNumber,
        figureIndex: fig.figureIndex ?? 0,
        caption: fig.caption,
        type: fig.type,
        dataUrl: fullDataUrl,
        fullDataUrl,
        thumbnailDataUrl,
        width: fig.width,
        height: fig.height,
        cropBox: fig.cropBox,
        status: fig.status || 'kept',
        userStatus: fig.userStatus || fig.status || 'kept',
        score: fig.score,
        detectedBy: fig.detectedBy,
        createdAt: fig.createdAt,
      });
    } catch (err) {
      console.warn(`Failed to serialize figure ${fig.id}:`, err);
    }
  }

  // Keep saved files light
  const lightweightDocuments: StudyDocument[] = documents.map((doc) => ({
    ...doc,
    pages: doc.pages.map((p) => ({
      pageNumber: p.pageNumber,
      text: p.text,
      hasTextLayer: p.hasTextLayer,
      ocrApplied: p.ocrApplied,
      wordCount: p.wordCount,
      thumbnailUrl: undefined,
    })),
  }));

  const backup: BackupPayload = {
    version: 3,
    appName: 'StudyDezk',
    exportedAt: new Date().toISOString(),
    metadata: {
      totalWorkspaces: workspaces.length,
      totalDocuments: documents.length,
      totalFlashcards: flashcards.length,
      totalGlossaryTerms: glossary.length,
      totalDiagrams: diagrams.length,
      totalSessions: sessionHistories.length,
      totalFigures: serializedFigures.length,
      totalChatThreads: chatThreads.length,
      totalCompilations: compilations.length,
    },
    data: {
      workspaces,
      documents: lightweightDocuments,
      flashcards,
      glossary,
      diagrams,
      sessionHistories,
      chatThreads,
      chatMessages,
      extractedFigures: serializedFigures,
      cachedOutputs,
      manualEdits,
      compilations,
    },
  };

  return JSON.stringify(backup, null, 2);
}

export function downloadBackupFile(jsonString: string, filename?: string) {
  const dateStr = new Date().toISOString().split('T')[0];
  const finalName = filename || `studydezk-backup-${dateStr}.json`;
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalName;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  success: boolean;
  message: string;
  importedCounts: {
    workspaces: number;
    documents: number;
    flashcards: number;
    glossary: number;
    diagrams: number;
    sessions: number;
    figures: number;
  };
}

export async function importLibraryFromJson(
  jsonString: string,
  mode: 'merge' | 'replace' = 'merge'
): Promise<ImportResult> {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || (parsed.appName !== 'StudyDezk' && parsed.appName !== 'StudyDesk' && !parsed.data)) {
      throw new Error('Invalid backup file format: Missing StudyDezk signature.');
    }

    const {
      workspaces = [],
      documents = [],
      flashcards = [],
      glossary = [],
      diagrams = [],
      sessionHistories = [],
      chatThreads = [],
      chatMessages = [],
      extractedFigures = [],
      cachedOutputs = [],
      manualEdits = [],
      compilations = [],
    } = parsed.data || {};

    // Convert serialized figures back to Blobs
    const restoredFigures: ExtractedFigure[] = [];
    for (const fig of extractedFigures as SerializedFigure[]) {
      try {
        const fullBlob = dataUrlToBlob(fig.fullDataUrl);
        const thumbnailBlob = dataUrlToBlob(fig.thumbnailDataUrl);
        restoredFigures.push({
          id: fig.id,
          workspaceId: fig.workspaceId,
          documentId: fig.documentId,
          pageNumber: fig.pageNumber,
          figureIndex: fig.figureIndex ?? 0,
          caption: fig.caption,
          type: fig.type,
          blob: fullBlob,
          fullBlob,
          thumbnailBlob,
          width: fig.width,
          height: fig.height,
          cropBox: fig.cropBox,
          status: fig.status || 'kept',
          userStatus: fig.userStatus || fig.status || 'kept',
          score: fig.score,
          detectedBy: fig.detectedBy,
          createdAt: fig.createdAt || Date.now(),
        });
      } catch (err) {
        console.warn(`Failed to deserialize figure ${fig.id}:`, err);
      }
    }

    await db.transaction(
      'rw',
      [
        db.workspaces,
        db.documents,
        db.flashcards,
        db.glossary,
        db.diagrams,
        db.sessionHistories,
        db.chatThreads,
        db.chatMessages,
        db.extractedFigures,
        db.cachedOutputs,
        db.manualEdits,
        db.compilations,
      ],
      async () => {
        if (mode === 'replace') {
          await db.workspaces.clear();
          await db.documents.clear();
          await db.flashcards.clear();
          await db.glossary.clear();
          await db.diagrams.clear();
          await db.sessionHistories.clear();
          await db.chatThreads.clear();
          await db.chatMessages.clear();
          await db.extractedFigures.clear();
          await db.cachedOutputs.clear();
          await db.manualEdits.clear();
          await db.compilations.clear();
        }

        if (workspaces.length > 0) {
          await db.workspaces.bulkPut(workspaces);
        }
        if (documents.length > 0) {
          await db.documents.bulkPut(documents);
        }
        if (flashcards.length > 0) {
          await db.flashcards.bulkPut(flashcards);
        }
        if (glossary.length > 0) {
          await db.glossary.bulkPut(glossary);
        }
        if (diagrams.length > 0) {
          await db.diagrams.bulkPut(diagrams);
        }
        if (sessionHistories.length > 0) {
          await db.sessionHistories.bulkPut(sessionHistories);
        }
        if (chatThreads.length > 0) {
          await db.chatThreads.bulkPut(chatThreads);
        }
        if (chatMessages.length > 0) {
          await db.chatMessages.bulkPut(chatMessages);
        }
        if (restoredFigures.length > 0) {
          await db.extractedFigures.bulkPut(restoredFigures);
        }
        if (cachedOutputs.length > 0) {
          await db.cachedOutputs.bulkPut(cachedOutputs);
        }
        if (manualEdits.length > 0) {
          await db.manualEdits.bulkPut(manualEdits);
        }
        if (compilations.length > 0) {
          await db.compilations.bulkPut(compilations);
        }
      }
    );

    return {
      success: true,
      message: `Successfully imported ${documents.length} documents, ${sessionHistories.length} sessions, and ${restoredFigures.length} figures.`,
      importedCounts: {
        workspaces: workspaces.length,
        documents: documents.length,
        flashcards: flashcards.length,
        glossary: glossary.length,
        diagrams: diagrams.length,
        sessions: sessionHistories.length,
        figures: restoredFigures.length,
      },
    };
  } catch (err: any) {
    console.error('Import failed:', err);
    return {
      success: false,
      message: err.message || 'Import failed due to an invalid JSON structure.',
      importedCounts: {
        workspaces: 0,
        documents: 0,
        flashcards: 0,
        glossary: 0,
        diagrams: 0,
        sessions: 0,
        figures: 0,
      },
    };
  }
}
