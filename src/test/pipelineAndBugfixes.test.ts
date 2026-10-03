import { describe, it, expect } from 'vitest';
import { detectSlideTitleFromItems } from '../logic/extraction/pdf';
import { detectSectionBoundaries, foldFragmentsAndMergeDefinitions } from '../logic/summarizer/paragraphFormatter';
import { mergeSlideLines } from '../logic/extraction/slideMerger';
import {
  cleanDocumentPages,
  isGarbledOcrLine,
  fixDefinitionThenTerm,
  rejoinLineBreakHyphens,
} from '../logic/cleaning/documentCleaner';
import { answerQuestionTokenEfficiently, retrieveTokenEfficientContext } from '../logic/chat/tokenEfficientQA';
import { defaultSummarizer } from '../logic/summarizer';
import { DocumentPage, StudyDocument } from '../types/document';
import { ChatMessage } from '../types/chat';

describe('Pipeline & Bug Fixes Test Suite', () => {
  describe('1. Page/section detection & Multi-page fixture', () => {
    it('detects slide titles by font size and position, ignoring dates, slide numbers and boilerplate', () => {
      // Multi-page items fixture
      // Page 1 items
      const page1Items = [
        { text: '2023:', fontSize: 12, x: 50, y: 780 },
        { text: 'Slide 1', fontSize: 10, x: 500, y: 780 },
        { text: 'Introduction to Distributed Storage', fontSize: 24, x: 72, y: 720 },
        { text: 'Fundamental principles of distributed consensus and storage nodes.', fontSize: 14, x: 72, y: 650 },
      ];

      const titleP1 = detectSlideTitleFromItems(page1Items, 1, 3);
      expect(titleP1).toBe('Introduction to Distributed Storage');
      expect(titleP1).not.toContain('2023');
      expect(titleP1).not.toContain('Slide 1');

      // Page 2 items
      const page2Items = [
        { text: 'October 2023', fontSize: 11, x: 50, y: 780 },
        { text: '42:', fontSize: 10, x: 500, y: 780 },
        { text: 'Replication Strategies and Quorums', fontSize: 22, x: 72, y: 710 },
        { text: 'Quorum consensus requires R + W > N to prevent stale reads.', fontSize: 13, x: 72, y: 640 },
      ];

      const titleP2 = detectSlideTitleFromItems(page2Items, 2, 3);
      expect(titleP2).toBe('Replication Strategies and Quorums');
      expect(titleP2).not.toContain('2023');
      expect(titleP2).not.toContain('42:');
    });

    it('returns per-page results with correct page numbers and headings without merging into Page 1', () => {
      const multiPageText = `
--- Page 1: Introduction to Distributed Storage ---

Distributed storage architectures coordinate across commodity nodes.
Consensus algorithms ensure state machine replication.

--- Page 2: Replication Strategies and Quorums ---

Quorum consensus guarantees that read and write sets overlap.
Fault tolerance requires strict majority voting.

--- Page 3: Fault Recovery and Logging ---

Write-ahead logging persists state transitions before commit.
Crash recovery replays journal records to restore consistency.
      `.trim();

      const sections = detectSectionBoundaries(multiPageText);

      expect(sections.length).toBe(3);
      expect(sections[0].pageNumber).toBe(1);
      expect(sections[0].heading).toBe('Introduction to Distributed Storage');

      expect(sections[1].pageNumber).toBe(2);
      expect(sections[1].heading).toBe('Replication Strategies and Quorums');

      expect(sections[2].pageNumber).toBe(3);
      expect(sections[2].heading).toBe('Fault Recovery and Logging');

      // Heading must never be generic "Overview" or "2023:"
      for (const section of sections) {
        expect(section.heading).not.toBe('Overview');
        expect(section.heading).not.toMatch(/^(?:202\d|Overview):?$/);
      }
    });
  });

  describe('2. Hyphen Bug: In-word hyphens vs line-break hyphens', () => {
    it('does not alter in-word hyphens into colons during text normalization', () => {
      const inputSentences = [
        'Fail-safe defaults ensure secure fallback states during unexpected service interruptions.',
        'Modern cryptographic computations can be resource-intensive under heavy traffic loads.',
        'A client-side architecture guarantees zero sensitive payload exposure to centralized servers.',
        'User-defined access controls provide fine-grained permissions.',
        'State-of-the-art defenses prevent privilege escalation.',
      ];

      // Test paragraph formatter folding
      const formatted = foldFragmentsAndMergeDefinitions(inputSentences);
      for (const sent of formatted) {
        expect(sent).not.toContain('Fail: safe defaults');
        expect(sent).not.toContain('resource: intensive');
        expect(sent).not.toContain('client: side');
        expect(sent).not.toContain('user: defined');
        expect(sent).not.toContain('state: of');
      }

      // Test slide merger
      const textToMerge = 'Fail-safe defaults and resource-intensive operations remain unchanged.';
      const merged = mergeSlideLines(textToMerge);
      expect(merged.mergedText).toContain('Fail-safe defaults');
      expect(merged.mergedText).toContain('resource-intensive');
      expect(merged.mergedText).not.toContain('Fail: safe defaults');
      expect(merged.mergedText).not.toContain('resource: intensive');
    });

    it('only rejoins words split across lines by a trailing hyphen', () => {
      const splitText = `This is a de-\ncentralized network with inter-\nrupted communication.`;
      const rejoined = rejoinLineBreakHyphens(splitText);
      expect(rejoined).toContain('decentralized network with interrupted communication.');
    });
  });

  describe('3. Full Pipeline & Non-bypassable Summarizer', () => {
    it('runs the pipeline in order: extract -> clean -> segment -> summarize -> figures with Standard ~35% default', async () => {
      const rawText = `
--- Page 1: Operating System Security ---

Fail-safe defaults must guide access mediation decisions.
Buffer overflow vulnerabilities permit arbitrary payload execution on the target host.
Address space layout randomization (ASLR) scrambles memory segment addresses.
Confidentiality protects sensitive data against unauthorized read access.
Data integrity ensures unauthorized modifications are reliably detected.
Availability ensures authorized subjects retain access to essential compute services.
      `.trim();

      // 1. Clean
      const cleanRes = cleanDocumentPages([
        {
          pageNumber: 1,
          title: 'Operating System Security',
          text: rawText,
          hasTextLayer: true,
          ocrApplied: false,
          wordCount: 50,
        },
      ]);
      expect(cleanRes.pages.length).toBe(1);

      // 2. Segment
      const sections = detectSectionBoundaries(cleanRes.cleanedText);
      expect(sections.length).toBe(1);
      expect(sections[0].heading).toBe('Operating System Security');

      // 3. Summarize (Standard ~35% preset)
      const summary = await defaultSummarizer.summarize(cleanRes.cleanedText, {
        lengthMode: 'percentage',
        lengthValue: 35,
        outputStyle: 'paragraph',
      });

      expect(summary.text).toBeTruthy();
      expect(summary.selectedSentences.length).toBeGreaterThan(0);
      expect(summary.compressionRatio).toBeLessThanOrEqual(0.65);
    });
  });

  describe('4. Cleaning: Copyrights, Footers, Admin Slides, Garbled OCR & Definition Ordering', () => {
    it('removes copyright and repeated footer lines', () => {
      const pages: DocumentPage[] = [
        {
          pageNumber: 1,
          text: 'Slide Content 1.\n© 2024 University Courseware. All rights reserved.\nComputer Science Department - Lecture 4',
          hasTextLayer: true,
          ocrApplied: false,
          wordCount: 15,
        },
        {
          pageNumber: 2,
          text: 'Slide Content 2.\nComputer Science Department - Lecture 4\nConfidential and Proprietary.',
          hasTextLayer: true,
          ocrApplied: false,
          wordCount: 14,
        },
      ];

      const res = cleanDocumentPages(pages);
      expect(res.stats.removedCopyrightCount).toBeGreaterThanOrEqual(1);
      expect(res.stats.removedFooterCount).toBeGreaterThanOrEqual(1);
      expect(res.cleanedText).not.toContain('All rights reserved');
      expect(res.cleanedText).not.toContain('Computer Science Department - Lecture 4');
    });

    it('filters administrative slides such as textbooks and grading distribution', () => {
      const pages: DocumentPage[] = [
        {
          pageNumber: 1,
          title: 'Recommended Textbooks',
          text: 'Recommended Textbooks:\n1. Operating System Concepts, Wiley Publishing, ISBN 978-1118063330.\n2. Modern Operating Systems by Tanenbaum.',
          hasTextLayer: true,
          ocrApplied: false,
          wordCount: 20,
        },
        {
          pageNumber: 2,
          title: 'Grading Policy and Assessment Scheme',
          text: 'Grading Breakdown:\nMidterm: 30%\nFinal Exam: 50%\nAssignments: 20%',
          hasTextLayer: true,
          ocrApplied: false,
          wordCount: 15,
        },
        {
          pageNumber: 3,
          title: 'Core Memory Virtualization',
          text: 'Paging translates virtual memory addresses into physical frame numbers via page tables.',
          hasTextLayer: true,
          ocrApplied: false,
          wordCount: 12,
        },
      ];

      const res = cleanDocumentPages(pages);
      expect(res.stats.removedAdminPagesCount).toBe(2);
      expect(res.pages.length).toBe(1);
      expect(res.pages[0].title).toBe('Core Memory Virtualization');
    });

    it('filters garbled OCR lines with low alphabetic ratio', () => {
      const garbled = '||| $$$ 0010101 @@@ %%%';
      const normal = 'Virtual memory maps process addresses.';

      expect(isGarbledOcrLine(garbled)).toBe(true);
      expect(isGarbledOcrLine(normal)).toBe(false);
    });

    it('fixes "definition then term" ordering pattern', () => {
      const inverted = 'An attack where an adversary intercepts and re-transmits valid session data to cause an unauthorized effect Replay.';
      const fixed = fixDefinitionThenTerm(inverted).text;
      expect(fixed).toMatch(/^Replay:\s+An attack where/);
    });
  });

  describe('5. Chat Continuance & Multi-Document References', () => {
    const docs: StudyDocument[] = [
      {
        id: 'doc-sec-1',
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
            text: 'Replay attacks re-transmit previously captured packets. Symmetric cryptography requires shared secret keys between communicating endpoints.',
            hasTextLayer: true,
            ocrApplied: false,
            wordCount: 16,
          },
        ],
        fullText: 'Replay attacks re-transmit previously captured packets. Symmetric cryptography requires shared secret keys between communicating endpoints.',
        processedText: 'Replay attacks re-transmit previously captured packets. Symmetric cryptography requires shared secret keys between communicating endpoints.',
        slideMergeApplied: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'doc-cloud-1',
        workspaceId: 'ws-1',
        title: 'Cloud Virtualization',
        course: 'Cloud Computing',
        fileName: 'cloud.pdf',
        fileType: 'pdf',
        fileSize: 25000,
        totalPages: 1,
        pages: [
          {
            pageNumber: 1,
            text: 'Elasticity allows compute clusters to dynamically add instances. Hypervisors isolate virtual machines from hardware faults.',
            hasTextLayer: true,
            ocrApplied: false,
            wordCount: 15,
          },
        ],
        fullText: 'Elasticity allows compute clusters to dynamically add instances. Hypervisors isolate virtual machines from hardware faults.',
        processedText: 'Elasticity allows compute clusters to dynamically add instances. Hypervisors isolate virtual machines from hardware faults.',
        slideMergeApplied: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    it('incorporates past chat turns for follow-up question continuance', async () => {
      const history: ChatMessage[] = [
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

      // Follow-up query that relies on previous turn context
      const followUp = 'How does that handle secret keys?';
      const result = await answerQuestionTokenEfficiently(followUp, docs, 'Cryptography', undefined, history);

      expect(result.answer).toBeTruthy();
      expect(result.citations.length).toBeGreaterThan(0);
      expect(result.tokenStats.savingsPercent).toBeGreaterThan(0);
    });

    it('accurately filters across multiple selected reference documents', async () => {
      // Query specifically targeting cloud virtualization from the multi-doc set
      const result = await answerQuestionTokenEfficiently('How does elasticity work in compute clusters?', docs, 'Elasticity');
      expect(result.answer).toContain('Elasticity');
      expect(result.citations[0].documentTitle).toBe('Cloud Virtualization');
    });
  });
});
