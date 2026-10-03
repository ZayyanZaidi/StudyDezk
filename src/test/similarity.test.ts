import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  dotProduct,
  sentenceTokenOverlap,
  jaccardSimilarity,
} from '../logic/nlp/similarity';

describe('Similarity Functions', () => {
  it('should compute exact dot product', () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    expect(dotProduct(a, b)).toBe(4 + 10 + 18);
  });

  it('should compute cosine similarity of 1 for identical vectors', () => {
    const a = [0.6, 0.8];
    const b = [0.6, 0.8];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0);
  });

  it('should compute cosine similarity of 0 for orthogonal vectors', () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0);
  });

  it('should compute token overlap between sentence token lists', () => {
    const tokensA = ['cloud', 'computing', 'iaas'];
    const tokensB = ['cloud', 'computing', 'paas'];
    const overlap = sentenceTokenOverlap(tokensA, tokensB);

    expect(overlap).toBeGreaterThan(0);

    const disjointA = ['apples', 'oranges'];
    const disjointB = ['security', 'cryptography'];
    expect(sentenceTokenOverlap(disjointA, disjointB)).toBe(0);
  });

  it('should compute Jaccard similarity', () => {
    const a = ['a', 'b', 'c'];
    const b = ['b', 'c', 'd'];
    // intersection = 2 (b, c), union = 4 (a, b, c, d)
    expect(jaccardSimilarity(a, b)).toBe(0.5);
  });
});
