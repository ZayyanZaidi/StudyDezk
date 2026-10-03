export interface SearchResult {
  documentId: string;
  documentTitle: string;
  course: string;
  pageNumber: number;
  snippet: string;
  score: number; // 0.0 to 1.0 similarity
  matchType: 'semantic' | 'keyword' | 'hybrid';
}
