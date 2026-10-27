export type PlanType = 'free' | 'pro';

export interface Profile {
  id: string;
  email?: string;
  full_name: string;
  university?: string;
  program?: string;
  semester?: string;
  plan: PlanType;
  created_at: string;
  updated_at?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
}

export interface PlanLimits {
  maxCourses: number; // 2 for free, Infinity for pro
  maxDocumentsTotal: number; // 5 for free, Infinity for pro
  maxChunksDaily: number; // 30 for free, 500 for pro
  allowPdfExport: boolean;
  allowAnkiExport: boolean;
  allowQuizzes: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxCourses: 2,
    maxDocumentsTotal: 5,
    maxChunksDaily: 30,
    allowPdfExport: false,
    allowAnkiExport: false,
    allowQuizzes: false,
  },
  pro: {
    maxCourses: 9999,
    maxDocumentsTotal: 9999,
    maxChunksDaily: 500,
    allowPdfExport: true,
    allowAnkiExport: true,
    allowQuizzes: true,
  },
};

export interface DailyUsageStats {
  date: string;
  chunksProcessed: number;
  maxChunksDaily: number;
  coursesCount: number;
  maxCourses: number;
  documentsCount: number;
  maxDocuments: number;
}

export interface UserCustomSettings {
  defaultSummaryStyle: 'structured' | 'bullets' | 'paragraph' | 'tldr';
  defaultSummaryLength: 'concise' | 'auto' | 'detailed';
  fontPreference: 'sans' | 'serif' | 'mono';
  readingLineHeight: 'normal' | 'relaxed' | 'loose';
  highReadabilityContrast: boolean;
  autoExtractDiagrams: boolean;
  dailyChunkTarget: number;
  autoSaveSessionLogs: boolean;
  exportFormatFlashcards: 'anki' | 'json' | 'csv';
}

export const DEFAULT_USER_SETTINGS: UserCustomSettings = {
  defaultSummaryStyle: 'structured',
  defaultSummaryLength: 'auto',
  fontPreference: 'sans',
  readingLineHeight: 'relaxed',
  highReadabilityContrast: false,
  autoExtractDiagrams: true,
  dailyChunkTarget: 30,
  autoSaveSessionLogs: true,
  exportFormatFlashcards: 'anki',
};
