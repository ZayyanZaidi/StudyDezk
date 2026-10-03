import { describe, it, expect } from 'vitest';
import { generateMindmap } from '../logic/diagrams/mindmap';
import { generateFlowchart } from '../logic/diagrams/flowchart';
import { generateConceptGraph } from '../logic/diagrams/conceptGraph';

describe('Mermaid Diagram Generators', () => {
  it('should generate valid mindmap syntax from headings and bullets', () => {
    const text = `Cloud Computing Service Models:
• Infrastructure as a Service
• Platform as a Service
• Software as a Service`;

    const spec = generateMindmap(text, 'doc1', 'Cloud Computing');
    expect(spec.type).toBe('mindmap');
    expect(spec.mermaidCode).toContain('mindmap');
    expect(spec.mermaidCode).toContain('root');
    expect(spec.mermaidCode).toContain('Infrastructure as a Service');
  });

  it('should generate valid flowchart syntax from numbered steps', () => {
    const text = `1. Write failing unit test
2. Implement minimal production code
3. Run automated tests
4. Refactor design`;

    const spec = generateFlowchart(text, 'doc2', 'TDD Cycle');
    expect(spec.type).toBe('flowchart');
    expect(spec.mermaidCode).toContain('flowchart TD');
    expect(spec.mermaidCode).toContain('S1["1. Write failing unit test"]');
    expect(spec.mermaidCode).toContain('S1 --> S2');
  });

  it('should generate concept graph from co-occurring terms', () => {
    const text = `The CIA triad consists of Confidentiality, Integrity, and Availability.
Confidentiality protects data from unauthorized access using AES encryption.
Integrity prevents unauthorized modification.`;

    const spec = generateConceptGraph(text, 'doc3', 'Information Security');
    expect(spec.type).toBe('concept_graph');
    expect(spec.mermaidCode).toContain('graph LR');
    expect(spec.nodeCount).toBeGreaterThan(0);
  });
});
