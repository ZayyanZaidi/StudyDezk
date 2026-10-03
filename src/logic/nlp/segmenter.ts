/**
 * Sentence segmentation using Intl.Segmenter with regex fallback.
 * Cleans abbreviations and normalizes sentence boundaries.
 */

const KNOWN_ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'vs', 'etc', 'eg', 'e.g', 'ie', 'i.e',
  'fig', 'dept', 'approx', 'est', 'al', 'jan', 'feb', 'mar', 'apr', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'no', 'vol', 'sec', 'ref'
]);

export function splitSentences(text: string): string[] {
  if (!text || typeof text !== 'string') return [];

  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  if (!normalized) return [];

  let rawSentences: string[] = [];

  // Check for Intl.Segmenter support
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
      for (const segment of segmenter.segment(normalized)) {
        const str = segment.segment.trim();
        if (str) rawSentences.push(str);
      }
    } catch {
      rawSentences = regexSentenceSplit(normalized);
    }
  } else {
    rawSentences = regexSentenceSplit(normalized);
  }

  // Post-process to stitch abbreviations that got split
  const stitched: string[] = [];
  let buffer = '';

  for (let i = 0; i < rawSentences.length; i++) {
    const cur = rawSentences[i].trim();
    if (!cur) continue;

    if (buffer) {
      buffer += ' ' + cur;
    } else {
      buffer = cur;
    }

    // Check if buffer ends with a common abbreviation
    const match = buffer.match(/\b([a-zA-Z]+)\.$/);
    if (match) {
      const word = match[1].toLowerCase();
      if (KNOWN_ABBREVIATIONS.has(word) && i < rawSentences.length - 1) {
        // Keep buffering next sentence
        continue;
      }
    }

    stitched.push(buffer);
    buffer = '';
  }

  if (buffer) {
    stitched.push(buffer);
  }

  return stitched
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length >= 8); // Skip tiny orphan symbols
}

function regexSentenceSplit(text: string): string[] {
  // Matches sentence terminators followed by whitespace or quote and capital/newline
  const parts = text.split(/(?<=[.?!])\s+(?=[A-Z0-9"'])/g);
  return parts.map((p) => p.trim()).filter(Boolean);
}
