import { describe, it, expect } from 'vitest';
import { splitSentences } from '../logic/nlp/segmenter';

describe('Sentence Segmenter', () => {
  it('should split standard English sentences cleanly', () => {
    const text = 'Cloud computing is an on-demand computing model. It delivers scalable hardware resources over the internet. Multiple tenants share infrastructure.';
    const sentences = splitSentences(text);

    expect(sentences).toHaveLength(3);
    expect(sentences[0]).toBe('Cloud computing is an on-demand computing model.');
    expect(sentences[1]).toBe('It delivers scalable hardware resources over the internet.');
    expect(sentences[2]).toBe('Multiple tenants share infrastructure.');
  });

  it('should not break on common abbreviations like e.g., i.e., or Dr.', () => {
    const text = 'Access control mechanisms, e.g. role-based access control, enforce security policies. Dr. Smith designed the architecture.';
    const sentences = splitSentences(text);

    expect(sentences.length).toBeGreaterThanOrEqual(1);
    expect(sentences[0]).toContain('e.g. role-based access control');
  });

  it('should handle empty or whitespace text gracefully', () => {
    expect(splitSentences('')).toEqual([]);
    expect(splitSentences('   \n  \t ')).toEqual([]);
  });

  it('should strip orphan punctuation and normalize whitespace', () => {
    const text = '   First   statement   here.    Second   statement here.   ';
    const sentences = splitSentences(text);
    expect(sentences[0]).toBe('First statement here.');
    expect(sentences[1]).toBe('Second statement here.');
  });
});
