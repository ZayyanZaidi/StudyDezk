import { Summarizer } from '../../types/summarizer';
import { ExtractiveSummarizer } from './extractive';

export * from '../../types/summarizer';
export { ExtractiveSummarizer };

// Default instance of swappable summarizer
export const defaultSummarizer: Summarizer = new ExtractiveSummarizer();
