import { SentenceScore } from '../../types/summarizer';

export interface SummarySectionBlock {
  id: string;
  heading: string;
  pageNumber: number;
  paragraphs: string[];
  lists?: string[];
  tables?: string[];
  sentenceScores: SentenceScore[];
  rawText: string;
}

export interface ParagraphFormatterOptions {
  paragraphLength?: 'short' | 'medium' | 'long';
  outputStyle?: 'paragraph' | 'bullets';
  documentTitle?: string;
}

export interface FormattedSummaryResult {
  sections: SummarySectionBlock[];
  fullFormattedText: string;
  bullets: string[];
}

/**
 * Detects section/slide boundaries and headings in the source text.
 */
interface SectionBoundary {
  heading: string;
  pageNumber: number;
  startIndex: number;
  endIndex: number;
}

export function detectSectionBoundaries(sourceText: string, defaultTitle = 'Overview'): SectionBoundary[] {
  if (!sourceText.trim()) {
    return [{ heading: defaultTitle, pageNumber: 1, startIndex: 0, endIndex: 0 }];
  }

  const isDateRegex = /^(?:(?:19|20)\d{2}\b|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\b(?:Spring|Fall|Summer|Winter)\s+(?:19|20)\d{2}\b)[:.]?$/i;
  const isSlideNumberRegex = /^(?:(?:Slide|Page|Slide\s*No\.?|Page\s*No\.?)\s*)?\d+(?:\s*(?:of|\/)\s*\d+)?[:.]?$/i;

  // Regex for slide / page markers or markdown headings or strong standalone headers
  // 1: --- Page N: Title --- or --- Slide N: Title ---
  // 2: page num
  // 3: title inside delimiter
  // 4: Slide N: Title
  // 5: Page N: Title
  // 6: ### Heading
  // 7: Standalone uppercase line
  const markerRegex = /(?:^|\n)(?:(---+\s*(?:Slide|Page)\s*(\d+)(?:\s*[:\-–—]\s*([^\n-]+?))?\s*---+)|Slide\s*(\d+)[:\s]+([^\n]+)|Page\s*(\d+)[:\s]*([^\n]*)|#{1,4}\s+([^\n]+)|(?:[0-9]+\.[0-9]*\s+)?([A-Z0-9\s,:\-]{4,60})(?=\n|$))/g;

  const boundaries: SectionBoundary[] = [];
  let match: RegExpExecArray | null;
  let currentPage = 1;

  while ((match = markerRegex.exec(sourceText)) !== null) {
    const matchPos = match.index;

    // Check if it's a page/slide number
    if (match[2]) {
      currentPage = parseInt(match[2], 10) || currentPage;
    } else if (match[4]) {
      currentPage = parseInt(match[4], 10) || currentPage;
    } else if (match[6]) {
      currentPage = parseInt(match[6], 10) || currentPage;
    }

    // Determine heading text
    let headingText = '';
    if (match[3] && match[3].trim()) {
      // Delimiter had title e.g. "--- Page 2: Cache Hierarchy ---"
      headingText = match[3].trim();
    } else if (match[5]) {
      headingText = match[5].trim();
    } else if (match[7] && match[7].trim()) {
      headingText = match[7].trim();
    } else if (match[8] && match[8].trim()) {
      headingText = match[8].trim();
    } else if (match[9] && match[9].trim().length >= 4) {
      const candidate = match[9].trim();
      if (!candidate.endsWith('.') && candidate.length < 60) {
        headingText = candidate;
      }
    }

    // Clean heading
    headingText = headingText.replace(/^[#:\s\-*•]+|[#:\s\-*•]+$/g, '').trim();

    // Ignore dates, pure slide numbers, or empty headings
    if (isDateRegex.test(headingText) || isSlideNumberRegex.test(headingText)) {
      headingText = '';
    }

    if (!headingText && (match[2] || match[4] || match[6])) {
      headingText = `Slide ${currentPage}`;
    }

    if (headingText && headingText.length > 0) {
      boundaries.push({
        heading: headingText,
        pageNumber: currentPage,
        startIndex: matchPos,
        endIndex: sourceText.length,
      });
    }
  }

  // Adjust endIndex of each boundary
  for (let i = 0; i < boundaries.length - 1; i++) {
    boundaries[i].endIndex = boundaries[i + 1].startIndex;
  }

  // If no clear boundaries found, create a default one
  if (boundaries.length === 0) {
    boundaries.push({
      heading: defaultTitle,
      pageNumber: 1,
      startIndex: 0,
      endIndex: sourceText.length,
    });
  } else if (boundaries[0].startIndex > 0) {
    // Only prepend an Overview section if there is substantial non-whitespace text before the first heading
    const textBefore = sourceText.slice(0, boundaries[0].startIndex).trim();
    if (textBefore.length >= 25) {
      boundaries.unshift({
        heading: defaultTitle,
        pageNumber: 1,
        startIndex: 0,
        endIndex: boundaries[0].startIndex,
      });
    }
  }

  return boundaries;
}

/**
 * Folds sentence fragments into neighboring sentences and merges definitions.
 * Fixes hyphen bug: NEVER alters in-word hyphens ("Fail-safe", "resource-intensive") into colons!
 */
export function foldFragmentsAndMergeDefinitions(sentences: string[]): string[] {
  if (sentences.length === 0) return [];

  const result: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    let current = sentences[i].trim();
    if (!current) continue;

    // 1. Definition merging: Check if previous sentence was a term and current is the definition
    // e.g. "Gradient Descent:" + "is an optimization algorithm..."
    if (result.length > 0) {
      const prev = result[result.length - 1];
      const prevIsTerm = /^[A-Z][a-zA-Z0-9\s_]{1,40}[:]$/.test(prev.trim());
      const currentIsDef = /^(?:is\s+|refers\s+to|means\s+|an?\s+|the\s+process|defined\s+as)/i.test(current);

      if (prevIsTerm && currentIsDef) {
        // Merge into bold term with definition
        const term = prev.replace(/[:\s]+$/, '');
        result[result.length - 1] = `**${term}:** ${current}`;
        continue;
      }

    // Check if current is a definition marker "Term: Description" or "Term - Description"
    // Requires whitespace around hyphen (\s+[-–—]\s+) so in-word hyphens ("Fail-safe", "resource-intensive") are NEVER touched!
    const inlineDefMatch = current.match(/^([A-Z][a-zA-Z0-9\s]{1,35})(?::\s*|\s+[-–—]\s+)(.+)$/);
    if (inlineDefMatch && !current.startsWith('**')) {
      const term = inlineDefMatch[1].trim();
      const def = inlineDefMatch[2].trim();
      // Ensure term is not an in-word hyphen and def is a real explanation
      if (!term.includes('-') && def.length > 5) {
        current = `**${term}:** ${def}`;
      }
    }

      // 2. Fragment folding:
      // Starts with lowercase or conjunctions / participle phrases without subject
      const isFragment =
        /^[a-z]/.test(current) ||
        /^(?:and|or|but|because|which|such as|e\.g\.|i\.e\.|including|specifically|furthermore|moreover|whereas)\b/i.test(
          current
        ) ||
        (current.length < 20 && !/[.!?]$/.test(current));

      if (isFragment) {
        // Fold into previous sentence
        const prevClean = prev.replace(/[.!?]+$/, '');
        const joiner = /^(?:which|such as|e\.g\.|i\.e\.|including)/i.test(current) ? ', ' : ' — ';
        result[result.length - 1] = `${prevClean}${joiner}${current}`;
        continue;
      }
    }

    result.push(current);
  }

  return result;
}

/**
 * Checks if a block of text contains a markdown or ASCII table.
 */
function isTableBlock(text: string): boolean {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return false;
  return lines.some((l) => l.includes('|') && l.startsWith('|') && l.endsWith('|'));
}

/**
 * Checks if a block of text represents an enumeration / list.
 */
function isListBlock(text: string): boolean {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return false;
  const listMatches = lines.filter((l) => /^([0-9]+[.)]|[-*•]|\([a-z0-9]+\))\s+/i.test(l));
  return listMatches.length >= lines.length * 0.6;
}

/**
 * Formats extractive summary sentences into flowing paragraphs with bold heading lead-ins,
 * respecting the user's paragraph length preference (short, medium, long) and style.
 */
export function formatParagraphSummary(
  selectedSentences: SentenceScore[],
  sourceText: string,
  options: ParagraphFormatterOptions = {}
): FormattedSummaryResult {
  const paragraphLength = options.paragraphLength || 'medium';
  const outputStyle = options.outputStyle || 'paragraph';
  const docTitle = options.documentTitle || 'Overview';

  if (!selectedSentences || selectedSentences.length === 0) {
    return {
      sections: [],
      fullFormattedText: '',
      bullets: [],
    };
  }

  // 1. Detect source text sections and assign each selected sentence to a section
  const boundaries = detectSectionBoundaries(sourceText, docTitle);

  // Determine target sentence count per paragraph
  const targetPerParagraph =
    paragraphLength === 'short' ? 2 : paragraphLength === 'long' ? 7 : 4;

  // Map sentences into boundaries based on position in sourceText
  const sectionBuckets = boundaries.map((b) => ({
    boundary: b,
    sentences: [] as SentenceScore[],
  }));

  for (const sScore of selectedSentences) {
    const sText = sScore.sentence.trim();
    let foundIndex = sourceText.indexOf(sText);
    let matchedBucket = sectionBuckets[0];

    if (foundIndex !== -1) {
      for (const bucket of sectionBuckets) {
        if (foundIndex >= bucket.boundary.startIndex && foundIndex <= bucket.boundary.endIndex) {
          matchedBucket = bucket;
          break;
        }
      }
    } else {
      // Fallback: estimate by sentence index proportion
      const approxPos = Math.round(
        (sScore.originalIndex / Math.max(1, selectedSentences.length)) * sourceText.length
      );
      for (const bucket of sectionBuckets) {
        if (approxPos >= bucket.boundary.startIndex && approxPos <= bucket.boundary.endIndex) {
          matchedBucket = bucket;
          break;
        }
      }
    }

    matchedBucket.sentences.push(sScore);
  }

  // Filter out empty buckets
  const activeBuckets = sectionBuckets.filter((b) => b.sentences.length > 0);

  // If no buckets ended up with sentences (edge case), bundle all in one
  if (activeBuckets.length === 0) {
    activeBuckets.push({
      boundary: {
        heading: docTitle,
        pageNumber: 1,
        startIndex: 0,
        endIndex: sourceText.length,
      },
      sentences: selectedSentences,
    });
  }

  const sections: SummarySectionBlock[] = [];
  const allBullets: string[] = [];
  const fullTextBlocks: string[] = [];

  for (let sIdx = 0; sIdx < activeBuckets.length; sIdx++) {
    const bucket = activeBuckets[sIdx];
    const heading = bucket.boundary.heading;
    const pageNumber = bucket.boundary.pageNumber;

    // Sort sentences by original index to maintain source sequence
    bucket.sentences.sort((a, b) => a.originalIndex - b.originalIndex);

    // Extract raw sentence strings
    const rawSentences = bucket.sentences.map((s) => s.sentence);

    // Fold fragments and merge definitions
    const cleanedSentences = foldFragmentsAndMergeDefinitions(rawSentences);

    // Add to all bullets
    for (const sent of cleanedSentences) {
      allBullets.push(sent.replace(/^[-*•]\s*/, ''));
    }

    // Check for lists or tables in source chunk for this section
    const sourceChunk = sourceText.slice(bucket.boundary.startIndex, bucket.boundary.endIndex);
    const tables: string[] = [];
    const lists: string[] = [];

    // Check for table lines
    const chunkLines = sourceChunk.split('\n');
    let tableBuffer: string[] = [];
    for (const line of chunkLines) {
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        tableBuffer.push(line.trim());
      } else if (tableBuffer.length > 0) {
        if (tableBuffer.length >= 2) {
          tables.push(tableBuffer.join('\n'));
        }
        tableBuffer = [];
      }
    }
    if (tableBuffer.length >= 2) {
      tables.push(tableBuffer.join('\n'));
    }

    // Chunk sentences into flowing paragraphs
    const paragraphs: string[] = [];

    if (outputStyle === 'bullets') {
      // Bullet mode: each sentence is a clean bullet point
      const bulletList = cleanedSentences.map((s) => `• ${s}`).join('\n\n');
      paragraphs.push(bulletList);
    } else {
      // Flowing Paragraph mode:
      // Group sentences into chunks based on targetPerParagraph
      for (let p = 0; p < cleanedSentences.length; p += targetPerParagraph) {
        const chunk = cleanedSentences.slice(p, p + targetPerParagraph);
        let joined = chunk.join(' ');

        // Apply bold lead-in heading to the very first paragraph of the section
        if (p === 0) {
          joined = `**[${heading}]:** ${joined}`;
        }

        paragraphs.push(joined);
      }
    }

    // Build rawText for this section
    const sectionTextParts = [...paragraphs];
    if (lists.length > 0) {
      sectionTextParts.push(lists.join('\n\n'));
    }
    if (tables.length > 0) {
      sectionTextParts.push(tables.join('\n\n'));
    }

    const sectionBlock: SummarySectionBlock = {
      id: `sec-${sIdx}-${pageNumber}`,
      heading,
      pageNumber,
      paragraphs,
      lists: lists.length > 0 ? lists : undefined,
      tables: tables.length > 0 ? tables : undefined,
      sentenceScores: bucket.sentences,
      rawText: sectionTextParts.join('\n\n'),
    };

    sections.push(sectionBlock);

    if (outputStyle === 'bullets') {
      fullTextBlocks.push(`### ${heading}\n\n${paragraphs.join('\n\n')}`);
    } else {
      fullTextBlocks.push(paragraphs.join('\n\n'));
    }
  }

  return {
    sections,
    fullFormattedText: fullTextBlocks.join('\n\n'),
    bullets: allBullets,
  };
}
