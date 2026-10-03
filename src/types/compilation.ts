import { ExtractedFigure } from './figure';
import { Flashcard } from './flashcard';
import { GlossaryTerm } from './glossary';
import { DiagramSpec } from './diagram';

export type CompilationPreset = 'brief' | 'standard' | 'detailed' | 'exam';

export interface DocumentCompilationConfig {
  documentId: string;
  order: number;
  included: boolean;
  presetOverride?: CompilationPreset;
}

export interface TableOfContentsItem {
  id: string;
  documentId: string;
  documentTitle: string;
  heading: string;
  anchorId: string;
  pageNumber: number;
  level: 1 | 2;
}

export interface CompilationSection {
  id: string;
  documentId: string;
  documentTitle: string;
  pageNumber: number;
  heading: string;
  anchorId: string;
  summaryText: string;
  paragraphs: string[];
  bulletPoints?: string[];
  figures: ExtractedFigure[];
  diagrams?: DiagramSpec[];
  crossReferences?: string[]; // e.g. ["also in Lecture 3"]
  userNotes?: string;
  userSummaryOverride?: string;
}

export interface CachedDocumentOutput {
  documentId: string;
  workspaceId: string;
  contentHash: string;
  fileName: string;
  title: string;
  cleanedText: string;
  pageCount: number;
  sections: CompilationSection[];
  figures: ExtractedFigure[];
  flashcards: Flashcard[];
  glossaryTerms: GlossaryTerm[];
  diagrams: DiagramSpec[];
  processedAt: number;
}

export interface ManualUserEdit {
  id: string; // `edit-${workspaceId}-${sectionId}`
  workspaceId: string;
  sectionId: string;
  documentId: string;
  userNotes?: string;
  customSummary?: string;
  updatedAt: number;
}

export interface CourseCompilation {
  id: string; // `compilation-${workspaceId}`
  workspaceId: string;
  course: string;
  title: string;
  lastUpdated: number;
  preset: CompilationPreset;
  requirement?: string;
  toc: TableOfContentsItem[];
  sections: CompilationSection[];
  mergedGlossary: GlossaryTerm[];
  mergedFlashcards: Flashcard[];
  documentConfigs: Record<string, DocumentCompilationConfig>;
  stats: {
    totalDocuments: number;
    includedDocuments: number;
    totalFigures: number;
    wordCount: number;
    readingTimeMinutes: number;
  };
}
