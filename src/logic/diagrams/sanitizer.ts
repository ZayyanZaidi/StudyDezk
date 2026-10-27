/**
 * Mermaid Syntax Sanitizer and Auto-Repair Utility
 * Fixes lexical errors like '== co-occurs ==', unquoted labels, unescaped characters,
 * and handles provider/model generated edge cases.
 */

export function sanitizeMermaidCode(rawCode: string): string {
  if (!rawCode || typeof rawCode !== 'string') return 'graph TD\n  empty["No diagram data"]';

  let code = rawCode.trim();

  // 1. Remove markdown code fence blocks if present
  code = code.replace(/^```(?:mermaid)?\s*/i, '').replace(/```\s*$/i, '').trim();

  // 2. Ensure diagram header exists if completely missing
  const validHeaders = ['graph', 'flowchart', 'mindmap', 'timeline', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'gitGraph'];
  const firstWord = code.split(/[\s\n\r]+/)[0];
  if (!validHeaders.includes(firstWord)) {
    code = `graph TD\n${code}`;
  }

  // 3. Line by line repairs
  const lines = code.split('\n');
  const sanitizedLines: string[] = [];

  for (let line of lines) {
    let l = line.trimEnd();

    // Fix invalid '== label ==' or '== label --' or '-- label --'
    // Mermaid valid forms: '---|label|', '-->|label|', '==>|label|' or '-- "label" ---'
    l = l.replace(/==\s*([a-zA-Z0-9_\s\-]+?)\s*==/g, '---|"$1"|');
    l = l.replace(/==\s*([a-zA-Z0-9_\s\-]+?)\s*--/g, '---|"$1"|');
    l = l.replace(/--\s*([a-zA-Z0-9_\s\-]+?)\s*--/g, '---|"$1"|');

    // Fix raw unbracketed multi-word node references with '---' or '-->'
    // e.g. "ITS == co-occurs == Security ITS" -> "node_its["ITS"] ---|"co-occurs"| node_security_its["Security ITS"]"
    const edgePattern = /^(\s*)([A-Za-z0-9_\s]+?)\s*(---|-->|==>|--|==|---\|"[^"]*"\|)\s*([A-Za-z0-9_\s]+?)(\s*)$/;
    const match = l.match(edgePattern);
    if (match && !l.includes('[') && !l.includes('(') && !l.includes('{') && !l.startsWith('graph') && !l.startsWith('flowchart')) {
      const indent = match[1] || '  ';
      const fromRaw = match[2].trim();
      const rawConnector = match[3].trim();
      const toRaw = match[4].trim();

      const connector = rawConnector.startsWith('==') || rawConnector.startsWith('--') ? '-->' : rawConnector;

      const fromId = `n_${fromRaw.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
      const toId = `n_${toRaw.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;

      l = `${indent}${fromId}["${fromRaw.replace(/["\\]/g, '')}"] ${connector} ${toId}["${toRaw.replace(/["\\]/g, '')}"]`;
    }

    sanitizedLines.push(l);
  }

  return sanitizedLines.join('\n');
}

/**
 * Fallback repair if Mermaid throws a Lexical or Syntax error
 */
export function buildEmergencyFallbackMermaid(topic: string, errorMessage?: string): string {
  const safeTopic = (topic || 'Core Concept').replace(/[^\w\s-]/g, '').trim().slice(0, 40);
  const safeErr = (errorMessage || 'Syntax repaired')
    .replace(/[^\w\s-]/g, '')
    .slice(0, 50);

  return `graph TD
  root["${safeTopic}"]
  info["Auto-Repaired View: ${safeErr}"]
  root --- info`;
}
