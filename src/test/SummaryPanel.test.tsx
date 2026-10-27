import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SummaryPanel } from '../components/summary/SummaryPanel';
import { useStudyStore } from '../store/useStudyStore';
import { createInitialSampleDocuments } from '../store/sampleData';


describe('SummaryPanel Component', () => {
  beforeEach(() => {
    const sampleDocs = createInitialSampleDocuments();
    useStudyStore.setState({
      documents: sampleDocs,
      activeDocumentId: sampleDocs[0].id,
    });
  });

  it('renders automatic summarization controls and multi-representation views', () => {
    render(<SummaryPanel />);
    expect(screen.getByText(/Living Study Guide/i)).toBeInTheDocument();
    expect(screen.getByText(/Representation View/i)).toBeInTheDocument();
    expect(screen.getByText('Structured')).toBeInTheDocument();
    expect(screen.getByText('Key Bullets')).toBeInTheDocument();
    expect(screen.getByText('Prose Narrative')).toBeInTheDocument();
    expect(screen.getByText(/Definitions & TL;DR/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/focus on/i)).toBeInTheDocument();
    expect(screen.getByText(/Regenerate Summary|Analyzing Document Sections/i)).toBeInTheDocument();
  });
});
