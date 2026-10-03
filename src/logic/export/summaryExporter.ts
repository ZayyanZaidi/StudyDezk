import { SummaryResult, SummarySectionBlock } from '../../types/summarizer';
import { ExtractedFigure } from '../../types/figure';
import { blobToDataUrl } from '../../db/backup';

export interface AlignedFigurePlacement {
  figure: ExtractedFigure;
  figureDataUrl: string;
  matchedSentenceIndex?: number;
  matchedSectionId?: string;
}

export interface SummaryWithFiguresLayout {
  sectionsWithFigures: Array<{
    section: SummarySectionBlock;
    figuresAfterParagraphs: AlignedFigurePlacement[];
    sentenceFigures: Record<number, AlignedFigurePlacement[]>; // originalIndex -> figures
  }>;
  orphanFigures: AlignedFigurePlacement[];
}

/**
 * Normalizes strings for loose caption matching.
 */
function normalizeCaptionForMatch(caption: string): string[] {
  const patterns: string[] = [];

  // Match e.g. "Figure 1", "Figure 1.2", "Fig 1", "Table 2", "Diagram 3"
  const figNumMatch = caption.match(/(?:Figure|Fig\.?|Table|Diagram)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (figNumMatch) {
    patterns.push(figNumMatch[0].toLowerCase());
    patterns.push(`fig. ${figNumMatch[1]}`.toLowerCase());
    patterns.push(`fig ${figNumMatch[1]}`.toLowerCase());
    patterns.push(`figure ${figNumMatch[1]}`.toLowerCase());
  }

  // Also match full title without prefix (e.g. "Memory Hierarchy" if >= 8 chars and contains space)
  const cleanTitle = caption.replace(/^(?:Figure|Fig\.?|Table|Diagram)\s*[:0-9.\s–—\-]+/i, '').trim().toLowerCase();
  if (cleanTitle.length >= 8 && cleanTitle.includes(' ')) {
    patterns.push(cleanTitle);
  }

  return [...new Set(patterns)];
}

/**
 * Aligns extracted figures with summary sentences and sections.
 * 1. Directly beneath any sentence that references it by caption.
 * 2. After its source page/section paragraph if not referenced by a sentence.
 * 3. Orphan figures placed in page order at the end.
 */
export async function alignFiguresWithSummary(
  sections: SummarySectionBlock[],
  figures: ExtractedFigure[]
): Promise<SummaryWithFiguresLayout> {
  const activeFigures = figures.filter((f) => f.userStatus !== 'removed');

  // Convert all blobs to data URLs concurrently
  const figurePlacements: AlignedFigurePlacement[] = await Promise.all(
    activeFigures.map(async (fig) => {
      const dataUrl = await blobToDataUrl(fig.blob);
      return {
        figure: fig,
        figureDataUrl: dataUrl,
      };
    })
  );

  const placedFigureIds = new Set<string>();

  const sectionsWithFigures = sections.map((sec) => {
    const sentenceFigures: Record<number, AlignedFigurePlacement[]> = {};
    const figuresAfterParagraphs: AlignedFigurePlacement[] = [];

    // 1. Check for sentence-level matches
    for (const sScore of sec.sentenceScores) {
      const sentLower = sScore.sentence.toLowerCase();

      for (const item of figurePlacements) {
        if (placedFigureIds.has(item.figure.id)) continue;

        const patterns = normalizeCaptionForMatch(item.figure.caption);
        const matches = patterns.some((p) => sentLower.includes(p));

        if (matches) {
          placedFigureIds.add(item.figure.id);
          item.matchedSentenceIndex = sScore.originalIndex;
          item.matchedSectionId = sec.id;
          if (!sentenceFigures[sScore.originalIndex]) {
            sentenceFigures[sScore.originalIndex] = [];
          }
          sentenceFigures[sScore.originalIndex].push(item);
        }
      }
    }

    // 2. Check for section/page-level matches for remaining figures
    for (const item of figurePlacements) {
      if (placedFigureIds.has(item.figure.id)) continue;

      if (item.figure.pageNumber === sec.pageNumber) {
        placedFigureIds.add(item.figure.id);
        item.matchedSectionId = sec.id;
        figuresAfterParagraphs.push(item);
      }
    }

    return {
      section: sec,
      figuresAfterParagraphs,
      sentenceFigures,
    };
  });

  // 3. Figures with no related text: placed in page order
  const orphanFigures = figurePlacements
    .filter((f) => !placedFigureIds.has(f.figure.id))
    .sort((a, b) => {
      if (a.figure.pageNumber !== b.figure.pageNumber) {
        return a.figure.pageNumber - b.figure.pageNumber;
      }
      return (a.figure.figureIndex ?? 0) - (b.figure.figureIndex ?? 0);
    });

  return {
    sectionsWithFigures,
    orphanFigures,
  };
}

export interface ExportHtmlOptions {
  title: string;
  course?: string;
  documentTitle?: string;
  fileName?: string;
  date?: string;
}

/**
 * Generates a standalone, beautifully styled printable HTML page
 * with inline figures and print styles for instant PDF saving.
 */
export async function generatePrintableSummaryHtml(
  summary: SummaryResult,
  figures: ExtractedFigure[],
  options: ExportHtmlOptions
): Promise<string> {
  const sections = summary.structuredSections || [];
  const layout = await alignFiguresWithSummary(sections, figures);

  const title = options.title || 'Study Summary';
  const course = options.course || 'University Studies';
  const docTitle = options.documentTitle || options.fileName || 'Study Material';
  const dateStr = options.date || new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let contentHtml = '';

  for (const group of layout.sectionsWithFigures) {
    const sec = group.section;
    contentHtml += `<section class="summary-section">`;
    contentHtml += `<h2 class="section-title">${escapeHtml(sec.heading)} <span class="page-badge">Page ${sec.pageNumber}</span></h2>`;

    // Paragraphs
    for (let pIdx = 0; pIdx < sec.paragraphs.length; pIdx++) {
      const para = sec.paragraphs[pIdx];
      // Format bold markdown **[Heading]:** or **Term:** to <strong>
      const formattedPara = formatMarkdownLeadInToHtml(para);
      contentHtml += `<p class="summary-para">${formattedPara}</p>`;

      // Check if any sentence within this paragraph references a figure
      for (const sScore of sec.sentenceScores) {
        const sentFigures = group.sentenceFigures[sScore.originalIndex];
        if (sentFigures && sentFigures.length > 0 && para.includes(sScore.sentence)) {
          for (const figItem of sentFigures) {
            contentHtml += renderFigureHtml(figItem);
          }
        }
      }
    }

    // Figures placed after this section's paragraph
    if (group.figuresAfterParagraphs.length > 0) {
      contentHtml += `<div class="section-figures">`;
      for (const figItem of group.figuresAfterParagraphs) {
        contentHtml += renderFigureHtml(figItem);
      }
      contentHtml += `</div>`;
    }

    // Tables
    if (sec.tables && sec.tables.length > 0) {
      for (const table of sec.tables) {
        contentHtml += renderMarkdownTableToHtml(table);
      }
    }

    contentHtml += `</section>`;
  }

  // Orphan figures
  if (layout.orphanFigures.length > 0) {
    contentHtml += `<section class="summary-section orphan-section">`;
    contentHtml += `<h2 class="section-title">Additional Figures & Diagrams</h2>`;
    contentHtml += `<div class="orphan-figures-grid">`;
    for (const figItem of layout.orphanFigures) {
      contentHtml += renderFigureHtml(figItem);
    }
    contentHtml += `</div></section>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - StudyDezk Summary</title>
  <style>
    :root {
      --primary: #2563eb;
      --primary-dark: #1d4ed8;
      --text: #1e293b;
      --text-muted: #64748b;
      --bg: #ffffff;
      --surface: #f8fafc;
      --border: #e2e8f0;
      --badge-bg: #eff6ff;
      --badge-text: #1d4ed8;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.65;
      color: var(--text);
      background-color: var(--surface);
      padding: 2rem;
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
      background: var(--bg);
      padding: 3rem 3.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      border: 1px solid var(--border);
    }
    /* Action Bar */
    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background-color: var(--primary);
      color: #ffffff;
      border: none;
      padding: 0.65rem 1.25rem;
      font-size: 0.95rem;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
      transition: background 0.2s ease;
    }
    .action-btn:hover {
      background-color: var(--primary-dark);
    }
    /* Header */
    header {
      margin-bottom: 2.5rem;
    }
    .doc-meta {
      display: flex;
      gap: 1rem;
      align-items: center;
      margin-bottom: 0.75rem;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--primary);
      font-weight: 700;
    }
    h1 {
      font-size: 2.2rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.25;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 1.05rem;
    }
    /* Stats pill */
    .stats-bar {
      display: flex;
      gap: 1.5rem;
      background: var(--surface);
      padding: 0.85rem 1.25rem;
      border-radius: 8px;
      margin-top: 1.25rem;
      font-size: 0.9rem;
      color: var(--text-muted);
    }
    .stats-bar strong {
      color: var(--text);
    }
    /* Summary Sections */
    .summary-section {
      margin-bottom: 2.5rem;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 1rem;
      padding-bottom: 0.4rem;
      border-bottom: 2px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .page-badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.6rem;
      background: var(--badge-bg);
      color: var(--badge-text);
      border-radius: 9999px;
    }
    .summary-para {
      font-size: 1.02rem;
      margin-bottom: 1.15rem;
      text-align: justify;
    }
    .summary-para strong {
      color: #0f172a;
      font-weight: 700;
    }
    /* Inline Figures */
    .figure-wrapper {
      margin: 1.5rem 0;
      padding: 1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      text-align: center;
      page-break-inside: avoid;
    }
    .figure-img {
      max-width: 100%;
      height: auto;
      max-height: 480px;
      border-radius: 6px;
      display: block;
      margin: 0 auto;
      object-fit: contain;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
    .figure-caption {
      margin-top: 0.65rem;
      font-size: 0.85rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    .figure-caption strong {
      color: var(--text);
    }
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.25rem 0;
      font-size: 0.95rem;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 0.65rem 0.85rem;
      text-align: left;
    }
    th {
      background-color: var(--surface);
      font-weight: 600;
      color: #0f172a;
    }
    /* Footer */
    footer {
      margin-top: 3.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
      font-size: 0.85rem;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
    }
    /* Print Styles */
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
        color: #000000 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .container {
        max-width: 100% !important;
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
      }
      .action-bar {
        display: none !important;
      }
      .figure-wrapper {
        border: 1px solid #d1d5db !important;
        page-break-inside: avoid !important;
      }
      .summary-section {
        page-break-inside: avoid;
      }
      .page-badge {
        border: 1px solid #93c5fd !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="action-bar">
      <span>StudyDezk Summary &mdash; Offline Document Suite</span>
      <button class="action-btn" onclick="window.print()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        Print / Save to PDF
      </button>
    </div>

    <header>
      <div class="doc-meta">
        <span>${escapeHtml(course)}</span>
        <span>&bull;</span>
        <span>${escapeHtml(dateStr)}</span>
      </div>
      <h1>${escapeHtml(title)}</h1>
      <p class="subtitle">Source: ${escapeHtml(docTitle)}</p>

      <div class="stats-bar">
        <span>Words: <strong>${summary.wordCount}</strong></span>
        <span>Compression: <strong>${Math.round((1 - summary.compressionRatio) * 100)}% reduced</strong></span>
        <span>Figures: <strong>${figures.filter((f) => f.userStatus !== 'removed').length}</strong></span>
        <span>Reading Time: <strong>${summary.readingTimeMinutes} min</strong></span>
      </div>
    </header>

    <main>
      ${contentHtml}
    </main>

    <footer>
      <span>Generated by StudyDezk &mdash; 100% Client-Side Private</span>
      <span>${escapeHtml(dateStr)}</span>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Generates Github Flavored Markdown with inline data URL figure images.
 */
export async function generateMarkdownWithFigures(
  summary: SummaryResult,
  figures: ExtractedFigure[],
  options: ExportHtmlOptions
): Promise<string> {
  const sections = summary.structuredSections || [];
  const layout = await alignFiguresWithSummary(sections, figures);

  const title = options.title || 'Study Summary';
  const course = options.course || 'University Studies';
  const docTitle = options.documentTitle || options.fileName || 'Study Material';
  const dateStr = options.date || new Date().toLocaleDateString();

  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push(`**Course:** ${course} | **Source:** ${docTitle} | **Date:** ${dateStr}`);
  lines.push(`**Word Count:** ${summary.wordCount} words | **Figures:** ${figures.filter((f) => f.userStatus !== 'removed').length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const group of layout.sectionsWithFigures) {
    const sec = group.section;
    lines.push(`## ${sec.heading} *(Page ${sec.pageNumber})*`);
    lines.push('');

    for (const para of sec.paragraphs) {
      lines.push(para);
      lines.push('');

      // Sentence figures
      for (const sScore of sec.sentenceScores) {
        const sentFigures = group.sentenceFigures[sScore.originalIndex];
        if (sentFigures && sentFigures.length > 0 && para.includes(sScore.sentence)) {
          for (const figItem of sentFigures) {
            lines.push(`![${figItem.figure.caption}](${figItem.figureDataUrl})`);
            lines.push(`*${figItem.figure.caption} (Page ${figItem.figure.pageNumber})*`);
            lines.push('');
          }
        }
      }
    }

    // Figures after section
    for (const figItem of group.figuresAfterParagraphs) {
      lines.push(`![${figItem.figure.caption}](${figItem.figureDataUrl})`);
      lines.push(`*${figItem.figure.caption} (Page ${figItem.figure.pageNumber})*`);
      lines.push('');
    }

    // Tables
    if (sec.tables && sec.tables.length > 0) {
      for (const table of sec.tables) {
        lines.push(table);
        lines.push('');
      }
    }
  }

  if (layout.orphanFigures.length > 0) {
    lines.push('## Additional Figures & Diagrams');
    lines.push('');
    for (const figItem of layout.orphanFigures) {
      lines.push(`![${figItem.figure.caption}](${figItem.figureDataUrl})`);
      lines.push(`*${figItem.figure.caption} (Page ${figItem.figure.pageNumber})*`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Triggers a browser print dialog by opening a self-contained window with the HTML summary.
 */
export async function openPrintableSummaryWindow(
  summary: SummaryResult,
  figures: ExtractedFigure[],
  options: ExportHtmlOptions
): Promise<void> {
  const htmlContent = await generatePrintableSummaryHtml(summary, figures, options);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (!printWindow) {
    // Popup blocked: fallback to direct download
    downloadHtmlSummary(htmlContent, `${options.title || 'Summary'}.html`);
  }
}

/**
 * Triggers download of an HTML file.
 */
export function downloadHtmlSummary(html: string, fileName: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Triggers download of a Markdown file.
 */
export async function downloadMarkdownSummary(
  summary: SummaryResult,
  figures: ExtractedFigure[],
  options: ExportHtmlOptions
): Promise<void> {
  const md = await generateMarkdownWithFigures(summary, figures, options);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${options.title || 'Summary'}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMarkdownLeadInToHtml(para: string): string {
  // Replace **[Heading]:** or **Term:** with <strong>
  return para.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function renderFigureHtml(item: AlignedFigurePlacement): string {
  const caption = escapeHtml(item.figure.caption);
  return `<figure class="figure-wrapper">
    <img src="${item.figureDataUrl}" alt="${caption}" class="figure-img" loading="lazy" />
    <figcaption class="figure-caption">
      <strong>Figure:</strong> ${caption} <span class="page-badge">Page ${item.figure.pageNumber}</span>
    </figcaption>
  </figure>`;
}

function renderMarkdownTableToHtml(markdownTable: string): string {
  const lines = markdownTable.split('\n').filter((l) => l.includes('|'));
  if (lines.length < 2) return '';

  let html = '<table>';
  let isHeader = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^\|[-:\s|]+\|$/.test(line)) {
      isHeader = false;
      continue;
    }

    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());

    if (isHeader) {
      html += '<thead><tr>' + cells.map((c) => `<th>${escapeHtml(c)}</th>`).join('') + '</tr></thead><tbody>';
      isHeader = false;
    } else {
      html += '<tr>' + cells.map((c) => `<td>${escapeHtml(c)}</td>`).join('') + '</tr>';
    }
  }

  html += '</tbody></table>';
  return html;
}
