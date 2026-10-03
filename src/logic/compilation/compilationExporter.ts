import { CourseCompilation } from '../../types/compilation';

/**
 * Converts a figure Blob into a base64 Data URL for standalone document embedding
 */
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blob);
  });
}

/**
 * Generates a clean, standalone, printable HTML document for the entire course compilation.
 */
export async function generateCourseCompilationHtml(
  compilation: CourseCompilation
): Promise<string> {
  // Convert all inline figures to base64 Data URLs so the HTML is 100% self-contained
  const figureDataUrls = new Map<string, string>();
  for (const section of compilation.sections) {
    for (const fig of section.figures) {
      if (fig.blob && !figureDataUrls.has(fig.id)) {
        const dataUrl = await blobToDataUrl(fig.thumbnailBlob || fig.blob);
        figureDataUrls.set(fig.id, dataUrl);
      }
    }
  }

  const tocHtml = compilation.toc
    .map((item) => {
      const indentClass = item.level === 1 ? 'font-bold text-gray-900 mt-2' : 'ml-4 text-gray-600';
      return `<li class="${indentClass}"><a href="#${item.anchorId}" class="hover:underline">${item.heading}</a></li>`;
    })
    .join('\n');

  let currentDocTitle = '';
  const sectionsHtml = compilation.sections
    .map((sec) => {
      let docHeaderHtml = '';
      if (sec.documentTitle !== currentDocTitle) {
        currentDocTitle = sec.documentTitle;
        docHeaderHtml = `
          <div class="mt-10 mb-4 pb-2 border-b-2 border-indigo-600">
            <h2 class="text-xl font-bold text-indigo-900">${sec.documentTitle}</h2>
          </div>
        `;
      }

      const crossRefHtml =
        sec.crossReferences && sec.crossReferences.length > 0
          ? `<div class="mb-2 text-xs italic text-indigo-600 bg-indigo-50 p-1.5 rounded border border-indigo-100">
              Cross-reference: ${sec.crossReferences.join(', ')}
            </div>`
          : '';

      const paragraphsHtml = sec.paragraphs
        .map((p) => `<p class="mb-3 leading-relaxed text-gray-800">${p}</p>`)
        .join('\n');

      const figuresHtml = sec.figures
        .map((fig) => {
          const src = figureDataUrls.get(fig.id) || '';
          if (!src) return '';
          return `
            <figure class="my-4 p-2 bg-gray-50 border border-gray-200 rounded-lg text-center break-inside-avoid">
              <img src="${src}" alt="${fig.caption}" class="max-h-80 mx-auto rounded object-contain" />
              <figcaption class="mt-1 text-xs text-gray-500 font-medium">${fig.caption} (Page ${fig.pageNumber})</figcaption>
            </figure>
          `;
        })
        .join('\n');

      const notesHtml = sec.userNotes
        ? `<div class="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
            <strong>Study Note:</strong> ${sec.userNotes}
          </div>`
        : '';

      return `
        ${docHeaderHtml}
        <section id="${sec.anchorId}" class="mb-6 break-inside-avoid">
          <h3 class="text-base font-bold text-gray-900 mb-2">${sec.heading}</h3>
          ${crossRefHtml}
          ${paragraphsHtml}
          ${figuresHtml}
          ${notesHtml}
        </section>
      `;
    })
    .join('\n');

  const glossaryHtml =
    compilation.mergedGlossary.length > 0
      ? `
      <div class="mt-12 pt-6 border-t-2 border-gray-300 break-inside-avoid">
        <h2 class="text-xl font-bold text-gray-900 mb-4">Course Glossary & Definitions</h2>
        <dl class="space-y-3">
          ${compilation.mergedGlossary
            .map(
              (g) => `
            <div>
              <dt class="font-bold text-sm text-indigo-900">${g.term}</dt>
              <dd class="text-xs text-gray-700 ml-2 mt-0.5">${g.definition}</dd>
            </div>
          `
            )
            .join('')}
        </dl>
      </div>
    `
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${compilation.title}</title>
  <style>
    @media print {
      body { margin: 1cm; font-size: 11pt; color: #111; }
      .no-print { display: none !important; }
      .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
      a { text-decoration: none; color: inherit; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 850px; margin: 0 auto; padding: 2rem 1rem; color: #1f2937; }
    h1, h2, h3 { color: #111827; }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 1.5rem; text-align: right;">
    <button onclick="window.print()" style="padding: 0.5rem 1rem; background: #111827; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Print / Save as PDF</button>
  </div>

  <header style="margin-bottom: 2rem; border-bottom: 2px solid #e5e7eb; padding-bottom: 1rem;">
    <h1 style="font-size: 1.875rem; margin-bottom: 0.5rem;">${compilation.title}</h1>
    <p style="font-size: 0.875rem; color: #6b7280;">Course: ${compilation.course} | Last Updated: ${new Date(compilation.lastUpdated).toLocaleDateString()} | ${compilation.stats.includedDocuments} Document(s) | ~${compilation.stats.readingTimeMinutes} min read</p>
  </header>

  <nav style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 1rem 1.5rem; border-radius: 8px; margin-bottom: 2rem;">
    <h2 style="font-size: 1rem; margin-bottom: 0.75rem;">Table of Contents</h2>
    <ul style="list-style: none; padding-left: 0; margin: 0;">
      ${tocHtml}
    </ul>
  </nav>

  <main>
    ${sectionsHtml}
    ${glossaryHtml}
  </main>
</body>
</html>`;
}

/**
 * Generates markdown for the entire course compilation.
 */
export async function generateCourseCompilationMarkdown(
  compilation: CourseCompilation
): Promise<string> {
  const figureDataUrls = new Map<string, string>();
  for (const section of compilation.sections) {
    for (const fig of section.figures) {
      if (fig.blob && !figureDataUrls.has(fig.id)) {
        const dataUrl = await blobToDataUrl(fig.thumbnailBlob || fig.blob);
        figureDataUrls.set(fig.id, dataUrl);
      }
    }
  }

  let md = `# ${compilation.title}\n\n`;
  md += `**Course**: ${compilation.course}  \n`;
  md += `**Last Updated**: ${new Date(compilation.lastUpdated).toLocaleDateString()}  \n`;
  md += `**Materials Included**: ${compilation.stats.includedDocuments} document(s)  \n\n`;

  md += `## Table of Contents\n\n`;
  for (const item of compilation.toc) {
    const indent = item.level === 1 ? '- ' : '  - ';
    md += `${indent}[${item.heading}](#${item.anchorId})\n`;
  }
  md += `\n---\n\n`;

  let currentDocTitle = '';
  for (const sec of compilation.sections) {
    if (sec.documentTitle !== currentDocTitle) {
      currentDocTitle = sec.documentTitle;
      md += `\n# ${sec.documentTitle}\n\n`;
    }

    md += `### ${sec.heading}\n\n`;
    if (sec.crossReferences && sec.crossReferences.length > 0) {
      md += `*Cross-reference: ${sec.crossReferences.join(', ')}*\n\n`;
    }

    for (const p of sec.paragraphs) {
      md += `${p}\n\n`;
    }

    for (const fig of sec.figures) {
      const src = figureDataUrls.get(fig.id) || '';
      if (src) {
        md += `![${fig.caption}](${src})\n*${fig.caption} (Page ${fig.pageNumber})*\n\n`;
      }
    }

    if (sec.userNotes) {
      md += `> **Study Note**: ${sec.userNotes}\n\n`;
    }
  }

  if (compilation.mergedGlossary.length > 0) {
    md += `\n## Course Glossary\n\n`;
    for (const g of compilation.mergedGlossary) {
      md += `- **${g.term}**: ${g.definition}\n`;
    }
  }

  return md;
}

export async function openPrintableCourseCompilationWindow(
  compilation: CourseCompilation
): Promise<void> {
  const html = await generateCourseCompilationHtml(compilation);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export async function downloadCourseCompilationMarkdown(
  compilation: CourseCompilation
): Promise<void> {
  const md = await generateCourseCompilationMarkdown(compilation);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${compilation.course.replace(/\s+/g, '_')}_Compilation.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadCourseCompilationHtml(
  compilation: CourseCompilation
): Promise<void> {
  const html = await generateCourseCompilationHtml(compilation);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${compilation.course.replace(/\s+/g, '_')}_Compilation.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
