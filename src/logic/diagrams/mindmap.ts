import { DiagramSpec } from '../../types/diagram';

function cleanText(str: string): string {
  return str
    .replace(/[()[\]{}"'`:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates a Mermaid mindmap from document headings and bullet structures.
 */
export function generateMindmap(
  text: string,
  docId: string,
  title: string,
  workspaceId = 'default'
): DiagramSpec {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const cleanTitle = cleanText(title) || 'Study Topic';

  const sections: { title: string; items: string[] }[] = [];
  let currentSection: { title: string; items: string[] } | null = null;

  for (const line of lines) {
    // Detect potential heading (short line, ends with colon or all-caps, or starts with #)
    const isHeading =
      line.startsWith('#') ||
      (line.endsWith(':') && line.length < 50) ||
      (line === line.toUpperCase() && line.length > 3 && line.length < 45 && !/[.!?]/.test(line));

    const isBullet = /^([•\-\*–]|\d+[\.\)])\s+/.test(line);

    if (isHeading) {
      const headingText = cleanText(line.replace(/^[#:\s]+|[#:\s]+$/g, ''));
      if (headingText && headingText.length > 2) {
        currentSection = { title: headingText, items: [] };
        sections.push(currentSection);
      }
    } else if (isBullet && currentSection) {
      const itemText = cleanText(line.replace(/^([•\-\*–]|\d+[\.\)])\s+/, ''));
      if (itemText && itemText.length > 2 && currentSection.items.length < 6) {
        // limit to short phrase
        const shortItem = itemText.split(/[.,;]/)[0].slice(0, 35);
        if (shortItem) currentSection.items.push(shortItem);
      }
    }
  }

  // Fallback: If no clear headings found, create sections by sentence chunks
  if (sections.length === 0) {
    const sentences = lines
      .join(' ')
      .split(/(?<=[.?!])\s+/)
      .filter((s) => s.length > 15)
      .slice(0, 6);

    const fallbackSection = { title: 'Core Concepts', items: [] as string[] };
    for (const s of sentences) {
      const phrase = cleanText(s.split(/[.,;]/)[0]).slice(0, 35);
      if (phrase) fallbackSection.items.push(phrase);
    }
    sections.push(fallbackSection);
  }

  // Build Mermaid mindmap syntax
  const mermaidLines: string[] = ['mindmap', `  root(("${cleanTitle}"))`];

  for (const sec of sections.slice(0, 6)) {
    mermaidLines.push(`    ${sec.title}`);
    for (const item of sec.items.slice(0, 5)) {
      mermaidLines.push(`      ${item}`);
    }
  }

  const mermaidCode = mermaidLines.join('\n');

  return {
    id: `${docId}-diagram-mindmap`,
    workspaceId,
    documentId: docId,
    type: 'mindmap',
    title: `${title} - Mind Map`,
    mermaidCode,
    nodeCount: sections.reduce((acc, s) => acc + 1 + s.items.length, 1),
    createdAt: Date.now(),
  };
}
