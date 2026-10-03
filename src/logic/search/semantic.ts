import { db } from '../../db';
import { SearchResult } from '../../types/search';
import { cosineSimilarity } from '../nlp/similarity';
import { tokenize } from '../nlp/stopwords';
import { workerManager } from '../../workers/workerManager';

export async function searchDocuments(
  query: string,
  filterCourse?: string,
  abortSignal?: AbortSignal
): Promise<SearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const documents = await db.documents.toArray();
  if (documents.length === 0) return [];

  const docMap = new Map(documents.map((d) => [d.id, d]));
  const queryTokens = tokenize(cleanQuery);
  const isAcronymQuery = /^[A-Z]{2,6}$/.test(cleanQuery.toUpperCase());

  // 1. Try to obtain query embedding vector
  let queryVector: number[] | null = null;
  try {
    queryVector = await workerManager.getEmbedding(cleanQuery, undefined, abortSignal);
  } catch (err) {
    console.warn('Semantic vector generation unavailable or cancelled, falling back to lexical search:', err);
  }

  const storedEmbeddings = await db.embeddings.toArray();
  const results: SearchResult[] = [];

  // If stored embeddings exist and we got a query vector, perform vector search
  if (queryVector && storedEmbeddings.length > 0) {
    for (const item of storedEmbeddings) {
      const doc = docMap.get(item.documentId);
      if (!doc) continue;
      if (filterCourse && filterCourse !== 'All Courses' && doc.course !== filterCourse) continue;

      const sim = cosineSimilarity(queryVector, item.vector);

      // Add slight keyword boost for exact token occurrences
      const itemTokens = tokenize(item.text);
      const exactTokenOverlap = queryTokens.filter((t) => itemTokens.includes(t)).length;
      const lexicalBoost = queryTokens.length > 0 ? (exactTokenOverlap / queryTokens.length) * 0.25 : 0;
      const acronymBoost = isAcronymQuery && item.text.toUpperCase().includes(cleanQuery.toUpperCase()) ? 0.3 : 0;

      const hybridScore = Math.min(1.0, sim * 0.75 + lexicalBoost + acronymBoost);

      if (hybridScore > 0.28) {
        results.push({
          documentId: item.documentId,
          documentTitle: doc.title,
          course: doc.course,
          pageNumber: item.pageNumber,
          snippet: item.text,
          score: Number(hybridScore.toFixed(3)),
          matchType: 'semantic',
        });
      }
    }
  }

  // If no embeddings yet or as a supplementary sweep, scan document text chunks directly
  if (results.length < 5) {
    for (const doc of documents) {
      if (filterCourse && filterCourse !== 'All Courses' && doc.course !== filterCourse) continue;

      for (const page of doc.pages) {
        const sentences = page.text.split(/(?<=[.?!])\s+/);
        for (const sent of sentences) {
          const sentTokens = tokenize(sent);
          if (sentTokens.length === 0) continue;

          let matchScore = 0;
          let matchType: 'keyword' | 'hybrid' = 'keyword';

          if (isAcronymQuery && new RegExp(`\\b${cleanQuery}\\b`, 'i').test(sent)) {
            matchScore = 0.85;
          } else {
            const matchedCount = queryTokens.filter((t) => sentTokens.includes(t)).length;
            if (matchedCount > 0) {
              matchScore = matchedCount / Math.max(1, queryTokens.length);
            }
          }

          if (matchScore >= 0.35) {
            // Avoid duplicate snippets
            const exists = results.some(
              (r) => r.documentId === doc.id && r.pageNumber === page.pageNumber && r.snippet === sent
            );
            if (!exists) {
              results.push({
                documentId: doc.id,
                documentTitle: doc.title,
                course: doc.course,
                pageNumber: page.pageNumber,
                snippet: sent,
                score: Number(matchScore.toFixed(3)),
                matchType,
              });
            }
          }
        }
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 25);
}
