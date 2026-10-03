import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { DocumentPage } from '../../types/document';
import { workerManager } from '../../workers/workerManager';

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
}

/**
 * Extracts text page-by-page from a PDF file.
 * Automatically identifies pages lacking a text layer and triggers OCR specifically for those pages.
 */
export async function extractPdf(
  fileOrBuffer: File | ArrayBuffer,
  onProgress?: (progress: PdfExtractionProgress) => void,
  abortSignal?: AbortSignal
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
  let scannedPageCount = 0;

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
      text: pageText,
      hasTextLayer,
      ocrApplied,
      wordCount: pageText.split(/\s+/).filter(Boolean).length,
    });
  }

  const fullText = pages.map((p) => p.text).filter(Boolean).join('\n\n');

  return {
    pages,
    fullText,
    totalPages,
    scannedPageCount,
  };
}
