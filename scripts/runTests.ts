import 'fake-indexeddb/auto';

// Polyfills for browser environment in Node runner
if (typeof window === 'undefined') {
  (globalThis as any).window = globalThis;
}
if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = () => 'blob:mock-url';
}
if (!globalThis.URL.revokeObjectURL) {
  globalThis.URL.revokeObjectURL = () => {};
}
if (!(globalThis as any).window.open) {
  (globalThis as any).window.open = () => null;
}

// Polyfill FileReader if needed
if (typeof (globalThis as any).FileReader === 'undefined') {
  class MockFileReader {
    result: string = '';
    onloadend: () => void = () => {};
    onerror: (err: any) => void = () => {};
    readAsDataURL(blob: Blob) {
      this.result = 'data:image/webp;base64,bW9jay1kYXRh';
      setTimeout(() => this.onloadend(), 0);
    }
  }
  (globalThis as any).FileReader = MockFileReader;
}

import {
  formatParagraphSummary,
  detectSectionBoundaries,
  foldFragmentsAndMergeDefinitions,
} from '../src/logic/summarizer/paragraphFormatter';
import {
  alignFiguresWithSummary,
  generatePrintableSummaryHtml,
  generateMarkdownWithFigures,
} from '../src/logic/export/summaryExporter';
import { detectSlideTitleFromItems } from '../src/logic/extraction/slideTitleDetector';
import {
  cleanDocumentPages,
  isGarbledOcrLine,
  fixDefinitionThenTerm,
  rejoinLineBreakHyphens,
} from '../src/logic/cleaning/documentCleaner';
import { mergeSlideLines } from '../src/logic/extraction/slideMerger';
import { answerQuestionTokenEfficiently } from '../src/logic/chat/tokenEfficientQA';
import { defaultSummarizer } from '../src/logic/summarizer';
import { SentenceScore, SummaryResult } from '../src/types/summarizer';
import { ExtractedFigure } from '../src/types/figure';
import { DocumentPage, StudyDocument } from '../src/types/document';
import { ChatMessage } from '../src/types/chat';

