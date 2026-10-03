import { tokenize } from './stopwords';

export interface TermFrequency {
  [term: string]: number;
}

export interface TfIdfModel {
  vocabulary: Map<string, number>; // term -> index
  idf: Map<string, number>;        // term -> idf weight
  corpusSize: number;
}

/**
 * Computes raw term frequencies for a list of tokens.
 */
export function computeTermFrequency(tokens: string[]): TermFrequency {
  const tf: TermFrequency = {};
  if (tokens.length === 0) return tf;

  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }

  // Normalize by total tokens
  const total = tokens.length;
  for (const t in tf) {
    tf[t] = tf[t] / total;
  }

  return tf;
}

/**
 * Builds an IDF model from an array of document texts or sentence texts.
 */
export function buildTfIdfModel(documents: string[]): TfIdfModel {
  const N = Math.max(1, documents.length);
  const docFrequencies = new Map<string, number>();
  const vocabulary = new Map<string, number>();

  let vocabIndex = 0;

  for (const doc of documents) {
    const tokens = tokenize(doc);
    const uniqueTokens = new Set(tokens);

    for (const term of uniqueTokens) {
      docFrequencies.set(term, (docFrequencies.get(term) || 0) + 1);
      if (!vocabulary.has(term)) {
        vocabulary.set(term, vocabIndex++);
      }
    }
  }

  const idf = new Map<string, number>();
  // Smooth IDF: log( (1 + N) / (1 + df) ) + 1
  for (const [term, df] of docFrequencies.entries()) {
    const idfVal = Math.log((1 + N) / (1 + df)) + 1;
    idf.set(term, idfVal);
  }

  return {
    vocabulary,
    idf,
    corpusSize: N,
  };
}

/**
 * Transforms a text string into a dense TF-IDF vector aligned with the model's vocabulary.
 */
export function transformToTfIdfVector(text: string, model: TfIdfModel): Float32Array {
  const vec = new Float32Array(model.vocabulary.size);
  const tokens = tokenize(text);
  if (tokens.length === 0 || model.vocabulary.size === 0) return vec;

  const tf = computeTermFrequency(tokens);

  for (const [term, freq] of Object.entries(tf)) {
    const idx = model.vocabulary.get(term);
    const idfWeight = model.idf.get(term);
    if (idx !== undefined && idfWeight !== undefined) {
      vec[idx] = freq * idfWeight;
    }
  }

  return vec;
}

/**
 * Extracts top-scoring keywords from text using TF-IDF.
 */
export function extractTopTfIdfTerms(
  text: string,
  model?: TfIdfModel,
  topK = 15
): Array<{ term: string; score: number }> {
  const tokens = tokenize(text);
  if (tokens.length === 0) return [];

  const tf = computeTermFrequency(tokens);
  const scores: Array<{ term: string; score: number }> = [];

  for (const [term, freq] of Object.entries(tf)) {
    const idfVal = model?.idf.get(term) ?? 1.5;
    scores.push({
      term,
      score: freq * idfVal,
    });
  }

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
