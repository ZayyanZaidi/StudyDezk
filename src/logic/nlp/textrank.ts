import { tokenize } from './stopwords';
import { sentenceTokenOverlap, cosineSimilarity } from './similarity';

export interface TextRankOptions {
  dampingFactor?: number;      // default 0.85
  maxIterations?: number;      // default 50
  convergenceThreshold?: number; // default 0.0001
  sentenceVectors?: number[][]; // optional embedding vectors for semantic similarity edges
}

export interface RankedSentence {
  index: number;
  sentence: string;
  score: number;
}

/**
 * Pure implementation of TextRank graph-based sentence ranking.
 */
export function rankSentences(
  sentences: string[],
  options: TextRankOptions = {}
): RankedSentence[] {
  const n = sentences.length;
  if (n === 0) return [];
  if (n === 1) {
    return [{ index: 0, sentence: sentences[0], score: 1.0 }];
  }

  const d = options.dampingFactor ?? 0.85;
  const maxIter = options.maxIterations ?? 50;
  const threshold = options.convergenceThreshold ?? 0.0001;

  // Pre-tokenize sentences for fast graph edge computation
  const tokenized = sentences.map((s) => tokenize(s));

  // Build symmetric similarity weight matrix W
  // W[i][j] = similarity(sentence_i, sentence_j)
  const W: number[][] = Array.from({ length: n }, () => new Float64Array(n) as unknown as number[]);
  const outDegrees = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let sim = 0;
      if (options.sentenceVectors && options.sentenceVectors[i] && options.sentenceVectors[j]) {
        sim = cosineSimilarity(options.sentenceVectors[i], options.sentenceVectors[j]);
      } else {
        sim = sentenceTokenOverlap(tokenized[i], tokenized[j]);
      }

      if (sim > 0.001) {
        W[i][j] = sim;
        W[j][i] = sim;
        outDegrees[i] += sim;
        outDegrees[j] += sim;
      }
    }
  }

  // Initial uniform scores
  let scores = new Float64Array(n).fill(1.0 / n);

  // Power iteration
  for (let iter = 0; iter < maxIter; iter++) {
    const nextScores = new Float64Array(n);
    let maxDiff = 0;

    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j && W[j][i] > 0 && outDegrees[j] > 0) {
          sum += (W[j][i] / outDegrees[j]) * scores[j];
        }
      }

      nextScores[i] = (1 - d) / n + d * sum;
      const diff = Math.abs(nextScores[i] - scores[i]);
      if (diff > maxDiff) {
        maxDiff = diff;
      }
    }

    scores = nextScores;

    if (maxDiff < threshold) {
      break;
    }
  }

  // Normalize scores to [0, 1] range for intuitive display
  let maxScore = 0;
  let minScore = Infinity;
  for (let i = 0; i < n; i++) {
    if (scores[i] > maxScore) maxScore = scores[i];
    if (scores[i] < minScore) minScore = scores[i];
  }

  const range = maxScore - minScore;
  const ranked: RankedSentence[] = sentences.map((sentence, index) => {
    const raw = scores[index];
    const normalized = range > 0 ? (raw - minScore) / range : 1.0;
    return {
      index,
      sentence,
      score: normalized,
    };
  });

  return ranked;
}
