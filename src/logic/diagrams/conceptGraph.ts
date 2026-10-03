import { DiagramSpec } from '../../types/diagram';
import { extractAcronyms } from '../extraction/acronyms';
import { splitSentences } from '../nlp/segmenter';
import { extractTopTfIdfTerms } from '../nlp/tfidf';

function cleanId(str: string): string {
  const safe = str.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  return `node_${safe || 'item'}`;
}

function cleanLabel(str: string): string {
  return str.replace(/[()[\]{}"'`#|\\/]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 30) || 'Concept';
}

/**
 * Generates a Mermaid concept graph (graph LR) from co-occurring terms in sentences.
 */
export function generateConceptGraph(
  text: string,
  docId: string,
  title: string,
  workspaceId = 'default'
): DiagramSpec {
  const sentences = splitSentences(text);

  // 1. Gather candidate entities: acronyms + top TF-IDF keywords
  const acronyms = extractAcronyms(text).map((a) => a.acronym);
  const tfidfTerms = extractTopTfIdfTerms(text, undefined, 12).map((t) =>
    t.term.charAt(0).toUpperCase() + t.term.slice(1)
  );

  const candidateSet = new Set<string>();
  for (const ac of acronyms.slice(0, 6)) candidateSet.add(ac);
  for (const kw of tfidfTerms) {
    if (candidateSet.size < 10) candidateSet.add(kw);
  }

  const entities = Array.from(candidateSet);
  if (entities.length < 2) {
    entities.push('Key Principles', 'Implementation', 'Evaluation');
  }

  // 2. Co-occurrence matrix
  const edges: { from: string; to: string; weight: number }[] = [];
  const edgeKey = (a: string, b: string) => (a < b ? `${a}\u001F${b}` : `${b}\u001F${a}`);
  const weights = new Map<string, number>();

  for (const sentence of sentences) {
    const presentInSentence = entities.filter((e) =>
      new RegExp(`\\b${e.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(sentence)
    );

    for (let i = 0; i < presentInSentence.length; i++) {
      for (let j = i + 1; j < presentInSentence.length; j++) {
        const k = edgeKey(presentInSentence[i], presentInSentence[j]);
        weights.set(k, (weights.get(k) || 0) + 1);
      }
    }
  }

  for (const [key, count] of weights.entries()) {
    const [from, to] = key.split('\u001F');
    if (from && to) {
      edges.push({ from, to, weight: count });
    }
  }

  // If sparse, connect to central topic or sequentially
  if (edges.length === 0) {
    const root = cleanLabel(title.split(/[-:]/)[0]) || 'Core Topic';
    for (let i = 0; i < entities.length; i++) {
      edges.push({ from: root, to: entities[i], weight: 1 });
    }
  }

  // Build Mermaid graph LR with valid edge syntax
  const mermaidLines: string[] = ['graph LR'];
  const nodesAdded = new Set<string>();

  for (const edge of edges.slice(0, 15)) {
    const fromId = cleanId(edge.from);
    const toId = cleanId(edge.to);
    if (fromId === toId) continue;

    const fromLabel = cleanLabel(edge.from);
    const toLabel = cleanLabel(edge.to);

    if (!nodesAdded.has(fromId)) {
      mermaidLines.push(`  ${fromId}["${fromLabel}"]`);
      nodesAdded.add(fromId);
    }
    if (!nodesAdded.has(toId)) {
      mermaidLines.push(`  ${toId}["${toLabel}"]`);
      nodesAdded.add(toId);
    }

    if (edge.weight > 1) {
      mermaidLines.push(`  ${fromId} ---|"co-occurs"| ${toId}`);
    } else {
      mermaidLines.push(`  ${fromId} --- ${toId}`);
    }
  }

  const mermaidCode = mermaidLines.join('\n');

  return {
    id: `${docId}-diagram-concept`,
    workspaceId,
    documentId: docId,
    type: 'concept_graph',
    title: `${title} - Concept Graph`,
    mermaidCode,
    nodeCount: nodesAdded.size,
    createdAt: Date.now(),
  };
}
