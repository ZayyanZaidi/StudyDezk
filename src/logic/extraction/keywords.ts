import { GlossaryTerm } from '../../types/glossary';
import { extractAcronyms, KNOWN_COURSE_ACRONYMS } from './acronyms';
import { buildTfIdfModel, extractTopTfIdfTerms } from '../nlp/tfidf';
import { splitSentences } from '../nlp/segmenter';

export function extractGlossaryTerms(
  text: string,
  docId: string,
  docTitle: string,
  course: string,
  workspaceId = 'default'
): GlossaryTerm[] {
  if (!text) return [];

  const sentences = splitSentences(text);
  const termsMap = new Map<string, GlossaryTerm>();

  // 1. Extract acronyms
  const acronyms = extractAcronyms(text);
  for (const ac of acronyms) {
    const known = KNOWN_COURSE_ACRONYMS[ac.acronym];
    const definition = known?.definition || ac.context;
    termsMap.set(ac.acronym, {
      id: `${docId}-ac-${ac.acronym}`,
      workspaceId,
      term: ac.acronym,
      definition: ac.expansion ? `${ac.expansion}. ${definition}` : definition,
      isAcronym: true,
      expansion: ac.expansion || known?.expansion,
      occurrences: (text.match(new RegExp(`\\b${ac.acronym}\\b`, 'gi')) || []).length,
      documentId: docId,
      documentTitle: docTitle,
      course,
      contextSentence: ac.context,
    });
  }

  // 2. Extract definition patterns from sentences
  const definitionPatterns = [
    { regex: /\b([A-Z][a-zA-Z0-9\s-]{2,35})\s+is\s+defined\s+as\s+([^.?!]{10,250})/i, termIdx: 1, defIdx: 2 },
    { regex: /\b([A-Z][a-zA-Z0-9\s-]{2,35})\s+refers\s+to\s+([^.?!]{10,250})/i, termIdx: 1, defIdx: 2 },
    { regex: /\b([A-Z][a-zA-Z0-9\s-]{2,35})\s+means\s+([^.?!]{10,250})/i, termIdx: 1, defIdx: 2 },
    { regex: /^([A-Z][a-zA-Z0-9\s-]{2,30}):\s+([^.?!]{10,250})/m, termIdx: 1, defIdx: 2 },
    { regex: /\b([A-Z][a-zA-Z0-9\s-]{2,35})\s+is\s+(an?\s+[a-z][^.?!]{15,250})/i, termIdx: 1, defIdx: 2 },
  ];

  for (const sentence of sentences) {
    for (const pattern of definitionPatterns) {
      const match = pattern.regex.exec(sentence);
      if (match) {
        const rawTerm = match[pattern.termIdx].trim();
        const rawDef = match[pattern.defIdx].trim();

        // Check if term is valid
        if (rawTerm.length >= 2 && rawTerm.length <= 40 && !/^(The|A|An|This|That|These|Those)$/i.test(rawTerm)) {
          const cleanKey = rawTerm.toLowerCase();
          if (!termsMap.has(cleanKey)) {
            const occurrences = (text.match(new RegExp(`\\b${rawTerm}\\b`, 'gi')) || []).length;
            termsMap.set(cleanKey, {
              id: `${docId}-term-${cleanKey.replace(/\s+/g, '-')}`,
              workspaceId,
              term: rawTerm,
              definition: rawDef.endsWith('.') ? rawDef : rawDef + '.',
              isAcronym: /^[A-Z]{2,6}$/.test(rawTerm),
              occurrences,
              documentId: docId,
              documentTitle: docTitle,
              course,
              contextSentence: sentence,
            });
          }
        }
      }
    }
  }

  // 3. TF-IDF keywords
  const tfidfModel = buildTfIdfModel(sentences);
  const topTfIdf = extractTopTfIdfTerms(text, tfidfModel, 25);

  for (const item of topTfIdf) {
    const termKey = item.term.toLowerCase();
    if (!termsMap.has(termKey) && item.term.length > 3) {
      const matchingSentence = sentences.find((s) =>
        new RegExp(`\\b${item.term}\\b`, 'i').test(s)
      );
      if (matchingSentence) {
        const occurrences = (text.match(new RegExp(`\\b${item.term}\\b`, 'gi')) || []).length;
        termsMap.set(termKey, {
          id: `${docId}-kw-${termKey}`,
          workspaceId,
          term: item.term.charAt(0).toUpperCase() + item.term.slice(1),
          definition: matchingSentence,
          isAcronym: /^[A-Z]{2,6}$/.test(item.term),
          occurrences,
          documentId: docId,
          documentTitle: docTitle,
          course,
          contextSentence: matchingSentence,
        });
      }
    }
  }

  return Array.from(termsMap.values());
}
