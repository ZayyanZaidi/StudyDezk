import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { DocumentPage } from '../../types/document';
import { workerManager } from '../../workers/workerManager';
import { assessPageVisualContent, renderAndExtractFigure } from './figures';
import { ExtractedFigure } from '../../types/figure';

// Configure pdfjs worker in Vite
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export interface PdfExtractionProgress {
  currentPage: number;
  totalPages: number;
  stage: 'reading' | 'extracting' | 'ocr';
  ocrActive: boolean;
  message: string;
}

export interface PdfExtractionResult {
  pages: DocumentPage[];
  fullText: string;
  totalPages: number;
  scannedPageCount: number;
  figures: ExtractedFigure[];
}

import { detectSlideTitleFromItems } from './slideTitleDetector';
export { detectSlideTitleFromItems };

/**
 * Extracts text and visual figures page-by-page from a PDF file.
 * Automatically identifies pages lacking a text layer and triggers OCR specifically for those pages.
 * Detects visual content (embedded images, vector diagrams, tables) via operator lists and captions,
 * renders flagged pages, and crops bounding boxes into WebP Blobs.
 * NO limit on the number of figures.
 */
export async function extractPdf(
  fileOrBuffer: File | ArrayBuffer,
  onProgress?: (progress: PdfExtractionProgress) => void,
  abortSignal?: AbortSignal,
  meta?: { documentId?: string; workspaceId?: string }
): Promise<PdfExtractionResult> {
  const data = fileOrBuffer instanceof File
    ? await fileOrBuffer.arrayBuffer()
    : fileOrBuffer;

  if (abortSignal?.aborted) {
    throw new DOMException('PDF extraction aborted by user.', 'AbortError');
  }

  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
  });

  if (abortSignal) {
    abortSignal.addEventListener('abort', () => {
      loadingTask.destroy();
    });
  }

  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;
  const pages: DocumentPage[] = [];
  const figures: ExtractedFigure[] = [];
  let scannedPageCount = 0;

  const docId = meta?.documentId || `doc-${Date.now()}`;
  const wsId = meta?.workspaceId || 'ws-default';

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (abortSignal?.aborted) {
      throw new DOMException('PDF extraction aborted by user.', 'AbortError');
    }

    if (onProgress) {
      onProgress({
        currentPage: pageNum,
        totalPages,
        stage: 'extracting',
        ocrActive: false,
        message: `Reading text layer from page ${pageNum} of ${totalPages}...`,
      });
    }

    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Extract lines preserving basic vertical ordering
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = textContent.items as Array<any>;
    let pageText = '';

    if (items.length > 0) {
      let lastY: number | null = null;
      const lineParts: string[] = [];

      for (const item of items) {
        if ('str' in item) {
          const currentY = item.transform ? Math.round(item.transform[5]) : null;
          if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 8) {
            lineParts.push('\n');
          } else if (lineParts.length > 0 && !lineParts[lineParts.length - 1].endsWith(' ') && !lineParts[lineParts.length - 1].endsWith('\n')) {
            lineParts.push(' ');
          }
          lineParts.push(item.str);
          lastY = currentY;
        }
      }
      pageText = lineParts.join('').trim();
    }

    // Detect slide title by font size and vertical position, ignoring dates and slide numbers
    const slideTitle = detectSlideTitleFromItems(items, pageNum, totalPages);

    const hasTextLayer = pageText.replace(/\s+/g, '').length >= 30;
    let ocrApplied = false;

    // If page has no valid text layer (e.g. scanned document or screenshot slide), run OCR
    if (!hasTextLayer) {
      scannedPageCount++;
      if (onProgress) {
        onProgress({
          currentPage: pageNum,
          totalPages,
          stage: 'ocr',
          ocrActive: true,
          message: `Page ${pageNum} has no text layer. Running offline OCR...`,
        });
      }

      // Render page to offscreen canvas for OCR
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (page.render({ canvasContext: ctx, viewport } as any).promise);

        const pageBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/png')
        );

        if (pageBlob) {
          try {
            const ocrText = await workerManager.runOcr(
              pageBlob,
              (ocrPct) => {
                if (onProgress) {
                  onProgress({
                    currentPage: pageNum,
                    totalPages,
                    stage: 'ocr',
                    ocrActive: true,
                    message: `OCR on page ${pageNum}: ${ocrPct}%`,
                  });
                }
              },
              abortSignal
            );
            pageText = ocrText.trim();
            ocrApplied = true;
          } catch (err) {
            console.warn(`OCR failed on page ${pageNum}:`, err);
          }
        }
      }
    }

    pages.push({
      pageNumber: pageNum,
      title: slideTitle,
      heading: slideTitle,
      text: pageText,
      hasTextLayer,
      ocrApplied,
      wordCount: pageText.split(/\s+/).filter(Boolean).length,
    });

    // Detect visual content & extract figure if present (NO limit on figure count)
    try {
      const visualAssessment = await assessPageVisualContent(page, pageText);
      if (visualAssessment.hasVisualContent) {
        if (onProgress) {
          onProgress({
            currentPage: pageNum,
            totalPages,
            stage: 'extracting',
            ocrActive: false,
            message: `Extracting ${visualAssessment.type} from page ${pageNum}...`,
          });
        }
        const extractedFig = await renderAndExtractFigure(
          page,
          visualAssessment,
          docId,
          wsId
        );
        figures.push(extractedFig);
      }
    } catch (figErr) {
      console.warn(`Figure extraction skipped on page ${pageNum}:`, figErr);
    }
  }

  const fullText = pages
    .map((p) => `--- Page ${p.pageNumber}: ${p.heading || p.title || `Page ${p.pageNumber}`} ---\n\n${p.text}`)
    .filter(Boolean)
    .join('\n\n');

  return {
    pages,
    fullText,
    totalPages,
    scannedPageCount,
    figures,
  };
}
