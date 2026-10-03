import { describe, it, expect } from 'vitest';
import {
  formatParagraphSummary,
  detectSectionBoundaries,
  foldFragmentsAndMergeDefinitions,
} from '../logic/summarizer/paragraphFormatter';
import {
  alignFiguresWithSummary,
  generatePrintableSummaryHtml,
  generateMarkdownWithFigures,
} from '../logic/export/summaryExporter';
import { SentenceScore, SummaryResult } from '../types/summarizer';
import { ExtractedFigure } from '../types/figure';

describe('Paragraph Formatter & Summarizer (Item 18)', () => {
  it('detects section and slide boundaries with headings', () => {
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
    expect(boundaries.length).toBeGreaterThanOrEqual(2);
    expect(boundaries[0].heading).toContain('Introduction to Distributed Systems');
    expect(boundaries[1].heading).toContain('Slide 2');
  });

  it('merges definitions with their terms', () => {
    const rawSentences = [
      'Gradient Descent:',
      'is an optimization algorithm used to minimize the loss function.',
      'Learning Rate - Determines the step size at each iteration.',
      'Regularization: A technique to prevent overfitting in models.',
    ];

    const merged = foldFragmentsAndMergeDefinitions(rawSentences);
    expect(merged[0]).toContain('**Gradient Descent:** is an optimization algorithm');
    expect(merged[1]).toContain('**Learning Rate:** Determines the step size');
    expect(merged[2]).toContain('**Regularization:** A technique to prevent overfitting');
  });

  it('folds sentence fragments into neighboring sentences', () => {
    const rawSentences = [
      'Microservices improve modularity across independent engineering teams.',
      'which allows services to scale and deploy separately.',
      'Database replication ensures fault tolerance.',
      'including active-passive and multi-master clustering modes.',
    ];

    const folded = foldFragmentsAndMergeDefinitions(rawSentences);
    expect(folded.length).toBe(2);
    expect(folded[0]).toContain('Microservices improve modularity');
    expect(folded[0]).toContain(', which allows services to scale');
    expect(folded[1]).toContain('Database replication ensures fault tolerance');
    expect(folded[1]).toContain(', including active-passive');
  });

  it('produces flowing paragraphs with bold heading lead-in and never one sentence per line', () => {
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

    const result = formatParagraphSummary(sentences, sourceText, {
      paragraphLength: 'long',
      outputStyle: 'paragraph',
    });

    expect(result.sections.length).toBeGreaterThanOrEqual(1);
    const sec = result.sections[0];
    expect(sec.paragraphs.length).toBe(1);
    // Bold lead-in
    expect(sec.paragraphs[0]).toMatch(/^\*\*\[.+\]:\*\*/);
    // Flows across multiple sentences without line breaks
    expect(sec.paragraphs[0]).toContain('The primary database maintains write-ahead transaction logs.');
    expect(sec.paragraphs[0]).toContain('Secondary replicas synchronize via asynchronous streaming replication.');
  });

  it('respects paragraph length settings (short vs medium vs long)', () => {
    const sourceText = `
# Section 1
Sentence one describes system initialization. Sentence two configures memory pools.
Sentence three starts worker threads. Sentence four begins socket listener.
Sentence five connects database pool. Sentence six warms the cache.
    `;

    const sentences: SentenceScore[] = [
      { sentence: 'Sentence one describes system initialization.', originalIndex: 0, textRankScore: 1, requirementScore: 0, finalScore: 1 },
      { sentence: 'Sentence two configures memory pools.', originalIndex: 1, textRankScore: 1, requirementScore: 0, finalScore: 1 },
      { sentence: 'Sentence three starts worker threads.', originalIndex: 2, textRankScore: 1, requirementScore: 0, finalScore: 1 },
      { sentence: 'Sentence four begins socket listener.', originalIndex: 3, textRankScore: 1, requirementScore: 0, finalScore: 1 },
      { sentence: 'Sentence five connects database pool.', originalIndex: 4, textRankScore: 1, requirementScore: 0, finalScore: 1 },
      { sentence: 'Sentence six warms the cache.', originalIndex: 5, textRankScore: 1, requirementScore: 0, finalScore: 1 },
    ];

    const shortResult = formatParagraphSummary(sentences, sourceText, {
      paragraphLength: 'short',
      outputStyle: 'paragraph',
    });

    const longResult = formatParagraphSummary(sentences, sourceText, {
      paragraphLength: 'long',
      outputStyle: 'paragraph',
    });

    // Short mode should create more paragraphs with fewer sentences
    expect(shortResult.sections[0].paragraphs.length).toBeGreaterThan(longResult.sections[0].paragraphs.length);
  });

  it('formats output as bullet style when toggle is selected', () => {
    const sourceText = `
# Core Principles
Principle A guarantees atomicity.
Principle B ensures consistency.
    `.trim();

    const sentences: SentenceScore[] = [
      { sentence: 'Principle A guarantees atomicity.', originalIndex: 0, textRankScore: 1, requirementScore: 0, finalScore: 1 },
      { sentence: 'Principle B ensures consistency.', originalIndex: 1, textRankScore: 1, requirementScore: 0, finalScore: 1 },
    ];

    const result = formatParagraphSummary(sentences, sourceText, {
      outputStyle: 'bullets',
    });

    expect(result.bullets.length).toBe(2);
    expect(result.bullets[0]).toBe('Principle A guarantees atomicity.');
    expect(result.fullFormattedText).toContain('### Core Principles');
    expect(result.fullFormattedText).toContain('• Principle A guarantees atomicity.');
  });
});

