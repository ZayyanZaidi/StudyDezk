import { TableOfContentsItem, CompilationSection } from '../../types/compilation';

export function makeSafeAnchorId(prefix: string, name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${prefix}-${sanitized || 'section'}`;
}

export function generateTableOfContents(
  orderedDocs: Array<{ id: string; title: string; order: number }>,
  sectionsByDoc: Map<string, CompilationSection[]>
): TableOfContentsItem[] {
  const items: TableOfContentsItem[] = [];

  for (const doc of orderedDocs) {
    const docAnchor = makeSafeAnchorId('doc', `${doc.order}-${doc.title}`);

    // Level 1: Document Entry
    items.push({
      id: `toc-doc-${doc.id}`,
      documentId: doc.id,
      documentTitle: doc.title,
      heading: doc.title,
      anchorId: docAnchor,
      pageNumber: 1,
      level: 1,
    });

    // Level 2: Section Entries
    const docSections = sectionsByDoc.get(doc.id) || [];
    for (const sec of docSections) {
      items.push({
        id: `toc-sec-${sec.id}`,
        documentId: doc.id,
        documentTitle: doc.title,
        heading: sec.heading,
        anchorId: sec.anchorId,
        pageNumber: sec.pageNumber,
        level: 2,
      });
    }
  }

  return items;
}
