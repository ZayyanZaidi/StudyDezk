export interface ChatCitation {
  documentId: string;
  documentTitle: string;
  pageNumber: number;
  text: string;
  score: number;
}

export interface ChatTokenStats {
  sourceTokens: number;
  contextTokens: number;
  savingsPercent: number;
  retrievalTimeMs?: number;
}

export interface ChatThread {
  id: string;
  workspaceId: string;
  documentId?: string; // Single primary doc or 'all'
  documentIds?: string[]; // Multiple reference documents for the thread
  title: string;
  topic?: string;
  scope?: 'document' | 'workspace';
  systemPrompt?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  topic?: string;
  citationSentenceIndices?: number[];
  citations?: ChatCitation[];
  tokenStats?: ChatTokenStats;
  createdAt: number;
}

