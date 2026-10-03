/**
 * Slide Title Detector
 * 
 * Detects slide titles by font size and position (first large-text block of each page).
 * Strictly ignores dates (e.g. "2023", "2023:"), slide numbers ("1", "Slide 1"), and title-slide boilerplate.
 */

export interface TextItemLike {
  str?: string;
  text?: string;
  transform?: number[];
  height?: number;
  fontSize?: number;
  x?: number;
  y?: number;
}

export function detectSlideTitleFromItems(
  items: Array<TextItemLike>,
  pageNumber: number,
  totalPages: number
): string {
  if (!items || items.length === 0) return `Slide ${pageNumber}`;

  // Filter valid string items
  const validItems = items.filter(
    (it) => it && typeof (it.str ?? it.text) === 'string' && (it.str ?? it.text)!.trim().length > 0
  );
  if (validItems.length === 0) return `Slide ${pageNumber}`;

  const isDateRegex = /^(?:(?:19|20)\d{2}\b|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\b(?:Spring|Fall|Summer|Winter)\s+(?:19|20)\d{2}\b)[:.]?$/i;
  const isSlideNumberRegex = /^(?:(?:Slide|Page|Slide\s*No\.?|Page\s*No\.?)\s*)?\d+(?:\s*(?:of|\/)\s*\d+)?[:.]?$/i;
  const isBoilerplateRegex = /^(?:course\s+code|department\s+of|university\s+of|instructor\s*:|professor\s*:|all\s+rights\s+reserved|syllabus|overview|agenda)$/i;

  // Group items by line (similar Y coordinate within 6 units)
  const lineBuckets: Array<{
    y: number;
    fontSize: number;
    text: string;
  }> = [];

  let currentLineItems: TextItemLike[] = [];
  let currentY: number | null = null;

  for (const it of validItems) {
    const y = it.transform ? Math.round(it.transform[5]) : (it.y ?? 0);
    if (currentY === null || Math.abs(y - currentY) <= 6) {
      currentLineItems.push(it);
      currentY = y;
    } else {
      const lineText = currentLineItems
        .map((c) => c.str ?? c.text ?? '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      const maxFontSize = Math.max(
        ...currentLineItems.map((c) =>
          c.fontSize ?? Math.abs(c.transform ? c.transform[0] || c.transform[3] : c.height || 12)
        )
      );
      if (lineText.length > 0) {
        lineBuckets.push({ y: currentY, fontSize: maxFontSize, text: lineText });
      }

      currentLineItems = [it];
      currentY = y;
    }
  }

  if (currentLineItems.length > 0 && currentY !== null) {
    const lineText = currentLineItems
      .map((c) => c.str ?? c.text ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const maxFontSize = Math.max(
      ...currentLineItems.map((c) =>
        c.fontSize ?? Math.abs(c.transform ? c.transform[0] || c.transform[3] : c.height || 12)
      )
    );
    if (lineText.length > 0) {
      lineBuckets.push({ y: currentY, fontSize: maxFontSize, text: lineText });
    }
  }

  // Filter out dates, slide numbers, and title slide boilerplate
  const candidateLines = lineBuckets.filter((b) => {
    const t = b.text.trim();
    if (t.length < 3) return false;
    if (isDateRegex.test(t)) return false;
    if (isSlideNumberRegex.test(t)) return false;
    if (pageNumber === 1 && isBoilerplateRegex.test(t)) return false;
    return true;
  });

  if (candidateLines.length === 0) {
    return `Slide ${pageNumber}`;
  }

  // Find candidate in the top half with the largest font size
  const maxFont = Math.max(...candidateLines.map((c) => c.fontSize));
  const topCandidates = candidateLines.filter((c) => c.fontSize >= maxFont - 2);

  // Return the highest (top-most in page coordinates, higher Y is top in PDF)
  topCandidates.sort((a, b) => b.y - a.y);
  return topCandidates[0].text;
}
