import { describe, it, expect } from 'vitest';
import { rankSentences } from '../logic/nlp/textrank';

describe('TextRank Algorithm', () => {
  it('should handle single sentence gracefully', () => {
    const sentences = ['Cloud computing provides on-demand computing resources.'];
    const ranked = rankSentences(sentences);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].score).toBe(1.0);
  });

  it('should rank sentences with high graph centrality higher', () => {
    const sentences = [
      'Cloud computing service models include IaaS, PaaS, and SaaS.',
      'Infrastructure as a Service (IaaS) provides virtual machines and storage.',
      'Platform as a Service (PaaS) provides development runtimes.',
      'Software as a Service (SaaS) provides ready applications.',
      'The weather in London is frequently rainy during autumn months.', // outlier sentence
    ];

    const ranked = rankSentences(sentences);
    expect(ranked).toHaveLength(5);

    // Sentences related to cloud models should score higher than weather outlier
    const outlierScore = ranked.find((r) => r.sentence.includes('London'))?.score || 0;
    const centralScore = ranked.find((r) => r.sentence.includes('Cloud computing service models'))?.score || 0;

    expect(centralScore).toBeGreaterThan(outlierScore);
  });

  it('should return normalized scores between 0 and 1', () => {
    const sentences = [
      'Test-driven development starts with writing a failing unit test.',
      'Next developers write the minimal code to pass the unit test.',
      'Finally developers refactor the clean implementation.',
    ];
    const ranked = rankSentences(sentences);

    for (const r of ranked) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1.0);
    }
  });
});
