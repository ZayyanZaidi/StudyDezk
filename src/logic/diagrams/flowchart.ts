import { DiagramSpec } from '../../types/diagram';

function sanitizeNode(text: string): string {
  return text
    .replace(/[()[\]{}"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 45);
}

/**
 * Generates a Mermaid flowchart TD from sequential/numbered step lists or process indicators.
 */
export function generateFlowchart(
  text: string,
  docId: string,
  title: string,
  workspaceId = 'default'
): DiagramSpec {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const steps: string[] = [];

  // 1. Look for numbered lists: e.g. "1. Step description" or "Step 1: Description"
  const stepRegex = /^(\d+[\.\)]|step\s+\d+|phase\s+\d+|stage\s+\d+)[:\s-]*(.*)/i;

  for (const line of lines) {
    const match = stepRegex.exec(line);
    if (match) {
      const stepText = sanitizeNode(match[2] || line);
      if (stepText.length >= 3) {
        steps.push(stepText);
      }
    }
  }

  // 2. If no numbered steps found, search for chronological marker sentences
  if (steps.length < 2) {
    const sentences = text.split(/(?<=[.?!])\s+/);
    const chronologicalMarkers = /\b(first|second|third|then|next|subsequently|finally|afterwards|in the end)\b/i;

    for (const s of sentences) {
      if (chronologicalMarkers.test(s)) {
        const cleaned = sanitizeNode(s.split(/[;,]/)[0]);
        if (cleaned.length > 5 && !steps.includes(cleaned)) {
          steps.push(cleaned);
        }
      }
    }
  }

  // Fallback: Use key conceptual sequence from sentences
  if (steps.length < 2) {
    const sentences = text
      .split(/(?<=[.?!])\s+/)
      .filter((s) => s.length > 20)
      .slice(0, 4);

    for (let i = 0; i < sentences.length; i++) {
      steps.push(sanitizeNode(sentences[i].split(/[;,]/)[0]));
    }
  }

  // Build Mermaid flowchart TD
  const mermaidLines: string[] = ['flowchart TD'];

  for (let i = 0; i < steps.length; i++) {
    const nodeId = `S${i + 1}`;
    const label = `${i + 1}. ${steps[i]}`;
    mermaidLines.push(`  ${nodeId}["${label}"]`);
  }

  for (let i = 0; i < steps.length - 1; i++) {
    mermaidLines.push(`  S${i + 1} --> S${i + 2}`);
  }

  const mermaidCode = mermaidLines.join('\n');

  return {
    id: `${docId}-diagram-flowchart`,
    workspaceId,
    documentId: docId,
    type: 'flowchart',
    title: `${title} - Process Flowchart`,
    mermaidCode,
    nodeCount: steps.length,
    createdAt: Date.now(),
  };
}
