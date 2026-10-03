import Dexie, { type Table } from 'dexie';
import { StudyDocument, DocumentPage, DocumentChunk } from '../types/document';
import { Flashcard } from '../types/flashcard';
import { GlossaryTerm } from '../types/glossary';
import { DiagramSpec } from '../types/diagram';
import { Workspace } from '../types/workspace';
import { SummarySession } from '../types/session';
import { ChatThread, ChatMessage } from '../types/chat';
import { ExtractedFigure } from '../types/figure';
import {
  CachedDocumentOutput,
  ManualUserEdit,
  CourseCompilation,
} from '../types/compilation';

export interface StoredEmbedding {
  id: string; // usually chunkId or docId:sentenceIdx
  workspaceId: string;
  documentId: string;
  pageNumber: number;
  text: string;
  vector: number[];
}

export class StudyDezkDatabase extends Dexie {
  workspaces!: Table<Workspace, string>;
  documents!: Table<StudyDocument, string>;
  pages!: Table<DocumentPage & { id: string; documentId: string }, string>;
  chunks!: Table<DocumentChunk, string>;
  flashcards!: Table<Flashcard, string>;
  glossary!: Table<GlossaryTerm, string>;
  diagrams!: Table<DiagramSpec, string>;
  embeddings!: Table<StoredEmbedding, string>;
  sessionHistories!: Table<SummarySession, string>;
  chatThreads!: Table<ChatThread, string>;
  chatMessages!: Table<ChatMessage, string>;
  extractedFigures!: Table<ExtractedFigure, string>;
  cachedOutputs!: Table<CachedDocumentOutput, string>;
  manualEdits!: Table<ManualUserEdit, string>;
  compilations!: Table<CourseCompilation, string>;

  constructor() {
    super('StudyDezkDB');
    this.version(1).stores({
      workspaces: 'id, name, course, createdAt',
      documents: 'id, workspaceId, title, course, fileType, createdAt, updatedAt',
      pages: 'id, documentId, pageNumber',
      chunks: 'id, workspaceId, documentId, pageNumber',
      flashcards: 'id, workspaceId, documentId, course, createdAt, reviewState.nextReviewAt',
      glossary: 'id, workspaceId, term, course, documentId, isAcronym',
      diagrams: 'id, workspaceId, documentId, type, createdAt',
      embeddings: 'id, workspaceId, documentId, pageNumber',
      sessionHistories: 'id, workspaceId, documentId, createdAt, title',
      chatThreads: 'id, workspaceId, documentId, createdAt, updatedAt',
      chatMessages: 'id, threadId, createdAt',
    });

    this.version(2).stores({
      extractedFigures: 'id, workspaceId, documentId, pageNumber, status, createdAt',
    });

    this.version(3).stores({
      cachedOutputs: 'documentId, workspaceId, contentHash, processedAt',
      manualEdits: 'id, workspaceId, sectionId, documentId, updatedAt',
      compilations: 'id, workspaceId, course, lastUpdated',
    });
  }
}

export const db = new StudyDezkDatabase();
