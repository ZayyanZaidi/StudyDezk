/**
 * Document Cleaner & Normalization Pipeline
 * 
 * 1. Removes copyright / "All rights reserved" lines.
 * 2. Removes repeated footers across pages.
 * 3. Filters administrative slides (textbooks, marks distribution, contact info, learning outcome tables).
 * 4. Removes garbled OCR lines (low alphabetic ratio / noise).
 * 5. Fixes "definition then term" ordering ("... unauthorized effect Replay." -> "Replay: ...").
 * 6. Preserves hyphens in words ("Fail-safe", "resource-intensive") and only rejoins line-break hyphens.
 */

import { DocumentPage } from '../../types/document';

export interface CleanDocumentOptions {
  removeAdministrativeSlides?: boolean;
  minAlphabeticRatio?: number; // default 0.45
}

export interface CleaningStats {
  originalLines: number;
  cleanedLines: number;
  removedCopyrightCount: number;
  removedFooterCount: number;
  removedAdminPagesCount: number;
  removedGarbledLinesCount: number;
  fixedDefinitionTermsCount: number;
}

export interface CleanDocumentResult {
  pages: DocumentPage[];
  cleanedText: string;
  stats: CleaningStats;
}

const COPYRIGHT_REGEX = /(?:©|copyright|\ball\s+rights?\s+reserved\b|confidential|proprietary\s+and\s+confidential)/i;

const ADMIN_SLIDE_PATTERNS = [
  // Textbooks / References
  /^(?:recommended\s+)?(?:textbooks?|reference\s+books?|references|reading\s+list)\b/i,
  /\b(?:isbn[-\s]*\d{10,13}|pearson|mcgraw[-\s]*hill|wiley\s+publishing|prentice\s+hall)\b/i,
  // Grading & Marks Policy
  /^(?:grading\s+policy|marks\s+distribution|assessment\s+scheme|evaluation\s+criteria|grading\s+breakdown)\b/i,
  /\b(?:midterm\s*:\s*\d+%\s*|final\s*exam\s*:\s*\d+%\s*|quizzes\s*:\s*\d+%\s*|assignments\s*:\s*\d+%\s*)\b/i,
  // Office hours & Contact info
  /^(?:instructor|course\s+instructor|contact\s+info(?:rmation)?|office\s+hours|instructor\s+details)\b/i,
  /\b(?:office\s*:\s*(?:room|building|block)\b|email\s*:\s*[\w.-]+@[\w.-]+\.\w+)/i,
  // Learning Outcomes Tables / Course Outlines
  /^(?:course\s+learning\s+outcomes?|clos?\s*(?:to|vs)\s*plos?|syllabus\s+outline|weekly\s+schedule)\b/i,
];

/**
 * Checks if a line is likely garbled OCR noise based on alphabetic character ratio.
 */
