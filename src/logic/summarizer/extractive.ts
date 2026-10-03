import { Summarizer, SummarizeOptions, SummaryResult, SentenceScore } from '../../types/summarizer';
import { splitSentences } from '../nlp/segmenter';
import { rankSentences } from '../nlp/textrank';
import { cosineSimilarity, sentenceTokenOverlap } from '../nlp/similarity';
import { tokenize } from '../nlp/stopwords';

export class ExtractiveSummarizer implements Summarizer {
  async summarize(text: string, options: SummarizeOptions): Promise<SummaryResult> {
    const rawSentences = splitSentences(text);

    if (rawSentences.length === 0) {
      return {
        text: '',
        bullets: [],
        selectedSentences: [],
        allSentences: [],
        originalSentenceCount: 0,
        summarySentenceCount: 0,
        compressionRatio: 0,
        wordCount: 0,
        readingTimeMinutes: 0,
      };
    }

    if (rawSentences.length === 1) {
      const singleScore: SentenceScore = {
        sentence: rawSentences[0],
        originalIndex: 0,
        textRankScore: 1.0,
        requirementScore: 1.0,
        finalScore: 1.0,
      };
      return {
        text: rawSentences[0],
        bullets: [rawSentences[0]],
        selectedSentences: [singleScore],
        allSentences: [singleScore],
        originalSentenceCount: 1,
        summarySentenceCount: 1,
        compressionRatio: 1.0,
        wordCount: rawSentences[0].split(/\s+/).length,
        readingTimeMinutes: 1,
      };
    }

    // 1. TextRank sentence scoring
    const textRankScores = rankSentences(rawSentences, {
      sentenceVectors: options.sentenceEmbeddings,
    });
    const trScoreMap = new Map<number, number>();
    for (const item of textRankScores) {
      trScoreMap.set(item.index, item.score);
    }

    // 2. Requirement matching (Embedding cosine or token overlap fallback)
    const hasRequirement = Boolean(options.requirement && options.requirement.trim());
    const reqTokens = hasRequirement ? tokenize(options.requirement!) : [];
    const reqWeight = options.requirementWeight ?? 0.6; // Balance between salience & focus

    const allScores: SentenceScore[] = rawSentences.map((sentence, index) => {
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
          // Token overlap fallback
          const sentTokens = tokenize(sentence);
          reqScore = sentenceTokenOverlap(reqTokens, sentTokens);
        }
      }

      // Positional prior: lead sentences often carry introductory significance (+5%)
      const positionBonus = index === 0 ? 0.08 : index < 3 ? 0.03 : 0.0;

      const finalScore = hasRequirement
        ? (1 - reqWeight) * trScore + reqWeight * reqScore + positionBonus
        : trScore + positionBonus;

      return {
        sentence,
        originalIndex: index,
        textRankScore: Number(trScore.toFixed(4)),
        requirementScore: Number(reqScore.toFixed(4)),
        finalScore: Number(finalScore.toFixed(4)),
      };
    });

    // 3. Selection Strategy: Comprehensive Coverage vs Explicit Limit
    const totalCount = rawSentences.length;
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
      // Default / Auto: Comprehensive Content Coverage
      // Ensures all major sections/topics across the document are represented while highlighting key points.
      const rawParagraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
      const selectedIndices = new Set<number>();

      if (rawParagraphs.length > 1) {
        // Map each sentence to its corresponding paragraph
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
            // Select the #1 key sentence from this section
            selectedIndices.add(paraScores[0].originalIndex);
            // For longer paragraphs (> 4 sentences), also include the #2 key point
            if (paraScores.length > 4 && paraScores[1]) {
              selectedIndices.add(paraScores[1].originalIndex);
            }
          }
        }
      }

      // If document was not partitioned by paragraphs or had very few,
      // select key sentences spanning beginning, middle, and end.
      if (selectedIndices.size < Math.min(4, totalCount)) {
        const sorted = [...allScores].sort((a, b) => b.finalScore - a.finalScore);
        const autoCount = Math.max(2, Math.min(totalCount, Math.ceil(totalCount * 0.4)));
        for (let i = 0; i < autoCount; i++) {
          selectedIndices.add(sorted[i].originalIndex);
        }
      }

      // If a semantic requirement was provided, ensure any sentence with high requirement match is included
      if (hasRequirement) {
        const reqMatches = [...allScores].filter((s) => s.requirementScore > 0.4);
        for (const rm of reqMatches.slice(0, 3)) {
          selectedIndices.add(rm.originalIndex);
        }
      }

      selectedSentences = allScores.filter((s) => selectedIndices.has(s.originalIndex));
    }

    // 4. Determine key points / highlights among selected sentences
    // Mark the top 40% (or minimum 1) highest scoring sentences as distinct key highlights
    const scoreSortedSelected = [...selectedSentences].sort((a, b) => b.finalScore - a.finalScore);
    const highlightThresholdCount = Math.max(1, Math.ceil(scoreSortedSelected.length * 0.45));
    const highlightIndices = new Set(
      scoreSortedSelected.slice(0, highlightThresholdCount).map((s) => s.originalIndex)
    );

    const finalSelectedWithHighlights = selectedSentences.map((s) => ({
      ...s,
      isKeyPoint: highlightIndices.has(s.originalIndex),
    }));

    // 5. Sort selected sentences back to original chronological order to preserve flow
    finalSelectedWithHighlights.sort((a, b) => a.originalIndex - b.originalIndex);

    // 6. Format output
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
    const originalWords = text.split(/\s+/).filter(Boolean).length;
    const compressionRatio =
      originalWords > 0 ? Number((summaryWords / originalWords).toFixed(2)) : 0;
    const readingTimeMinutes = Math.max(1, Math.ceil(summaryWords / 200));

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
      readingTimeMinutes,
    };
  }
}
