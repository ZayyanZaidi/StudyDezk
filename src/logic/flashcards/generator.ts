import { Flashcard } from '../../types/flashcard';
import { splitSentences } from '../nlp/segmenter';
import { extractAcronyms, KNOWN_COURSE_ACRONYMS } from '../extraction/acronyms';

export function generateFlashcardsFromText(
  text: string,
  docId: string,
  course: string,
  workspaceId = 'default'
): Flashcard[] {
  if (!text) return [];

  const sentences = splitSentences(text);
  const cards: Flashcard[] = [];
  const seenPrompts = new Set<string>();

  function addCard(
    front: string,
    back: string,
    sentence: string,
    pattern: Flashcard['sourcePattern'],
    tag: string
  ) {
    const promptKey = front.toLowerCase().trim();
    if (seenPrompts.has(promptKey) || back.trim().length < 5) return;
    seenPrompts.add(promptKey);

    cards.push({
      id: `${docId}-card-${Date.now()}-${cards.length}`,
      workspaceId,
      documentId: docId,
      course,
      front: front.trim(),
      back: back.trim(),
      sourceSentence: sentence.trim(),
      sourcePattern: pattern,
      tags: [course, tag],
      reviewState: {
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        knownCount: 0,
        hardCount: 0,
      },
      createdAt: Date.now(),
    });
  }

  // 1. Acronym Cards
  const acronyms = extractAcronyms(text);
  for (const ac of acronyms) {
    const known = KNOWN_COURSE_ACRONYMS[ac.acronym];
    const expansion = ac.expansion || known?.expansion;
    const def = known?.definition || ac.context;

    if (expansion) {
      addCard(
        `What does the acronym "${ac.acronym}" stand for?`,
        `${expansion}.\n\nDefinition: ${def}`,
        ac.context,
        'acronym',
        'Acronym'
      );
    }
  }

  // 2. Rule-based definition patterns
  const rules: Array<{
    regex: RegExp;
    termIndex: number;
    defIndex: number;
    pattern: Flashcard['sourcePattern'];
    formatFront: (term: string) => string;
  }> = [
    {
      regex: /\b([A-Z][a-zA-Z0-9\s-]{2,35})\s+is\s+defined\s+as\s+([^.?!]{10,300})/i,
      termIndex: 1,
      defIndex: 2,
      pattern: 'definition_is',
      formatFront: (t) => `How is "${t}" defined?`,
    },
    {
      regex: /\b([A-Z][a-zA-Z0-9\s-]{2,35})\s+refers\s+to\s+([^.?!]{10,300})/i,
      termIndex: 1,
      defIndex: 2,
      pattern: 'definition_refers',
      formatFront: (t) => `What does "${t}" refer to in ${course}?`,
    },
    {
      regex: /\b([A-Z][a-zA-Z0-9\s-]{2,35})\s+means\s+([^.?!]{10,300})/i,
      termIndex: 1,
      defIndex: 2,
      pattern: 'definition_means',
      formatFront: (t) => `What is meant by "${t}"?`,
    },
    {
      regex: /^([A-Z][a-zA-Z0-9\s-]{2,30}):\s+([^.?!]{10,300})/m,
      termIndex: 1,
      defIndex: 2,
      pattern: 'colon_syntax',
      formatFront: (t) => `Define "${t}":`,
    },
    {
      regex: /\b([A-Z][a-zA-Z0-9\s-]{2,35})\s+is\s+(an?\s+[a-z][^.?!]{15,250})/i,
      termIndex: 1,
      defIndex: 2,
      pattern: 'definition_is',
      formatFront: (t) => `What is "${t}"?`,
    },
  ];

  for (const sentence of sentences) {
    for (const rule of rules) {
      const match = rule.regex.exec(sentence);
      if (match) {
        const term = match[rule.termIndex].trim();
        const def = match[rule.defIndex].trim();

        if (
          term.length >= 2 &&
          term.length <= 40 &&
          !/^(The|A|An|This|That|These|Those|One|Another|Some|Many|It|They)$/i.test(term)
        ) {
          const front = rule.formatFront(term);
          const back = def.endsWith('.') ? def : `${def}.`;
          addCard(front, back, sentence, rule.pattern, 'Definition');
        }
      }
    }
  }

  return cards;
}
