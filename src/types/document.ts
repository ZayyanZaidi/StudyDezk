export type CourseCategory = string;

export interface DocumentPage {
  pageNumber: number;
  title?: string;
  heading?: string;
  text: string;
  hasTextLayer: boolean;
  ocrApplied: boolean;
  wordCount: number;
  thumbnailUrl?: string;
}

export interface DocumentChunk {
  id: string;
  workspaceId: string;
  documentId: string;
  pageNumber: number;
  text: string;
  embedding?: number[];
}

export interface StudyDocument {
  id: string;
  workspaceId: string;
  title: string;
  course: CourseCategory;
  fileName: string;
  fileType: 'pdf' | 'image' | 'text' | 'document' | string;
  fileSize: number;
  totalPages: number;
  pages: DocumentPage[];
  fullText: string;
  processedText: string; // after slide line merging
  slideMergeApplied: boolean;
  createdAt: number;
  updatedAt: number;
  summaryCache?: {
    [cacheKey: string]: {
      summary: string;
      bullets?: string[];
      selectedIndices: number[];
      requirement?: string;
    };
  };
}

export interface ProcessingProgress {
  stage: 'idle' | 'reading' | 'extracting' | 'ocr' | 'segmenting' | 'embedding' | 'saving' | 'completed' | 'error';
  currentPage?: number;
  totalPages?: number;
  percentage: number;
  message: string;
  cancellable: boolean;
}
