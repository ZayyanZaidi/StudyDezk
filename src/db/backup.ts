import { db } from './index';
import { StudyDocument } from '../types/document';
import { Flashcard } from '../types/flashcard';
import { GlossaryTerm } from '../types/glossary';
import { DiagramSpec } from '../types/diagram';
import { Workspace } from '../types/workspace';
import { SummarySession } from '../types/session';
import { ChatThread, ChatMessage } from '../types/chat';

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

  // Strip any heavy base64/thumbnail images from documents to keep saved files ultra-light
  const lightweightDocuments: StudyDocument[] = documents.map((doc) => ({
    ...doc,
    pages: doc.pages.map((p) => ({
      pageNumber: p.pageNumber,
      text: p.text,
      hasTextLayer: p.hasTextLayer,
      ocrApplied: p.ocrApplied,
      wordCount: p.wordCount,
      thumbnailUrl: undefined, // Omit heavy image data
    })),
  }));

  const backup: BackupPayload = {
    version: 2,
    appName: 'StudyDezk',
    exportedAt: new Date().toISOString(),
    metadata: {
      totalWorkspaces: workspaces.length,
      totalDocuments: documents.length,
      totalFlashcards: flashcards.length,
      totalGlossaryTerms: glossary.length,
      totalDiagrams: diagrams.length,
      totalSessions: sessionHistories.length,
    },
    data: {
      workspaces,
      documents: lightweightDocuments,
      flashcards,
      glossary,
      diagrams,
      sessionHistories,
      chatThreads: [],
      chatMessages: [],
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
  };
}

export async function importLibraryFromJson(
  jsonString: string,
  mode: 'merge' | 'replace' = 'merge'
): Promise<ImportResult> {
  try {
    const parsed = JSON.parse(jsonString);

    // Validate signature
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
    } = parsed.data || {};

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
      }
    );

    return {
      success: true,
      message: `Successfully imported ${documents.length} documents and ${sessionHistories.length} sessions.`,
      importedCounts: {
        workspaces: workspaces.length,
        documents: documents.length,
        flashcards: flashcards.length,
        glossary: glossary.length,
        diagrams: diagrams.length,
        sessions: sessionHistories.length,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown import error';
    return {
      success: false,
      message: `Failed to import backup: ${msg}`,
      importedCounts: {
        workspaces: 0,
        documents: 0,
        flashcards: 0,
        glossary: 0,
        diagrams: 0,
        sessions: 0,
      },
    };
  }
}
