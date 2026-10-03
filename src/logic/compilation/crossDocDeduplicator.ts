import { CompilationSection } from '../../types/compilation';
import { tokenize, isStopword } from '../nlp/stopwords';

/**
 * Computes token overlap Jaccard similarity between two strings
 */
function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(tokenize(a).filter((t) => !isStopword(t)));
  const tokensB = new Set(tokenize(b).filter((t) => !isStopword(t)));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let common = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) common++;
  }
  const union = tokensA.size + tokensB.size - common;
  return union > 0 ? common / union : 0;
}

/**
 * Extracts a definition term if present (e.g. "**Replay Attacks:** ...")
 */
function extractDefinitionTerm(sentence: string): string | null {
  const match = sentence.match(/^\*\*([A-Za-z0-9\s_-]{2,40}):\*\*/);
  return match ? match[1].trim().toLowerCase() : null;
}

/**
 * Performs cross-document deduplication across compilation sections.
 * When multiple documents repeat the same definition or point:
 * - Keeps the best (most comprehensive) version once.
 * - Records cross-references (e.g. "also in Lecture 3") on related sections.
 * - Suppresses near-identical repetitive sentences in subsequent documents.
 */
export function deduplicateCrossDocumentSections(
  sections: CompilationSection[]
): CompilationSection[] {
  // Global registry of seen points: term/key -> { docId, docTitle, pageNumber, text }
  const seenDefinitions = new Map<
    string,
    { docId: string; docTitle: string; pageNumber: number; text: string }
  >();
  const seenSentences: Array<{
    docId: string;
    docTitle: string;
    pageNumber: number;
    text: string;
  }> = [];

  const deduplicatedSections: CompilationSection[] = [];

  for (const section of sections) {
    const keptParagraphs: string[] = [];
    const crossRefs: string[] = [...(section.crossReferences || [])];

    for (const para of section.paragraphs) {
      // Check for bold term definition
      const defTerm = extractDefinitionTerm(para);
      if (defTerm) {
        const existing = seenDefinitions.get(defTerm);
        if (existing && existing.docId !== section.documentId) {
          // Point is repeated in another document
          const refNote = `also in ${existing.docTitle} (p. ${existing.pageNumber})`;
          if (!crossRefs.includes(refNote)) {
            crossRefs.push(refNote);
          }
          // If the new definition is significantly longer (> 1.3x), upgrade it; else suppress duplicate
          if (para.length > existing.text.length * 1.3) {
            seenDefinitions.set(defTerm, {
              docId: section.documentId,
              docTitle: section.documentTitle,
              pageNumber: section.pageNumber,
              text: para,
            });
            keptParagraphs.push(para);
          }
          continue;
        } else if (!existing) {
          seenDefinitions.set(defTerm, {
            docId: section.documentId,
            docTitle: section.documentTitle,
            pageNumber: section.pageNumber,
            text: para,
          });
          keptParagraphs.push(para);
          continue;
        }
      }

      // Check general sentence similarity across previously seen sentences from other documents
      let isDuplicate = false;
      for (const seen of seenSentences) {
        if (seen.docId !== section.documentId) {
          const sim = tokenSimilarity(para, seen.text);
          if (sim >= 0.72) {
            isDuplicate = true;
            const refNote = `also in ${seen.docTitle}`;
            if (!crossRefs.includes(refNote)) {
              crossRefs.push(refNote);
            }
            break;
          }
        }
      }

      if (!isDuplicate) {
        seenSentences.push({
          docId: section.documentId,
          docTitle: section.documentTitle,
          pageNumber: section.pageNumber,
          text: para,
        });
        keptParagraphs.push(para);
      }
    }

    // Ensure section doesn't become empty if all points were duplicates
    if (keptParagraphs.length === 0 && section.paragraphs.length > 0) {
      keptParagraphs.push(section.paragraphs[0]);
    }

    deduplicatedSections.push({
      ...section,
      paragraphs: keptParagraphs,
      crossReferences: crossRefs,
      summaryText: keptParagraphs.join('\n\n'),
    });
  }

  return deduplicatedSections;
}
