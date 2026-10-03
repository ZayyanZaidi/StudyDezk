export interface GlossaryTerm {
  id: string;
  workspaceId: string;
  term: string;
  definition: string;
  isAcronym: boolean;
  expansion?: string; // e.g. "Confidentiality, Integrity, and Availability" for CIA
  occurrences: number;
  documentId: string;
  documentTitle: string;
  course: string;
  contextSentence: string;
}

export interface AcronymItem {
  acronym: string;
  expansion?: string;
  context: string;
  score: number;
}
