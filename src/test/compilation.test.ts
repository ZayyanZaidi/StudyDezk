import { describe, it, expect } from 'vitest';
import { compileCourse } from '../logic/compilation/incrementalCompiler';
import { computeStringHash } from '../logic/compilation/hasher';
import { deduplicateCrossDocumentSections } from '../logic/compilation/crossDocDeduplicator';
import { generateTableOfContents } from '../logic/compilation/tocGenerator';
import {
  CachedDocumentOutput,
  CompilationSection,
  ManualUserEdit,
  DocumentCompilationConfig,
} from '../types/compilation';

describe('Unified Course Compilation & Incremental Processing', () => {
  const sampleDoc1: CachedDocumentOutput = {
    documentId: 'doc-lec1',
    workspaceId: 'ws-cloud',
    contentHash: 'hash-lec1-abc',
    fileName: 'lecture-01-intro.pdf',
    title: 'Lecture 1: Cloud Principles',
    cleanedText: 'Cloud computing delivers on-demand computing services over the internet.',
    pageCount: 3,
    sections: [
      {
        id: 'sec-lec1-s1',
        documentId: 'doc-lec1',
        documentTitle: 'Lecture 1: Cloud Principles',
        pageNumber: 1,
        heading: 'Introduction to Cloud',
        anchorId: 'sec-lec1-intro',
        summaryText: '**Cloud Computing:** Cloud computing refers to on-demand access to virtualized resources.',
        paragraphs: [
          '**Cloud Computing:** Cloud computing refers to on-demand access to virtualized resources.',
          'Elasticity allows scaling dynamic resources quickly based on load requirements.',
        ],
        figures: [],
      },
    ],
    figures: [],
    flashcards: [
      {
        id: 'card-1',
        workspaceId: 'ws-cloud',
        documentId: 'doc-lec1',
        course: 'Cloud Computing',
        front: 'What is Cloud Computing?',
        back: 'On-demand network access to shared pool of computing resources.',
        sourceSentence: 'Cloud computing refers to on-demand access...',
        sourcePattern: 'definition_refers',
        tags: ['cloud'],
        reviewState: { interval: 1, repetitions: 0, easeFactor: 2.5, knownCount: 0, hardCount: 0 },
        createdAt: Date.now(),
      },
    ],
    glossaryTerms: [
      {
        id: 'term-1',
        workspaceId: 'ws-cloud',
        term: 'Cloud Computing',
        definition: 'On-demand availability of computer system resources without direct active management by the user.',
        isAcronym: false,
        occurrences: 5,
        documentId: 'doc-lec1',
        documentTitle: 'Lecture 1: Cloud Principles',
        course: 'Cloud Computing',
        contextSentence: 'Cloud computing refers to on-demand access...',
      },
    ],
    diagrams: [],
    processedAt: Date.now() - 10000,
  };

  const sampleDoc2: CachedDocumentOutput = {
    documentId: 'doc-lec2',
    workspaceId: 'ws-cloud',
    contentHash: 'hash-lec2-def',
    fileName: 'lecture-02-service-models.pdf',
    title: 'Lecture 2: Service Models',
    cleanedText: 'Service models include IaaS, PaaS, and SaaS. Cloud computing refers to on-demand access to virtualized resources.',
    pageCount: 4,
    sections: [
      {
        id: 'sec-lec2-s1',
        documentId: 'doc-lec2',
        documentTitle: 'Lecture 2: Service Models',
        pageNumber: 2,
        heading: 'Recap of Cloud Concepts',
        anchorId: 'sec-lec2-recap',
        summaryText: '**Cloud Computing:** Cloud computing refers to on-demand access to virtualized resources.',
        paragraphs: [
          // Repeating same definition as Lecture 1
          '**Cloud Computing:** Cloud computing refers to on-demand access to virtualized resources.',
          'Infrastructure as a Service (IaaS) provides virtualized hardware, storage, and networking.',
        ],
        figures: [],
      },
    ],
    figures: [],
    flashcards: [
      {
        id: 'card-2',
        workspaceId: 'ws-cloud',
        documentId: 'doc-lec2',
        course: 'Cloud Computing',
        front: 'What is Cloud Computing?', // Duplicate question
        back: 'Access to virtualized infrastructure.',
        sourceSentence: 'Cloud computing refers to on-demand access...',
        sourcePattern: 'definition_refers',
        tags: ['cloud'],
        reviewState: { interval: 1, repetitions: 0, easeFactor: 2.5, knownCount: 0, hardCount: 0 },
        createdAt: Date.now(),
      },
    ],
    glossaryTerms: [
      {
        id: 'term-2',
        workspaceId: 'ws-cloud',
        term: 'Cloud Computing', // Duplicate term
        definition: 'On-demand access to computing infrastructure.',
        isAcronym: false,
        occurrences: 3,
        documentId: 'doc-lec2',
        documentTitle: 'Lecture 2: Service Models',
        course: 'Cloud Computing',
        contextSentence: 'Cloud computing refers to on-demand access...',
      },
    ],
    diagrams: [],
    processedAt: Date.now() - 5000,
  };

  it('1. Incremental compilation operates purely from cache without reprocessing unchanged documents', () => {
    const documentConfigs: Record<string, DocumentCompilationConfig> = {
      'doc-lec1': { documentId: 'doc-lec1', order: 1, included: true },
      'doc-lec2': { documentId: 'doc-lec2', order: 2, included: true },
    };

    const compilation = compileCourse({
      workspaceId: 'ws-cloud',
      course: 'Cloud Computing',
      title: 'Cloud Computing Compilation',
      preset: 'standard',
      cachedDocs: [sampleDoc1, sampleDoc2],
      documentConfigs,
      manualEdits: [],
    });

    expect(compilation).toBeDefined();
    expect(compilation.workspaceId).toBe('ws-cloud');
    expect(compilation.stats.includedDocuments).toBe(2);
    expect(compilation.sections.length).toBeGreaterThan(0);
    // Source documents order preserved
    expect(compilation.sections[0].documentId).toBe('doc-lec1');
  });

  it('2. Detects duplicate uploads using deterministic content hash', () => {
    const textA = 'Sample lecture slides content about virtualization and security.';
    const textB = 'Sample lecture slides content about virtualization and security.';
    const textC = 'Different lecture content about microservices and containers.';

    const hashA = computeStringHash(textA);
    const hashB = computeStringHash(textB);
    const hashC = computeStringHash(textC);

    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashC);
  });

  it('3. Cross-document deduplication identifies repetitive definitions and records provenance notes', () => {
    const rawSections: CompilationSection[] = [
      ...sampleDoc1.sections,
      ...sampleDoc2.sections,
    ];

    const deduped = deduplicateCrossDocumentSections(rawSections);

    // Lecture 2 section should have detected cross-reference
    const lec2Sec = deduped.find((s) => s.documentId === 'doc-lec2');
    expect(lec2Sec).toBeDefined();
    expect(lec2Sec?.crossReferences).toBeDefined();
    expect(lec2Sec?.crossReferences?.some((ref) => ref.includes('also in') || ref.includes('Lecture 1'))).toBe(true);
  });

  it('4. User manual notes and custom summary rewrites survive recompilation', () => {
    const manualEdit: ManualUserEdit = {
      id: 'edit-ws-cloud-sec-lec1-s1',
      workspaceId: 'ws-cloud',
      sectionId: 'sec-lec1-s1',
      documentId: 'doc-lec1',
      userNotes: 'Remember this distinction for midterm exam question 3!',
      customSummary: 'Custom summary override authored directly by student.',
      updatedAt: Date.now(),
    };

    const compilation = compileCourse({
      workspaceId: 'ws-cloud',
      course: 'Cloud Computing',
      title: 'Cloud Computing Compilation',
      preset: 'standard',
      cachedDocs: [sampleDoc1],
      documentConfigs: {
        'doc-lec1': { documentId: 'doc-lec1', order: 1, included: true },
      },
      manualEdits: [manualEdit],
    });

    const targetSection = compilation.sections.find((s) => s.id === 'sec-lec1-s1');
    expect(targetSection).toBeDefined();
    expect(targetSection?.userNotes).toBe('Remember this distinction for midterm exam question 3!');
    expect(targetSection?.userSummaryOverride).toBe('Custom summary override authored directly by student.');
  });

  it('5. Table of contents and course-wide glossary are regenerated and deduplicated', () => {
    const compilation = compileCourse({
      workspaceId: 'ws-cloud',
      course: 'Cloud Computing',
      title: 'Cloud Computing Compilation',
      preset: 'standard',
      cachedDocs: [sampleDoc1, sampleDoc2],
      documentConfigs: {
        'doc-lec1': { documentId: 'doc-lec1', order: 1, included: true },
        'doc-lec2': { documentId: 'doc-lec2', order: 2, included: true },
      },
      manualEdits: [],
    });

    // TOC has entries for docs and sections with anchors
    expect(compilation.toc.length).toBeGreaterThanOrEqual(2);
    expect(compilation.toc[0].anchorId).toBeDefined();
    expect(compilation.toc[0].heading).toContain('Lecture 1');

    // Glossary deduplication: 2 input terms of "Cloud Computing" merged into exactly 1
    const cloudTerms = compilation.mergedGlossary.filter(
      (g) => g.term.toLowerCase() === 'cloud computing'
    );
    expect(cloudTerms.length).toBe(1);

    // Flashcard deduplication: 2 input cards with same front merged into 1
    const cloudCards = compilation.mergedFlashcards.filter(
      (c) => c.front.toLowerCase() === 'what is cloud computing?'
    );
    expect(cloudCards.length).toBe(1);
  });
});
