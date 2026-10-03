import { SummarizeOptions, SummaryResult } from './summarizer';
import { DiagramSpec } from './diagram';

export interface SummarySession {
  id: string;
  workspaceId: string;
  documentId: string;
  documentTitle: string;
  fileName?: string; // Original file name kept for context
  title: string;
  requirement?: string;
  options: SummarizeOptions;
  result: SummaryResult;
  diagrams?: DiagramSpec[]; // Diagrams saved alongside summary content
  createdAt: number;
  updatedAt: number;
}
