import {
  Summarizer,
  SummarizeOptions,
  SummaryResult,
  SentenceScore,
  SummaryDefinition,
  SummarySectionGroup,
} from '../../types/summarizer';
import { splitSentences } from '../nlp/segmenter';
import { rankSentences } from '../nlp/textrank';
import { cosineSimilarity, sentenceTokenOverlap } from '../nlp/similarity';
import { tokenize } from '../nlp/stopwords';

/**
 * Filters out garbled OCR lines, slide numbers, headers/footers, and boilerplate.
 */
function cleanAndFilterSentences(sentences: string[]): string[] {
  return sentences.filter((s) => {
    const trimmed = s.trim();
    if (trimmed.length < 12) return false;

    // Drop lone slide / page numbers (e.g. "Page 4 of 28", "Slide 12", "12 / 40")
    if (/^(?:page|slide)?\s*\d+\s*(?:of|\/)?\s*\d*$/i.test(trimmed)) return false;

    // Drop copyright / disclaimers
    if (/©|copyright|all rights reserved|confidential|do not distribute/i.test(trimmed)) return false;

    // Drop garbled lines with low alphabetic ratio (e.g. OCR artifacts: "### --- ____ . , ? !")
    const alphaCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
    if (alphaCount / trimmed.length < 0.45) return false;

    // Ensure at least 3 distinct words
    const words = trimmed.split(/\s+/).filter((w) => w.length > 1);
    if (words.length < 3) return false;

    return true;
  });
}

/**
 * Identifies definitions and key terminology from academic sentences.
 */
function extractDefinitions(sentences: string[]): SummaryDefinition[] {
  const definitions: SummaryDefinition[] = [];
  const seenTerms = new Set<string>();

  const defPatterns = [
    // "X is defined as Y" or "X is defined by Y"
    /^([A-Z][\w\s-]{2,35})\s+(?:is|are)\s+defined\s+as\s+(.+)$/i,
    // "X refers to Y"
    /^([A-Z][\w\s-]{2,35})\s+(?:refers?\s+to)\s+(.+)$/i,
    // "X is a/an Y that/which/designed to Z"
    /^([A-Z][\w\s-]{2,35})\s+(?:is|are)\s+(?:a|an|the)\s+(?:model|system|protocol|pattern|technique|mechanism|architecture|strategy|framework|concept|metric|process)\s+(.+)$/i,
    // "X: Y" definition pattern
    /^([A-Z][\w\s-]{2,30}):\s+([A-Z].+)$/,
  ];

  for (const sentence of sentences) {
    const s = sentence.trim();
    for (const pattern of defPatterns) {
      const match = s.match(pattern);
      if (match && match[1] && match[2]) {
        const rawTerm = match[1].trim();
        const rawDef = match[2].trim();
        const termKey = rawTerm.toLowerCase();

        if (
          !seenTerms.has(termKey) &&
          rawTerm.split(/\s+/).length <= 4 &&
          rawDef.length >= 15
        ) {
          seenTerms.add(termKey);
          definitions.push({
            term: rawTerm,
            definition: rawDef.replace(/\.$/, ''),
            sourceSentence: s,
          });
          if (definitions.length >= 6) break;
        }
      }
    }
  }

  return definitions;
}

/**
 * Organizes selected sentences into coherent logical topic sections.
 */
