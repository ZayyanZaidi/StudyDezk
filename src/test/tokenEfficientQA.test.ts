import { describe, it, expect } from 'vitest';
import {
  estimateTokenCount,
  retrieveTokenEfficientContext,
  answerQuestionTokenEfficiently,
} from '../logic/chat/tokenEfficientQA';
import { StudyDocument } from '../types/document';

describe('Token-Efficient Retrieval & QA Engine', () => {
  const sampleDocs: StudyDocument[] = [
    {
      id: 'doc-cloud-1',
      workspaceId: 'ws-cloud',
      title: 'Cloud Virtualization & Elasticity',
      course: 'Cloud Computing',
      fileName: 'cloud_lecture_1.pdf',
      fileType: 'pdf',
      fileSize: 45000,
      totalPages: 2,
      pages: [
        {
          pageNumber: 1,
          text: 'Cloud computing relies on virtualization to pool hardware resources across tenants. Elasticity allows automatic scale out and scale in based on real-time traffic demand. Service level agreements (SLAs) formally guarantee availability percentage and latency targets.',
          hasTextLayer: true,
          ocrApplied: false,
          wordCount: 38,
        },
        {
          pageNumber: 2,
          text: 'Multi-tenancy introduces isolation risks between co-located virtual machines. Hypervisors enforce memory and CPU boundary protection to prevent unauthorized cross-tenant data access. Infrastructure as a Service (IaaS) gives users full control over operating systems and network topologies.',
          hasTextLayer: true,
          ocrApplied: false,
          wordCount: 39,
        },
      ],
      fullText: 'Cloud computing relies on virtualization to pool hardware resources across tenants. Elasticity allows automatic scale out and scale in based on real-time traffic demand. Service level agreements (SLAs) formally guarantee availability percentage and latency targets. Multi-tenancy introduces isolation risks between co-located virtual machines. Hypervisors enforce memory and CPU boundary protection to prevent unauthorized cross-tenant data access. Infrastructure as a Service (IaaS) gives users full control over operating systems and network topologies.',
      processedText: 'Cloud computing relies on virtualization to pool hardware resources across tenants. Elasticity allows automatic scale out and scale in based on real-time traffic demand. Service level agreements (SLAs) formally guarantee availability percentage and latency targets. Multi-tenancy introduces isolation risks between co-located virtual machines. Hypervisors enforce memory and CPU boundary protection to prevent unauthorized cross-tenant data access. Infrastructure as a Service (IaaS) gives users full control over operating systems and network topologies.',
      slideMergeApplied: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'doc-sec-1',
      workspaceId: 'ws-cloud',
      title: 'Security in Distributed Environments',
      course: 'Information Security',
      fileName: 'security_notes.png',
      fileType: 'image',
      fileSize: 32000,
      totalPages: 1,
      pages: [
        {
          pageNumber: 1,
          text: 'The CIA triad comprises Confidentiality, Integrity, and Availability. Cryptographic hash functions provide data integrity verification without transmitting plaintext. Buffer overflow vulnerabilities overwrite stack return addresses to hijack execution flow. Modern operating systems implement address space layout randomization (ASLR) and stack canaries to mitigate memory exploits.',
          hasTextLayer: false,
          ocrApplied: true,
          wordCount: 46,
        },
      ],
      fullText: 'The CIA triad comprises Confidentiality, Integrity, and Availability. Cryptographic hash functions provide data integrity verification without transmitting plaintext. Buffer overflow vulnerabilities overwrite stack return addresses to hijack execution flow. Modern operating systems implement address space layout randomization (ASLR) and stack canaries to mitigate memory exploits.',
      processedText: 'The CIA triad comprises Confidentiality, Integrity, and Availability. Cryptographic hash functions provide data integrity verification without transmitting plaintext. Buffer overflow vulnerabilities overwrite stack return addresses to hijack execution flow. Modern operating systems implement address space layout randomization (ASLR) and stack canaries to mitigate memory exploits.',
      slideMergeApplied: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  it('accurately estimates token count for English text and symbols', () => {
    expect(estimateTokenCount('')).toBe(0);
    expect(estimateTokenCount('   ')).toBe(0);

    const simple = 'Cloud computing is scalable.';
    const tokenCount = estimateTokenCount(simple);
    expect(tokenCount).toBeGreaterThanOrEqual(4);
    expect(tokenCount).toBeLessThan(12);

    const complex = 'Infrastructure as a Service (IaaS) guarantees 99.99% availability via SLA-backed multi-zone clustering.';
    const complexTokens = estimateTokenCount(complex);
    expect(complexTokens).toBeGreaterThan(15);
  });

  it('retrieves relevant passages across multiple documents with token savings', async () => {
    const { selectedSentences, tokenStats } = await retrieveTokenEfficientContext(
      'What is elasticity and SLA guarantee?',
      sampleDocs,
      'Cloud Architecture'
    );

    expect(selectedSentences.length).toBeGreaterThan(0);
    // Should prioritize the elasticity / SLA sentences
    const topText = selectedSentences[0].text;
    expect(topText.toLowerCase()).toMatch(/elasticity|sla|virtualization/);

    // Verify token stats
    expect(tokenStats.sourceTokens).toBeGreaterThan(tokenStats.contextTokens);
    expect(tokenStats.savingsPercent).toBeGreaterThanOrEqual(0);
  });

  it('answers queries grounded in document evidence for custom typed topics', async () => {
    const res = await answerQuestionTokenEfficiently(
      'How does ASLR and stack canaries protect against buffer overflow?',
      sampleDocs,
      'Memory Exploits & Defense'
    );

    expect(res.answer).toContain('Memory Exploits & Defense');
    expect(res.answer.toLowerCase()).toMatch(/buffer overflow|aslr|canaries/);
    expect(res.citations.length).toBeGreaterThan(0);

    const secCitation = res.citations.find((c) => c.documentTitle.includes('Security'));
    expect(secCitation).toBeDefined();
    expect(secCitation?.pageNumber).toBe(1);
    expect(res.tokenStats.savingsPercent).toBeGreaterThan(0);
  });

  it('handles cross-document queries across multiple PDFs and images simultaneously', async () => {
    const res = await answerQuestionTokenEfficiently(
      'Compare multi-tenancy isolation risks with confidentiality in the CIA triad',
      sampleDocs,
      'Cross-Course System Security'
    );

    expect(res.answer).toBeDefined();
    expect(res.citations.length).toBeGreaterThanOrEqual(2);

    // Should pull citations from both documents
    const titles = res.citations.map((c) => c.documentTitle);
    const hasCloud = titles.some((t) => t.includes('Cloud'));
    const hasSec = titles.some((t) => t.includes('Security'));

    expect(hasCloud).toBe(true);
    expect(hasSec).toBe(true);
  });
});
