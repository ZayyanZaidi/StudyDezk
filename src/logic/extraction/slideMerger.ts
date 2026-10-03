/**
 * Slide-Style Text Merger
 * Merges fragmented lines and wrap-broken bullet points typical of lecture slides
 * into fluent, coherent sentences suitable for summarization and NLP.
 */

const BULLET_REGEX = /^[\s]*([•\-\*–—\u2022\u25E6\u25AA]|\d+[\.\)]|[a-zA-Z][\.\)])\s+/;
const HEADING_INDICATOR_REGEX = /^(lecture|chapter|module|overview|summary|agenda|introduction|section)\b/i;

export interface SlideMergeResult {
  mergedText: string;
  mergedLineCount: number;
  originalLineCount: number;
  detectedBulletPoints: number;
}

export function mergeSlideLines(rawText: string): SlideMergeResult {
  if (!rawText || !rawText.trim()) {
    return {
      mergedText: '',
      mergedLineCount: 0,
      originalLineCount: 0,
      detectedBulletPoints: 0,
    };
  }

  const rawLines = rawText.split(/\r?\n/).map((l) => l.trimEnd());
  const originalLineCount = rawLines.length;

  const processedParagraphs: string[] = [];
  let currentBuffer: string[] = [];
  let detectedBulletPoints = 0;

  function flushBuffer() {
    if (currentBuffer.length === 0) return;
    const joined = currentBuffer.join(' ').replace(/\s+/g, ' ').trim();
    if (joined) {
      // Ensure it ends with punctuation if it's a standalone thought
      if (!/[.!?:;]$/.test(joined)) {
        processedParagraphs.push(joined + '.');
      } else {
        processedParagraphs.push(joined);
      }
    }
    currentBuffer = [];
  }

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();

    // Empty line indicates paragraph / section break
    if (!line) {
      flushBuffer();
      continue;
    }

    const isBullet = BULLET_REGEX.test(line);
    if (isBullet) {
      detectedBulletPoints++;
    }

    const cleanLine = line.replace(BULLET_REGEX, '').trim();

    // Check if line looks like a slide title or standalone heading
    const isHeading =
      (line.length < 50 && /^[A-Z0-9\s:,-]+$/.test(cleanLine) && !/[.]/.test(cleanLine)) ||
      HEADING_INDICATOR_REGEX.test(cleanLine);

    if (isHeading) {
      flushBuffer();
      processedParagraphs.push(cleanLine.endsWith(':') ? cleanLine : cleanLine + ':');
      continue;
    }

    if (isBullet) {
      // Starting a new bullet point: flush previous buffer
      flushBuffer();
      currentBuffer.push(cleanLine);
    } else {
      // Continuation line or standard line
      if (currentBuffer.length > 0) {
        const lastPart = currentBuffer[currentBuffer.length - 1];
        const lastChar = lastPart.slice(-1);
        const startsWithLower = /^[a-z0-9]/.test(cleanLine);
        const endsWithPunct = /[.!?]/.test(lastChar);

        // If previous line did not end with sentence punctuation or current starts with lowercase, merge
        if (!endsWithPunct || startsWithLower || lastChar === ',') {
          currentBuffer.push(cleanLine);
        } else {
          flushBuffer();
          currentBuffer.push(cleanLine);
        }
      } else {
        currentBuffer.push(cleanLine);
      }
    }
  }

  flushBuffer();

  const mergedText = processedParagraphs.join('\n\n');
  const mergedLineCount = processedParagraphs.length;

  return {
    mergedText,
    mergedLineCount,
    originalLineCount,
    detectedBulletPoints,
  };
}
