/**
 * Pure similarity functions: Cosine similarity, dot product, token overlap
 */

export function dotProduct(a: number[] | Float32Array, b: number[] | Float32Array): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

export function magnitude(v: number[] | Float32Array): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += v[i] * v[i];
  }
  return Math.sqrt(sum);
}

export function cosineSimilarity(
  a: number[] | Float32Array,
  b: number[] | Float32Array
): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  const sim = dot / (magA * magB);
  // Clamp between -1 and 1 (or 0 and 1 for positive similarities)
  return Math.max(0, Math.min(1, sim));
}

/**
 * TextRank sentence overlap similarity:
 * Sim(S_i, S_j) = |tokens(S_i) ∩ tokens(S_j)| / (log(|tokens(S_i)|) + log(|tokens(S_j)|))
 * Standard formulation from Mihalcea & Tarau (2004) TextRank paper.
 */
export function sentenceTokenOverlap(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setB = new Set(tokensB);
  let overlap = 0;
  for (const t of tokensA) {
    if (setB.has(t)) overlap++;
  }

  if (overlap === 0) return 0;

  const denom = Math.log(tokensA.length + 1) + Math.log(tokensB.length + 1);
  return denom > 0 ? overlap / denom : 0;
}

/**
 * Jaccard similarity between two sets of strings
 */
export function jaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 1;
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
