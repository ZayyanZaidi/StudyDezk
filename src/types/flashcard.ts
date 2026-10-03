export interface Flashcard {
  id: string;
  workspaceId: string;
  documentId: string;
  course: string;
  front: string; // Question or Prompt
  back: string;  // Answer or Definition
  sourceSentence: string;
  sourcePattern: 'definition_is' | 'definition_refers' | 'definition_means' | 'acronym' | 'colon_syntax' | 'custom';
  tags: string[];
  reviewState: {
    interval: number; // in days
    repetitions: number;
    easeFactor: number;
    lastReviewedAt?: number;
    nextReviewAt?: number;
    knownCount: number;
    hardCount: number;
  };
  createdAt: number;
}
