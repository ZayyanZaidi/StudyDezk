export interface ChatThread {
  id: string;
  workspaceId: string;
  documentId?: string;
  title: string;
  systemPrompt?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citationSentenceIndices?: number[];
  createdAt: number;
}
