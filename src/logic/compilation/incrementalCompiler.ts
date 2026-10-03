import {
  CourseCompilation,
  CompilationPreset,
  DocumentCompilationConfig,
  CachedDocumentOutput,
  ManualUserEdit,
  CompilationSection,
} from '../../types/compilation';
import { generateTableOfContents } from './tocGenerator';
import { deduplicateCrossDocumentSections } from './crossDocDeduplicator';
import { GlossaryTerm } from '../../types/glossary';
import { Flashcard } from '../../types/flashcard';

export interface CompileCourseOptions {
  workspaceId: string;
  course: string;
  title: string;
  preset: CompilationPreset;
  requirement?: string;
  cachedDocs: CachedDocumentOutput[];
  documentConfigs: Record<string, DocumentCompilationConfig>;
  manualEdits: ManualUserEdit[];
}

/**
 * Recompiles the unified course compilation from cached document artifacts.
 * Operates purely in-memory/IndexedDB cache without re-reading source files.
 * Preserves user edits, figure statuses, document order, and deduplicates cross-doc repetition.
 */
export function compileCourse(options: CompileCourseOptions): CourseCompilation {
  const {
    workspaceId,
    course,
    title,
    preset,
    requirement,
    cachedDocs,
    documentConfigs,
    manualEdits,
  } = options;

  // 1. Order documents by user-configured sequence
  const orderedDocs = [...cachedDocs]
    .filter((doc) => {
      const cfg = documentConfigs[doc.documentId];
      return cfg ? cfg.included !== false : true;
    })
    .sort((a, b) => {
      const orderA = documentConfigs[a.documentId]?.order ?? 9999;
      const orderB = documentConfigs[b.documentId]?.order ?? 9999;
      return orderA - orderB;
    });

  // Map manual user edits by sectionId
  const editMap = new Map<string, ManualUserEdit>();
  for (const edit of manualEdits) {
    editMap.set(edit.sectionId, edit);
  }

  // 2. Aggregate sections across ordered documents
  const rawSections: CompilationSection[] = [];
  const sectionsByDoc = new Map<string, CompilationSection[]>();

  for (const doc of orderedDocs) {
    const docSections: CompilationSection[] = [];
    const effectivePreset = documentConfigs[doc.documentId]?.presetOverride || preset;

    for (const sec of doc.sections) {
      const edit = editMap.get(sec.id);

      // Filter/scale paragraphs according to preset
      let paragraphs = [...sec.paragraphs];
      if (effectivePreset === 'brief') {
        paragraphs = paragraphs.slice(0, 2);
      } else if (effectivePreset === 'standard') {
        paragraphs = paragraphs.slice(0, 4);
      } else if (effectivePreset === 'exam') {
        // Prioritize definitions and bold key points
        paragraphs = paragraphs.filter(
          (p) => p.includes('**') || /^(?:key|important|exam|principle|rule|distinction)\b/i.test(p)
        );
        if (paragraphs.length === 0) paragraphs = sec.paragraphs.slice(0, 3);
      }

      // Filter kept figures
      const activeFigures = sec.figures.filter((f) => f.userStatus !== 'removed');

      const compiledSec: CompilationSection = {
        ...sec,
        documentTitle: doc.title,
        paragraphs,
        summaryText: paragraphs.join('\n\n'),
        figures: activeFigures,
        userNotes: edit?.userNotes,
        userSummaryOverride: edit?.customSummary,
      };

      docSections.push(compiledSec);
      rawSections.push(compiledSec);
    }

    sectionsByDoc.set(doc.documentId, docSections);
  }

  // 3. Perform cross-document deduplication with provenance notes
  const deduplicatedSections = deduplicateCrossDocumentSections(rawSections);

  // Re-map deduplicated sections to docs for TOC generation
  const dedupedSectionsByDoc = new Map<string, CompilationSection[]>();
  for (const sec of deduplicatedSections) {
    const list = dedupedSectionsByDoc.get(sec.documentId) || [];
    list.push(sec);
    dedupedSectionsByDoc.set(sec.documentId, list);
  }

  // 4. Generate anchor-linked Table of Contents
  const toc = generateTableOfContents(
    orderedDocs.map((d, idx) => ({
      id: d.documentId,
      title: d.title,
      order: documentConfigs[d.documentId]?.order ?? idx + 1,
    })),
    dedupedSectionsByDoc
  );

  // 5. Merge and deduplicate Course-Wide Glossary
  const glossaryMap = new Map<string, GlossaryTerm>();
  for (const doc of orderedDocs) {
    for (const term of doc.glossaryTerms || []) {
      const key = term.term.trim().toLowerCase();
      if (!glossaryMap.has(key)) {
        glossaryMap.set(key, { ...term, workspaceId });
      } else {
        // If second occurrence has longer explanation, update definition while preserving term
        const existing = glossaryMap.get(key)!;
        if (term.definition.length > existing.definition.length) {
          glossaryMap.set(key, {
            ...term,
            workspaceId,
            occurrences: existing.occurrences + term.occurrences,
          });
        }
      }
    }
  }
  const mergedGlossary = Array.from(glossaryMap.values()).sort((a, b) =>
    a.term.localeCompare(b.term)
  );

  // 6. Merge and deduplicate Course-Wide Flashcards
  const flashcardMap = new Map<string, Flashcard>();
  for (const doc of orderedDocs) {
    for (const card of doc.flashcards || []) {
      const key = card.front.trim().toLowerCase();
      if (!flashcardMap.has(key)) {
        flashcardMap.set(key, { ...card, workspaceId });
      }
    }
  }
  const mergedFlashcards = Array.from(flashcardMap.values());

  // 7. Calculate Compilation Statistics
  let totalWords = 0;
  let totalFigures = 0;
  for (const sec of deduplicatedSections) {
    const content = sec.userSummaryOverride || sec.summaryText;
    totalWords += content.split(/\s+/).filter(Boolean).length;
    totalFigures += sec.figures.length;
  }
  const readingTimeMinutes = Math.max(1, Math.round(totalWords / 200));

  return {
    id: `compilation-${workspaceId}`,
    workspaceId,
    course,
    title: `${course} — Unified Course Compilation`,
    lastUpdated: Date.now(),
    preset,
    requirement,
    toc,
    sections: deduplicatedSections,
    mergedGlossary,
    mergedFlashcards,
    documentConfigs,
    stats: {
      totalDocuments: cachedDocs.length,
      includedDocuments: orderedDocs.length,
      totalFigures,
      wordCount: totalWords,
      readingTimeMinutes,
    },
  };
}