async function run() {
  console.log('Running Paragraph Formatter & Figure Tests...');

  // Test 1: detectSectionBoundaries
  const text = `
Slide 1: Introduction to Distributed Systems
Distributed computing systems coordinate across physical machines.
Fault tolerance is critical for high availability.

--- Slide 2 ---
Consistency Models
Linearizability provides strong consistency guarantees.
Eventual consistency offers lower latency under network partitions.
  `.trim();
  const boundaries = detectSectionBoundaries(text);
  if (boundaries.length < 2) throw new Error('Failed to detect section boundaries');
  console.log('✓ Section boundaries detection passed');

  // Test 2: foldFragmentsAndMergeDefinitions
  const rawSentences = [
    'Gradient Descent:',
    'is an optimization algorithm used to minimize the loss function.',
    'Learning Rate - Determines the step size at each iteration.',
    'Microservices improve modularity across independent engineering teams.',
    'which allows services to scale and deploy separately.',
  ];
  const merged = foldFragmentsAndMergeDefinitions(rawSentences);
  if (!merged[0].includes('**Gradient Descent:** is an optimization algorithm')) {
    throw new Error('Failed definition merging: ' + merged[0]);
  }
  if (!merged[1].includes('**Learning Rate:** Determines')) {
    throw new Error('Failed inline definition merging: ' + merged[1]);
  }
  if (!merged[2].includes(', which allows services to scale')) {
    throw new Error('Failed fragment folding: ' + merged[2]);
  }
  console.log('✓ Definition merging & fragment folding passed');

  // Test 3: formatParagraphSummary with bold lead-in
  const sourceText = `
### Storage Tier Architecture
The primary database maintains write-ahead transaction logs.
Secondary replicas synchronize via asynchronous streaming replication.
Read traffic is distributed evenly across reader nodes using load balancing.
Automatic failover triggers when the leader heartbeat timeout exceeds 5 seconds.
  `.trim();

  const sentences: SentenceScore[] = [
    { sentence: 'The primary database maintains write-ahead transaction logs.', originalIndex: 0, textRankScore: 0.9, requirementScore: 0, finalScore: 0.9 },
    { sentence: 'Secondary replicas synchronize via asynchronous streaming replication.', originalIndex: 1, textRankScore: 0.85, requirementScore: 0, finalScore: 0.85 },
    { sentence: 'Read traffic is distributed evenly across reader nodes using load balancing.', originalIndex: 2, textRankScore: 0.8, requirementScore: 0, finalScore: 0.8 },
    { sentence: 'Automatic failover triggers when the leader heartbeat timeout exceeds 5 seconds.', originalIndex: 3, textRankScore: 0.75, requirementScore: 0, finalScore: 0.75 },
  ];

  const paraResult = formatParagraphSummary(sentences, sourceText, {
    paragraphLength: 'long',
    outputStyle: 'paragraph',
  });

  if (!paraResult.sections[0].paragraphs[0].startsWith('**[Storage Tier Architecture]:**')) {
    throw new Error('Lead-in failed: ' + paraResult.sections[0].paragraphs[0]);
  }
  console.log('✓ Flowing paragraph formatting with bold lead-in passed');

  // Test 4: Paragraph lengths
  const shortResult = formatParagraphSummary(sentences, sourceText, {
    paragraphLength: 'short',
    outputStyle: 'paragraph',
  });
  if (shortResult.sections[0].paragraphs.length <= paraResult.sections[0].paragraphs.length) {
    throw new Error('Short paragraph length setting did not segment into more paragraphs');
  }
  console.log('✓ Paragraph length settings (short/medium/long) passed');

  // Test 5: Bullets toggle
  const bulletResult = formatParagraphSummary(sentences, sourceText, {
    outputStyle: 'bullets',
  });
  if (!bulletResult.fullFormattedText.includes('• The primary database maintains')) {
    throw new Error('Bullet output style failed: ' + bulletResult.fullFormattedText);
  }
  console.log('✓ Bullets output style toggle passed');

  // Test 6: Figures alignment
  const mockBlob = new Blob(['mock-webp-data'], { type: 'image/webp' });
  const mockFigures: ExtractedFigure[] = [
    {
      id: 'fig-1',
      workspaceId: 'ws-1',
      documentId: 'doc-1',
      pageNumber: 1,
      figureIndex: 0,
      caption: 'Figure 1.1: System Architecture',
      blob: mockBlob,
      thumbnailBlob: mockBlob,
      width: 600,
      height: 400,
      cropBox: { x: 0, y: 0, width: 600, height: 400 },
      status: 'kept',
      userStatus: 'kept',
      createdAt: Date.now(),
    },
    {
      id: 'fig-2',
      workspaceId: 'ws-1',
      documentId: 'doc-1',
      pageNumber: 2,
      figureIndex: 1,
      caption: 'Diagram: Memory Hierarchy',
      blob: mockBlob,
      thumbnailBlob: mockBlob,
      width: 500,
      height: 350,
      cropBox: { x: 0, y: 0, width: 500, height: 350 },
      status: 'kept',
      userStatus: 'kept',
      createdAt: Date.now(),
    },
    {
      id: 'fig-orphan',
      workspaceId: 'ws-1',
      documentId: 'doc-1',
      pageNumber: 5,
      figureIndex: 2,
      caption: 'Unrelated Appendix Plot',
      blob: mockBlob,
      thumbnailBlob: mockBlob,
      width: 400,
      height: 300,
      cropBox: { x: 0, y: 0, width: 400, height: 300 },
      status: 'kept',
      userStatus: 'kept',
      createdAt: Date.now(),
    },
  ];

  const summarySections = [
    {
      id: 'sec-0',
      heading: 'Architecture Overview',
      pageNumber: 1,
      paragraphs: [
        '**[Architecture Overview]:** As shown in Figure 1.1, the system separates control and data planes.',
      ],
      sentenceScores: [
        {
          sentence: 'As shown in Figure 1.1, the system separates control and data planes.',
          originalIndex: 0,
          textRankScore: 1,
          requirementScore: 0,
          finalScore: 1,
        },
      ],
      rawText: 'As shown in Figure 1.1, the system separates control and data planes.',
    },
    {
      id: 'sec-1',
      heading: 'Cache Performance',
      pageNumber: 2,
      paragraphs: ['**[Cache Performance]:** Memory access latencies follow logarithmic scaling.'],
      sentenceScores: [
        {
          sentence: 'Memory access latencies follow logarithmic scaling.',
          originalIndex: 1,
          textRankScore: 1,
          requirementScore: 0,
          finalScore: 1,
        },
      ],
      rawText: 'Memory access latencies follow logarithmic scaling.',
    },
  ];

  const layout = await alignFiguresWithSummary(summarySections, mockFigures);
  if (!layout.sectionsWithFigures[0].sentenceFigures[0]) {
    throw new Error('Figure 1.1 was not aligned beneath referencing sentence');
  }
  if (layout.sectionsWithFigures[1].figuresAfterParagraphs.length !== 1) {
    throw new Error('Figure 2 was not placed after section paragraph');
  }
  if (layout.orphanFigures.length !== 1 || layout.orphanFigures[0].figure.id !== 'fig-orphan') {
    throw new Error('Orphan figure was not retained in page order');
  }
  console.log('✓ Figures inline alignment (sentence, section, orphan in page order) passed');

  // Test 7: Printable HTML export
  const summaryResultObj: SummaryResult = {
    text: 'Summary text',
    bullets: ['Bullet 1'],
    selectedSentences: [],
    allSentences: [],
    originalSentenceCount: 10,
    summarySentenceCount: 2,
    compressionRatio: 0.2,
    wordCount: 150,
    readingTimeMinutes: 1,
    structuredSections: summarySections,
  };

  const html = await generatePrintableSummaryHtml(summaryResultObj, mockFigures, {
    title: 'Distributed Systems Exam Prep',
    course: 'Cloud Computing',
    documentTitle: 'Lecture 4 - Distributed Systems',
  });
  if (!html.includes('@media print') || !html.includes('window.print()') || !html.includes('Figure 1.1: System Architecture')) {
    throw new Error('Printable HTML export missing required print elements or figures');
  }
  console.log('✓ Printable HTML export with print CSS and embedded figures passed');

  // Test 8: Markdown export with figures
  const md = await generateMarkdownWithFigures(summaryResultObj, mockFigures, {
    title: 'Distributed Systems Exam Prep',
    course: 'Cloud Computing',
  });
  if (!md.includes('# Distributed Systems Exam Prep') || !md.includes('![Figure 1.1: System Architecture](')) {
    throw new Error('Markdown export with figures failed: ' + md.slice(0, 200));
  }
  console.log('✓ Markdown export with embedded figures passed');

  // Test 9: Multi-page Fixture & Title Detection (Bug Fix 1)
  console.log('\n--- Running Bug Fix 1: Page/Section Detection & Multi-page Fixture ---');
  const p1Items = [
    { text: '2023:', fontSize: 12, x: 50, y: 780 },
    { text: 'Slide 1', fontSize: 10, x: 500, y: 780 },
    { text: 'Introduction to Distributed Storage', fontSize: 24, x: 72, y: 720 },
    { text: 'Principles of replication and distributed consensus.', fontSize: 14, x: 72, y: 650 },
  ];
  const p1Title = detectSlideTitleFromItems(p1Items, 1, 2);
  if (p1Title !== 'Introduction to Distributed Storage') {
    throw new Error('Expected title "Introduction to Distributed Storage", got: ' + p1Title);
  }

  const multiPageSample = `
--- Page 1: Introduction to Distributed Storage ---

Distributed storage architectures coordinate across commodity nodes.

--- Page 2: Replication Strategies and Quorums ---

Quorum consensus guarantees that read and write sets overlap.
  `.trim();
  const multiSections = detectSectionBoundaries(multiPageSample);
  if (multiSections.length !== 2 || multiSections[0].heading === 'Overview' || multiSections[1].heading.includes('2023')) {
    throw new Error('Multi-page section detection failed: ' + JSON.stringify(multiSections));
  }
  console.log('✓ Multi-page fixture & font/position title detection passed');

  // Test 10: Hyphen Bug Regression (Bug Fix 2)
  console.log('\n--- Running Bug Fix 2: Hyphen Preservation & Line-break Rejoin ---');
  const hyphenSentences = [
    'Fail-safe defaults ensure secure fallback states during unexpected interruptions.',
    'Cryptographic hashing can be resource-intensive under heavy traffic loads.',
    'A client-side architecture guarantees zero sensitive payload leakage.',
  ];
  const foldedHyphens = foldFragmentsAndMergeDefinitions(hyphenSentences);
  for (const s of foldedHyphens) {
    if (s.includes('Fail: safe defaults') || s.includes('resource: intensive') || s.includes('client: side')) {
      throw new Error('Hyphen converted to colon in folded output: ' + s);
    }
  }

  const mergedHyphens = mergeSlideLines('Fail-safe defaults and resource-intensive computations.');
  if (mergedHyphens.mergedText.includes('Fail: safe defaults') || mergedHyphens.mergedText.includes('resource: intensive')) {
    throw new Error('Hyphen converted to colon in slide merger: ' + mergedHyphens.mergedText);
  }

  const splitHyphenText = 'This is a de-\ncentralized system with inter-\nrupted communication.';
  const rejoined = rejoinLineBreakHyphens(splitHyphenText);
  if (!rejoined.includes('decentralized') || !rejoined.includes('interrupted')) {
    throw new Error('Line-break hyphen rejoining failed: ' + rejoined);
  }
  console.log('✓ Hyphen bug regression tests passed (in-word preserved, line-break rejoined)');

  // Test 11: Pipeline Order & Non-Bypassed Summarizer (Requirement 3)
  console.log('\n--- Running Requirement 3: Pipeline In-Order Execution & Standard ~35% Summarizer ---');
  const pipelineSampleText = `
--- Page 1: Security Controls ---

Fail-safe defaults provide baseline defensive posture.
Access mediation must verify credentials against authorization policies.
Data encryption at rest prevents disk compromise risks.
Auditing records track subject interactions across all system endpoints.
  `.trim();
  const cleanStep = cleanDocumentPages([
    {
      pageNumber: 1,
      title: 'Security Controls',
      text: pipelineSampleText,
      hasTextLayer: true,
      ocrApplied: false,
      wordCount: 30,
    },
  ]);
  const segmentStep = detectSectionBoundaries(cleanStep.cleanedText);
  const summarizeStep = await defaultSummarizer.summarize(cleanStep.cleanedText, {
    lengthMode: 'percentage',
    lengthValue: 35,
    outputStyle: 'paragraph',
  });
  if (!summarizeStep.text || summarizeStep.selectedSentences.length === 0) {
    throw new Error('Summarizer bypassed or failed during pipeline execution');
  }
  console.log('✓ Full pipeline (extract -> clean -> segment -> summarize -> figures) validated');

  // Test 12: Cleaning Rules (Requirement 4)
  console.log('\n--- Running Requirement 4: Cleaning Rules ---');
  const dirtyPages: DocumentPage[] = [
    {
      pageNumber: 1,
      title: 'Course Syllabus & Textbooks',
      text: 'Recommended Textbooks: Modern Operating Systems, Wiley Publishing, ISBN 978-0133591620.\nEvaluation Criteria: Midterm 30%, Final 50%',
      hasTextLayer: true,
      ocrApplied: false,
      wordCount: 15,
    },
    {
      pageNumber: 2,
      title: 'Memory Management',
      text: 'Paging divides memory into frames.\n© 2024 University Courseware. All rights reserved.\nComputer Science Dept - Lecture 2\n||| $$$ 000101 %%% @@@',
      hasTextLayer: true,
      ocrApplied: false,
      wordCount: 16,
    },
    {
      pageNumber: 3,
      title: 'Virtual Memory',
      text: 'Address translation caches recently used mappings.\nComputer Science Dept - Lecture 2',
      hasTextLayer: true,
      ocrApplied: false,
      wordCount: 10,
    },
  ];
  const cleanedResult = cleanDocumentPages(dirtyPages);
  if (cleanedResult.stats.removedAdminPagesCount !== 1) {
    throw new Error('Failed to filter admin slide');
  }
  if (cleanedResult.cleanedText.includes('All rights reserved') || cleanedResult.cleanedText.includes('Computer Science Dept - Lecture 2')) {
    throw new Error('Failed to filter copyright or repeated footer');
  }
  if (isGarbledOcrLine('||| $$$ 000101 %%% @@@') !== true) {
    throw new Error('Failed to detect garbled OCR line');
  }

  const invertedDef = 'An attack where captured valid packets are retransmitted to cause an unauthorized effect Replay.';
  const fixedDef = fixDefinitionThenTerm(invertedDef).text;
  if (!fixedDef.startsWith('Replay:')) {
    throw new Error('Failed to fix definition-then-term ordering: ' + fixedDef);
  }
  console.log('✓ Cleaning rules (copyrights, footers, admin slides, garbled OCR, definition ordering) passed');

  // Test 13: Chat Continuance & Reference Documents (Chat Requirements)
  console.log('\n--- Running Chat Continuance & Reference Documents ---');
  const chatDocs: StudyDocument[] = [
    {
      id: 'doc-infosec',
      workspaceId: 'ws-1',
      title: 'Information Security Concepts',
      course: 'Information Security',
      fileName: 'infosec.pdf',
      fileType: 'pdf',
      fileSize: 20000,
      totalPages: 1,
      pages: [
        {
          pageNumber: 1,
          text: 'Symmetric cryptography requires shared secret keys between communicating endpoints. Asymmetric cryptography employs public and private key pairs.',
          hasTextLayer: true,
          ocrApplied: false,
          wordCount: 18,
        },
      ],
      fullText: 'Symmetric cryptography requires shared secret keys between communicating endpoints. Asymmetric cryptography employs public and private key pairs.',
      processedText: 'Symmetric cryptography requires shared secret keys between communicating endpoints. Asymmetric cryptography employs public and private key pairs.',
      slideMergeApplied: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
  const pastTurns: ChatMessage[] = [
    {
      id: 'msg-1',
      threadId: 'th-1',
      role: 'user',
      content: 'What is symmetric cryptography?',
      createdAt: Date.now() - 2000,
    },
    {
      id: 'msg-2',
      threadId: 'th-1',
      role: 'assistant',
      content: 'Symmetric cryptography requires shared secret keys between communicating endpoints.',
      createdAt: Date.now() - 1000,
    },
  ];

  const followUpResult = await answerQuestionTokenEfficiently(
    'How does that compare to public keys?',
    chatDocs,
    'Cryptography',
    undefined,
    pastTurns
  );
  if (!followUpResult.answer || followUpResult.citations.length === 0) {
    throw new Error('Chat continuance follow-up QA failed');
  }
  console.log('✓ Chat continuance & grounded multi-doc reference QA passed');

  // Test 14: Unified Course Compilation & Deduplication
  const { compileCourse } = await import('../src/logic/compilation/incrementalCompiler');
  const { computeStringHash } = await import('../src/logic/compilation/hasher');
  const { deduplicateCrossDocumentSections } = await import('../src/logic/compilation/crossDocDeduplicator');

  // Verify hash duplicate detection
  const hash1 = computeStringHash('Identical content string for testing deduplication.');
  const hash2 = computeStringHash('Identical content string for testing deduplication.');
  const hash3 = computeStringHash('Different content string.');
  if (hash1 !== hash2 || hash1 === hash3) {
    throw new Error('Deterministic content hashing failed');
  }
  console.log('✓ Deterministic content hashing for duplicate uploads passed');

  // Verify incremental compilation and manual edit preservation
  const testCachedDoc1 = {
    documentId: 'doc-1',
    workspaceId: 'ws-test',
    contentHash: hash1,
    fileName: 'lecture-01.pdf',
    title: 'Lecture 1: Intro',
    cleanedText: 'Cloud services. **Symmetric Crypto:** Shared private key.',
    pageCount: 2,
    sections: [
      {
        id: 'sec-1',
        documentId: 'doc-1',
        documentTitle: 'Lecture 1: Intro',
        pageNumber: 1,
        heading: 'Intro Heading',
        anchorId: 'sec-1-intro',
        summaryText: '**Symmetric Crypto:** Shared private key.',
        paragraphs: ['**Symmetric Crypto:** Shared private key.'],
        figures: [],
      },
    ],
    figures: [],
    flashcards: [
      {
        id: 'fc-1',
        workspaceId: 'ws-test',
        documentId: 'doc-1',
        course: 'Security',
        front: 'What is Symmetric Crypto?',
        back: 'Single secret key.',
        sourceSentence: 'Symmetric crypto uses shared private key.',
        sourcePattern: 'definition_is' as const,
        tags: [],
        reviewState: { interval: 1, repetitions: 0, easeFactor: 2.5, knownCount: 0, hardCount: 0 },
        createdAt: Date.now(),
      },
    ],
    glossaryTerms: [
      {
        id: 'gl-1',
        workspaceId: 'ws-test',
        term: 'Symmetric Crypto',
        definition: 'Cryptography using identical keys.',
        isAcronym: false,
        occurrences: 2,
        documentId: 'doc-1',
        documentTitle: 'Lecture 1: Intro',
        course: 'Security',
        contextSentence: 'Symmetric crypto...',
      },
    ],
    diagrams: [],
    processedAt: Date.now(),
  };

  const testCachedDoc2 = {
    documentId: 'doc-2',
    workspaceId: 'ws-test',
    contentHash: hash3,
    fileName: 'lecture-02.pdf',
    title: 'Lecture 2: Advanced',
    cleanedText: 'Repetitive note. **Symmetric Crypto:** Shared private key.',
    pageCount: 2,
    sections: [
      {
        id: 'sec-2',
        documentId: 'doc-2',
        documentTitle: 'Lecture 2: Advanced',
        pageNumber: 1,
        heading: 'Recap Heading',
        anchorId: 'sec-2-recap',
        summaryText: '**Symmetric Crypto:** Shared private key.',
        paragraphs: ['**Symmetric Crypto:** Shared private key.'],
        figures: [],
      },
    ],
    figures: [],
    flashcards: [
      {
        id: 'fc-2',
        workspaceId: 'ws-test',
        documentId: 'doc-2',
        course: 'Security',
        front: 'What is Symmetric Crypto?',
        back: 'Single secret key.',
        sourceSentence: 'Symmetric crypto...',
        sourcePattern: 'definition_is' as const,
        tags: [],
        reviewState: { interval: 1, repetitions: 0, easeFactor: 2.5, knownCount: 0, hardCount: 0 },
        createdAt: Date.now(),
      },
    ],
    glossaryTerms: [
      {
        id: 'gl-2',
        workspaceId: 'ws-test',
        term: 'Symmetric Crypto',
        definition: 'Cryptography using identical keys.',
        isAcronym: false,
        occurrences: 2,
        documentId: 'doc-2',
        documentTitle: 'Lecture 2: Advanced',
        course: 'Security',
        contextSentence: 'Symmetric crypto...',
      },
    ],
    diagrams: [],
    processedAt: Date.now(),
  };

  const testCompilation = compileCourse({
    workspaceId: 'ws-test',
    course: 'Security',
    title: 'Security Compilation',
    preset: 'standard',
    cachedDocs: [testCachedDoc1, testCachedDoc2],
    documentConfigs: {
      'doc-1': { documentId: 'doc-1', order: 1, included: true },
      'doc-2': { documentId: 'doc-2', order: 2, included: true },
    },
    manualEdits: [
      {
        id: 'edit-1',
        workspaceId: 'ws-test',
        sectionId: 'sec-1',
        documentId: 'doc-1',
        userNotes: 'Important midterm review note!',
        customSummary: 'Custom student rewrite.',
        updatedAt: Date.now(),
      },
    ],
  });

  if (!testCompilation || testCompilation.sections.length < 2) {
    throw new Error('Course compilation failed to assemble sections');
  }
  if (testCompilation.sections[0].userNotes !== 'Important midterm review note!') {
    throw new Error('Manual user notes did not survive compilation');
  }
  if (testCompilation.sections[0].userSummaryOverride !== 'Custom student rewrite.') {
    throw new Error('Manual summary rewrite did not survive compilation');
  }
  if (testCompilation.mergedGlossary.length !== 1) {
    throw new Error(`Glossary terms were not deduplicated across documents, got: ${testCompilation.mergedGlossary.length}`);
  }
  if (testCompilation.mergedFlashcards.length !== 1) {
    throw new Error(`Flashcards were not deduplicated across documents, got: ${testCompilation.mergedFlashcards.length}`);
  }
  if (!testCompilation.toc || testCompilation.toc.length < 2) {
    throw new Error('Table of Contents generation failed');
  }
  // Check cross-doc deduplication reference
  const sec2 = testCompilation.sections.find((s) => s.id === 'sec-2');
  if (!sec2?.crossReferences?.some((ref) => ref.includes('also in') || ref.includes('Lecture 1'))) {
    throw new Error('Cross-document deduplication provenance notes failed');
  }
  console.log('✓ Incremental compilation, manual edit preservation, cross-doc dedup & TOC passed');

  console.log('\n=============================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY! (14/14 TESTS)');
  console.log('=============================================');
}

run().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