describe('Figure Inline Placement & Export (Items 16 & 17)', () => {
  // Helper to make mock blob
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

  it('aligns figures: directly under referencing sentence, after section paragraph, and orphans in page order', async () => {
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

    // fig-1 is referenced by sentence in sec-0
    const sec0Figures = layout.sectionsWithFigures[0].sentenceFigures[0];
    expect(sec0Figures).toBeDefined();
    expect(sec0Figures[0].figure.id).toBe('fig-1');

    // fig-2 is from page 2, not explicitly mentioned in sentence, so it goes after sec-1 paragraph
    const sec1AfterPara = layout.sectionsWithFigures[1].figuresAfterParagraphs;
    expect(sec1AfterPara.length).toBe(1);
    expect(sec1AfterPara[0].figure.id).toBe('fig-2');

    // fig-orphan is on page 5 which has no corresponding summary section, so it is an orphan placed in page order
    expect(layout.orphanFigures.length).toBe(1);
    expect(layout.orphanFigures[0].figure.id).toBe('fig-orphan');
    expect(layout.orphanFigures[0].figure.pageNumber).toBe(5);
  });

  it('generates printable HTML with inline figures and print CSS', async () => {
    const summary: SummaryResult = {
      text: 'Summary text',
      bullets: ['Bullet 1'],
      selectedSentences: [],
      allSentences: [],
      originalSentenceCount: 10,
      summarySentenceCount: 2,
      compressionRatio: 0.2,
      wordCount: 150,
      readingTimeMinutes: 1,
      structuredSections: [
        {
          id: 'sec-0',
          heading: 'System Overview',
          pageNumber: 1,
          paragraphs: ['**[System Overview]:** See Figure 1.1 for component relations.'],
          sentenceScores: [
            {
              sentence: 'See Figure 1.1 for component relations.',
              originalIndex: 0,
              textRankScore: 1,
              requirementScore: 0,
              finalScore: 1,
            },
          ],
          rawText: 'See Figure 1.1 for component relations.',
        },
      ],
    };

    const html = await generatePrintableSummaryHtml(summary, mockFigures, {
      title: 'Distributed Systems Exam Prep',
      course: 'Cloud Computing',
      documentTitle: 'Lecture 4 - Distributed Systems',
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('@media print');
    expect(html).toContain('window.print()');
    expect(html).toContain('Distributed Systems Exam Prep');
    expect(html).toContain('Figure 1.1: System Architecture');
    expect(html).toContain('<img src="data:image/webp;base64,');
  });

  it('generates markdown with embedded figure images', async () => {
    const summary: SummaryResult = {
      text: 'Summary text',
      bullets: ['Bullet 1'],
      selectedSentences: [],
      allSentences: [],
      originalSentenceCount: 10,
      summarySentenceCount: 2,
      compressionRatio: 0.2,
      wordCount: 150,
      readingTimeMinutes: 1,
      structuredSections: [
        {
          id: 'sec-0',
          heading: 'System Overview',
          pageNumber: 1,
          paragraphs: ['**[System Overview]:** See Figure 1.1 for component relations.'],
          sentenceScores: [
            {
              sentence: 'See Figure 1.1 for component relations.',
              originalIndex: 0,
              textRankScore: 1,
              requirementScore: 0,
              finalScore: 1,
            },
          ],
          rawText: 'See Figure 1.1 for component relations.',
        },
      ],
    };

    const md = await generateMarkdownWithFigures(summary, mockFigures, {
      title: 'Distributed Systems Exam Prep',
      course: 'Cloud Computing',
    });

    expect(md).toContain('# Distributed Systems Exam Prep');
    expect(md).toContain('## System Overview *(Page 1)*');
    expect(md).toContain('![Figure 1.1: System Architecture](data:image/webp;base64,');
  });
});
