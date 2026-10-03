export interface SummarizeOptions {
  lengthMode?: 'auto' | 'sentences' | 'percentage';
  lengthValue?: number; // optional, used if custom lengthMode specified
  outputStyle: 'paragraph' | 'bullets';
  paragraphLength?: 'short' | 'medium' | 'long';
  requirement?: string; // free-text focus requirement e.g. "focus on attack types"
  requirementWeight?: number; // 0.0 to 1.0 (default 0.6)
  requirementEmbedding?: number[]; // pre-computed query embedding
  sentenceEmbeddings?: number[][]; // pre-computed sentence embeddings
}

export interface SentenceScore {
  sentence: string;
  originalIndex: number;
  textRankScore: number;
  requirementScore: number; // 0.0 to 1.0 cosine similarity boost
  finalScore: number;
  isKeyPoint?: boolean; // Flag indicating high-salience key point
}

export interface SummarySectionBlock {
  id: string;
  heading: string;
  pageNumber: number;
  paragraphs: string[];
  lists?: string[];
  tables?: string[];
  sentenceScores: SentenceScore[];
  rawText: string;
}

export interface SummaryResult {
  text: string;
  bullets?: string[];
  highlights?: string[]; // Top primary key points from all sections
  selectedSentences: SentenceScore[];
  allSentences: SentenceScore[];
  structuredSections?: SummarySectionBlock[];
  originalSentenceCount: number;
  summarySentenceCount: number;
  compressionRatio: number; // e.g. 0.35 (35% of original length)
  wordCount: number;
  readingTimeMinutes: number;
}

/**
 * Swappable Summarizer interface allowing pure extractive,
 * hybrid, or future local WebLLM / API summarizers.
 */
export interface Summarizer {
  summarize(text: string, options: SummarizeOptions): Promise<SummaryResult>;
}
