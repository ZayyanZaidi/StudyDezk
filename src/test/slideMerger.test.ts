import { describe, it, expect } from 'vitest';
import { mergeSlideLines } from '../logic/extraction/slideMerger';

describe('Slide Text Merger', () => {
  it('should merge fragmented multi-line slide bullets into complete sentences', () => {
    const rawSlide = `• Confidentiality ensures that
  sensitive data is protected
  from unauthorized access.
• Integrity refers to maintaining
  data accuracy throughout its lifecycle.`;

    const result = mergeSlideLines(rawSlide);

    expect(result.detectedBulletPoints).toBe(2);
    expect(result.mergedText).toContain(
      'Confidentiality ensures that sensitive data is protected from unauthorized access.'
    );
    expect(result.mergedText).toContain(
      'Integrity refers to maintaining data accuracy throughout its lifecycle.'
    );
  });

  it('should detect headings with indicator words or trailing colons', () => {
    const rawSlide = `LECTURE OVERVIEW:
• First core principle
• Second core principle`;

    const result = mergeSlideLines(rawSlide);
    expect(result.mergedText).toContain('LECTURE OVERVIEW:');
  });

  it('should handle numbered slide lists correctly', () => {
    const raw = `1. Red: write a failing test
2. Green: write code to pass
3. Refactor: clean code`;

    const result = mergeSlideLines(raw);
    expect(result.detectedBulletPoints).toBe(3);
    expect(result.mergedLineCount).toBe(3);
  });
});