export function isGarbledOcrLine(line: string, minAlphaRatio = 0.45): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 8) return false;

  // Count alphanumeric characters vs total non-space characters
  const alphaCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  const nonSpaceCount = trimmed.replace(/\s+/g, '').length;

  if (nonSpaceCount === 0) return true;

  const ratio = alphaCount / nonSpaceCount;

  // Excessive symbols or random non-letter garbage
  const weirdSymbolCount = (trimmed.match(/[~^§±|\\_`]/g) || []).length;
  if (weirdSymbolCount >= 4 && weirdSymbolCount / nonSpaceCount > 0.25) {
    return true;
  }

  return ratio < minAlphaRatio;
}

/**
 * Replaces "definition then term" ordering:
 * e.g. "An attacker intercepts and re-transmits valid data transmission to create an unauthorized effect Replay."
 * -> "Replay: An attacker intercepts and re-transmits valid data transmission to create an unauthorized effect."
 */
export function fixDefinitionThenTerm(sentence: string): { text: string; wasFixed: boolean } {
  const trimmed = sentence.trim();
  if (trimmed.length < 25) {
    return { text: trimmed, wasFixed: false };
  }

  // Matches a descriptive sentence that ends with an unpunctuated or period-terminated capitalized Term:
  // e.g. "... to create an unauthorized effect Replay." or "... modifications by unauthorized parties Data Integrity."
  const termAtEndMatch = trimmed.match(
    /^([A-Z][^.!?]{20,})\s+([A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+){0,3})[.!?]?$/
  );

  if (termAtEndMatch) {
    const definitionBody = termAtEndMatch[1].trim();
    const term = termAtEndMatch[2].trim();

    // Avoid false positives where the last words are normal clause endings
    const commonSentenceEnders = /^(?:Today|Now|Again|Here|There|Also|First|Then|Finally|Example|Note|Chapter|Section|Page)$/i;
    if (commonSentenceEnders.test(term)) {
      return { text: trimmed, wasFixed: false };
    }

    // Check if the definition body looks like a definition or explanation
    const hasDefCharacteristics =
      /^(?:an?|the|a\s+technique|a\s+method|a\s+process|refers\s+to|is\s+when|used\s+to|involves|designed\s+to|prevents|occurs|attacker)/i.test(
        definitionBody
      ) || definitionBody.length > 35;

    if (hasDefCharacteristics) {
      return {
        text: `${term}: ${definitionBody}.`,
        wasFixed: true,
      };
    }
  }

  return { text: trimmed, wasFixed: false };
}

/**
 * Replaces line-break hyphens without altering hyphens inside compound words.
 * ONLY rejoins words split across a newline by a trailing hyphen.
 * Leaves words like "Fail-safe", "resource-intensive", "zero-day" intact!
 */
export function rejoinLineBreakHyphens(text: string): string {
  // Matches word followed by hyphen at end of line, followed by next word part
  return text.replace(/(\b[a-zA-Z]{2,})-\r?\n\s*([a-zA-Z]{2,}\b)/g, '$1$2');
}

/**
 * Cleans extracted PDF pages and raw text according to university document rules.
 */
export function cleanDocumentPages(
  pages: DocumentPage[],
  options: CleanDocumentOptions = {}
): CleanDocumentResult {
  const minAlphaRatio = options.minAlphabeticRatio ?? 0.45;
  const filterAdminSlides = options.removeAdministrativeSlides ?? true;

  let originalLines = 0;
  let cleanedLines = 0;
  let removedCopyrightCount = 0;
  let removedFooterCount = 0;
  let removedAdminPagesCount = 0;
  let removedGarbledLinesCount = 0;
  let fixedDefinitionTermsCount = 0;

  // 1. Identify repeated footers across pages (lines appearing on >= 30% of pages)
  const linePageFrequency = new Map<string, Set<number>>();
  for (const page of pages) {
    const lines = page.text.split('\n').map((l) => l.trim()).filter(Boolean);
    originalLines += lines.length;

    // Check the last 3 lines of each page for footer patterns
    const footerCandidates = lines.slice(-3);
    for (const candidate of footerCandidates) {
      if (candidate.length < 60 && !/[.!?]$/.test(candidate)) {
        const set = linePageFrequency.get(candidate) || new Set();
        set.add(page.pageNumber);
        linePageFrequency.set(candidate, set);
      }
    }
  }

  const repeatedFooters = new Set<string>();
  const thresholdPages = Math.max(2, Math.floor(pages.length * 0.3));
  for (const [line, pageSet] of linePageFrequency.entries()) {
    if (pageSet.size >= thresholdPages) {
      repeatedFooters.add(line);
    }
  }

  // 2. Process pages
  const cleanedPages: DocumentPage[] = [];

  for (const page of pages) {
    const rawLines = page.text.split('\n').map((l) => l.trim()).filter(Boolean);

    // Check if this page is an administrative slide
    if (filterAdminSlides) {
      const pageHeader = (page.heading || page.title || rawLines.slice(0, 3).join(' ')).trim();
      const isAdminHeader = ADMIN_SLIDE_PATTERNS.some((pat) => pat.test(pageHeader));
      const hasExcessiveAdminMatches = rawLines.filter((l) =>
        ADMIN_SLIDE_PATTERNS.some((pat) => pat.test(l))
      ).length >= 2;

      if (isAdminHeader || hasExcessiveAdminMatches) {
        removedAdminPagesCount++;
        continue; // Skip this administrative page
      }
    }

    const filteredLines: string[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      let line = rawLines[i];

      // A. Copyright removal
      if (COPYRIGHT_REGEX.test(line)) {
        removedCopyrightCount++;
        continue;
      }

      // B. Repeated footer removal
      if (repeatedFooters.has(line)) {
        removedFooterCount++;
        continue;
      }

      // C. Garbled OCR noise removal
      if (isGarbledOcrLine(line, minAlphaRatio)) {
        removedGarbledLinesCount++;
        continue;
      }

      // D. Fix "definition then term" ordering
      const defTermResult = fixDefinitionThenTerm(line);
      if (defTermResult.wasFixed) {
        line = defTermResult.text;
        fixedDefinitionTermsCount++;
      }

      filteredLines.push(line);
    }

    const pageJoined = filteredLines.join('\n');
    // E. Rejoin line-break hyphens without modifying in-word hyphens
    const reconciledText = rejoinLineBreakHyphens(pageJoined);

    cleanedLines += filteredLines.length;

    cleanedPages.push({
      ...page,
      text: reconciledText,
      wordCount: reconciledText.split(/\s+/).filter(Boolean).length,
    });
  }

  // Format cleanedText with clear per-page headings
  const pageBlocks = cleanedPages.map((p) => {
    const heading = p.heading || p.title || `Page ${p.pageNumber}`;
    return `--- Page ${p.pageNumber}: ${heading} ---\n\n${p.text}`;
  });

  return {
    pages: cleanedPages,
    cleanedText: pageBlocks.join('\n\n'),
    stats: {
      originalLines,
      cleanedLines,
      removedCopyrightCount,
      removedFooterCount,
      removedAdminPagesCount,
      removedGarbledLinesCount,
      fixedDefinitionTermsCount,
    },
  };
}