function buildSectionGroups(
  selectedSentences: SentenceScore[],
  rawText: string
): SummarySectionGroup[] {
  if (selectedSentences.length === 0) return [];

  // 1. Check if source text has Markdown headings (# Heading)
  const lines = rawText.split('\n');
  const headings: { lineIdx: number; title: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (/^#{1,3}\s+[A-Za-z0-9]/.test(l)) {
      headings.push({ lineIdx: i, title: l.replace(/^#{1,3}\s+/, '').trim() });
    }
  }

  // If source text has explicit headings, partition by headings
  if (headings.length >= 2) {
    const groups: SummarySectionGroup[] = headings.map((h, idx) => ({
      id: `group-${idx}`,
      title: h.title,
      sentences: [],
    }));

    // Distribute sentences
    for (const s of selectedSentences) {
      // Find closest heading before or around this sentence
      const targetGroup = groups[Math.min(groups.length - 1, Math.floor((s.originalIndex / Math.max(1, selectedSentences.length)) * groups.length))];
      targetGroup.sentences.push(s);
    }

    const populated = groups.filter((g) => g.sentences.length > 0);
    if (populated.length > 0) return populated;
  }

  // 2. Otherwise cluster sentences into 2-4 semantic topic blocks
  const groupCount = Math.min(3, Math.max(1, Math.ceil(selectedSentences.length / 3)));
  const defaultTitles = [
    'Core Architecture & Principles',
    'Key Operational Mechanisms',
    'Application, Testing & Synthesis',
  ];

  const groups: SummarySectionGroup[] = [];
  const chunkSize = Math.ceil(selectedSentences.length / groupCount);

  for (let i = 0; i < groupCount; i++) {
    const slice = selectedSentences.slice(i * chunkSize, (i + 1) * chunkSize);
    if (slice.length > 0) {
      groups.push({
        id: `section-${i + 1}`,
        title: defaultTitles[i] || `Topic Module ${i + 1}`,
        sentences: slice,
      });
    }
  }

  return groups;
}

export class ExtractiveSummarizer implements Summarizer {
  async summarize(text: string, options: SummarizeOptions): Promise<SummaryResult> {
    const rawSentences = splitSentences(text);
    const validSentences = cleanAndFilterSentences(rawSentences);
    const workingSentences = validSentences.length > 0 ? validSentences : rawSentences;

    const originalWords = text.split(/\s+/).filter(Boolean).length;
    const originalReadingTimeMinutes = Math.max(1, Math.ceil(originalWords / 200));

    if (workingSentences.length === 0) {
      return {
        text: '',
        bullets: [],
        highlights: [],
        selectedSentences: [],
        allSentences: [],
        originalSentenceCount: 0,
        summarySentenceCount: 0,
        compressionRatio: 0,
        wordCount: 0,
        originalWordCount: originalWords,
        wordsSaved: originalWords,
        readingTimeMinutes: 0,
        originalReadingTimeMinutes,
        executiveSummary: 'No extractable text found.',
        keyDefinitions: [],
        sectionGroups: [],
      };
    }

    if (workingSentences.length === 1) {
      const singleScore: SentenceScore = {
        sentence: workingSentences[0],
        originalIndex: 0,
        textRankScore: 1.0,
        requirementScore: 1.0,
        finalScore: 1.0,
        isKeyPoint: true,
      };
      const words = workingSentences[0].split(/\s+/).length;
      return {
        text: workingSentences[0],
        bullets: [workingSentences[0]],
        highlights: [workingSentences[0]],
        selectedSentences: [singleScore],
        allSentences: [singleScore],
        originalSentenceCount: 1,
        summarySentenceCount: 1,
        compressionRatio: 1.0,
        wordCount: words,
        originalWordCount: originalWords,
        wordsSaved: Math.max(0, originalWords - words),
        readingTimeMinutes: 1,
        originalReadingTimeMinutes,
        executiveSummary: workingSentences[0],
        keyDefinitions: extractDefinitions(workingSentences),
        sectionGroups: [{ id: 's1', title: 'Key Concept', sentences: [singleScore] }],
      };
    }

    // 1. TextRank sentence scoring
    const textRankScores = rankSentences(workingSentences, {
      sentenceVectors: options.sentenceEmbeddings,
    });
    const trScoreMap = new Map<number, number>();
    for (const item of textRankScores) {
      trScoreMap.set(item.index, item.score);
    }

    // 2. Requirement matching & Definition Boosting
    const hasRequirement = Boolean(options.requirement && options.requirement.trim());
    const reqTokens = hasRequirement ? tokenize(options.requirement!) : [];
    const reqWeight = options.requirementWeight ?? 0.6;

    const allScores: SentenceScore[] = workingSentences.map((sentence, index) => {
      const trScore = trScoreMap.get(index) ?? 0.5;
      let reqScore = 0;

      if (hasRequirement) {
        if (
          options.requirementEmbedding &&
          options.sentenceEmbeddings &&
          options.sentenceEmbeddings[index]
        ) {
          reqScore = cosineSimilarity(
            options.requirementEmbedding,
            options.sentenceEmbeddings[index]
          );
        } else {
          const sentTokens = tokenize(sentence);
          reqScore = sentenceTokenOverlap(reqTokens, sentTokens);
        }
      }

      // Definition boost: academic statements defining concepts are boosted
      const isDefinition = /\b(?:is defined as|refers to|denotes|consists of|architecture where|mechanism for)\b/i.test(sentence);
      const definitionBonus = isDefinition ? 0.08 : 0.0;

      // Position prior: opening thesis and concluding sentences (+5-8%)
      const isIntro = index === 0 || index === 1;
      const isOutro = index === workingSentences.length - 1;
      const positionBonus = isIntro ? 0.07 : isOutro ? 0.04 : 0.0;

      const finalScore = hasRequirement
        ? (1 - reqWeight) * trScore + reqWeight * reqScore + positionBonus + definitionBonus
        : trScore + positionBonus + definitionBonus;

      return {
        sentence,
        originalIndex: index,
        textRankScore: Number(trScore.toFixed(4)),
        requirementScore: Number(reqScore.toFixed(4)),
        finalScore: Number(finalScore.toFixed(4)),
      };
    });

    // 3. Selection Strategy: Auto Content Coverage Across Document Sections
    const totalCount = workingSentences.length;
    let selectedSentences: SentenceScore[] = [];

    if (options.lengthMode === 'sentences' && typeof options.lengthValue === 'number') {
      const targetCount = Math.max(1, Math.min(totalCount, Math.round(options.lengthValue)));
      const sortedByScore = [...allScores].sort((a, b) => b.finalScore - a.finalScore);
      selectedSentences = sortedByScore.slice(0, targetCount);
    } else if (options.lengthMode === 'percentage' && typeof options.lengthValue === 'number') {
      const pct = Math.max(5, Math.min(100, options.lengthValue)) / 100;
      const targetCount = Math.max(1, Math.min(totalCount, Math.ceil(totalCount * pct)));
      const sortedByScore = [...allScores].sort((a, b) => b.finalScore - a.finalScore);
      selectedSentences = sortedByScore.slice(0, targetCount);
    } else {
      // Auto Coverage across sections/paragraphs
      const rawParagraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
      const selectedIndices = new Set<number>();

      if (rawParagraphs.length > 1) {
        let sentCursor = 0;
        for (const para of rawParagraphs) {
          const paraSentences = splitSentences(para);
          if (paraSentences.length === 0) continue;

          const paraScores: SentenceScore[] = [];
          for (let pIdx = 0; pIdx < paraSentences.length; pIdx++) {
            if (sentCursor < allScores.length) {
              paraScores.push(allScores[sentCursor]);
              sentCursor++;
            }
          }

          if (paraScores.length > 0) {
            paraScores.sort((a, b) => b.finalScore - a.finalScore);
            selectedIndices.add(paraScores[0].originalIndex);
            if (paraScores.length > 4 && paraScores[1]) {
              selectedIndices.add(paraScores[1].originalIndex);
            }
          }
        }
      }

      // If document had few paragraphs, sample top scoring sentences evenly
      if (selectedIndices.size < Math.min(5, totalCount)) {
        const sorted = [...allScores].sort((a, b) => b.finalScore - a.finalScore);
        const autoCount = Math.max(3, Math.min(totalCount, Math.ceil(totalCount * 0.35)));
        for (let i = 0; i < autoCount; i++) {
          selectedIndices.add(sorted[i].originalIndex);
        }
      }

      // If requirement specified, ensure top matched sentences are included
      if (hasRequirement) {
        const reqMatches = [...allScores].filter((s) => s.requirementScore > 0.35);
        for (const rm of reqMatches.slice(0, 3)) {
          selectedIndices.add(rm.originalIndex);
        }
      }

      selectedSentences = allScores.filter((s) => selectedIndices.has(s.originalIndex));
    }

    // 4. Determine key points / highlights among selected sentences
    const scoreSortedSelected = [...selectedSentences].sort((a, b) => b.finalScore - a.finalScore);
    const highlightThresholdCount = Math.max(1, Math.ceil(scoreSortedSelected.length * 0.4));
    const highlightIndices = new Set(
      scoreSortedSelected.slice(0, highlightThresholdCount).map((s) => s.originalIndex)
    );

    const finalSelectedWithHighlights = selectedSentences.map((s) => ({
      ...s,
      isKeyPoint: highlightIndices.has(s.originalIndex),
    }));

    // 5. Sort chronologically to preserve lecture flow
    finalSelectedWithHighlights.sort((a, b) => a.originalIndex - b.originalIndex);

    // 6. Extract definitions, executive summary, and section groups
    const keyDefinitions = extractDefinitions(workingSentences);
    const sectionGroups = buildSectionGroups(finalSelectedWithHighlights, text);

    // Executive summary from top 2-3 highest scoring sentences
    const executiveSentences = scoreSortedSelected
      .slice(0, 3)
      .sort((a, b) => a.originalIndex - b.originalIndex)
      .map((s) => s.sentence);
    const executiveSummary = executiveSentences.join(' ');

    // Format output
    const formattedParagraph = finalSelectedWithHighlights.map((s) => s.sentence).join(' ');
    const formattedBullets = finalSelectedWithHighlights.map((s) =>
      s.sentence.replace(/^\s*[-•]\s*/, '')
    );
    const keyPointHighlights = finalSelectedWithHighlights
      .filter((s) => s.isKeyPoint)
      .map((s) => s.sentence.replace(/^\s*[-•]\s*/, ''));

    const outputText =
      options.outputStyle === 'bullets'
        ? formattedBullets.map((b) => `• ${b}`).join('\n\n')
        : formattedParagraph;

    const summaryWords = outputText.split(/\s+/).filter(Boolean).length;
    const compressionRatio =
      originalWords > 0 ? Number((summaryWords / originalWords).toFixed(2)) : 0;
    const readingTimeMinutes = Math.max(1, Math.ceil(summaryWords / 200));
    const wordsSaved = Math.max(0, originalWords - summaryWords);

    return {
      text: outputText,
      bullets: formattedBullets,
      highlights: keyPointHighlights.length > 0 ? keyPointHighlights : formattedBullets.slice(0, 2),
      selectedSentences: finalSelectedWithHighlights,
      allSentences: allScores,
      originalSentenceCount: totalCount,
      summarySentenceCount: finalSelectedWithHighlights.length,
      compressionRatio,
      wordCount: summaryWords,
      originalWordCount: originalWords,
      wordsSaved,
      readingTimeMinutes,
      originalReadingTimeMinutes,
      executiveSummary,
      keyDefinitions,
      sectionGroups,
    };
  }
}
