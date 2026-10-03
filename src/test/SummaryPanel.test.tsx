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

  it('renders automatic summarization controls and action buttons without manual limit sliders', () => {
    render(<SummaryPanel />);
    expect(screen.getByText(/Key Points & Salience/i)).toBeInTheDocument();
    expect(screen.getByText(/Auto-Covering All Sections/i)).toBeInTheDocument();
    expect(screen.getByText('Output Format')).toBeInTheDocument();
    expect(screen.getByText('Key Bullets')).toBeInTheDocument();
    expect(screen.getByText('Paragraph')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. focus on attack types/i)).toBeInTheDocument();
    expect(screen.getByText(/Synthesize Key Points|Analyzing All Sections/i)).toBeInTheDocument();
  });
});
