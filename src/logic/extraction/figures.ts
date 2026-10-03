/**
 * PDF Visual Content & Figure Extraction Engine
 * 
 * Inspects PDF pages using pdf.js operator lists (embedded images, vector paths)
 * and caption patterns ("Figure N.N", "Table N.N", "Diagram N").
 * Renders flagged pages to canvas, crops bounding box where possible,
 * compresses to WebP Blobs, and manages thumbnails and re-cropping.
 * NO limit on number of figures.
 */

import * as pdfjsLib from 'pdfjs-dist';
import { ExtractedFigure, CropBox, FigureType } from '../../types/figure';

export interface PageVisualAssessment {
  hasVisualContent: boolean;
  caption: string;
  type: FigureType;
  imageCount: number;
  pathCount: number;
}

/**
 * Common caption regex patterns in textbooks and lecture slides
 */
const CAPTION_PATTERNS = [
  /(?:Figure|Fig\.)\s*(\d+[\d\w.-]*[:\s–—\-]+[^\n.]+)/i,
  /Table\s*(\d+[\d\w.-]*[:\s–—\-]+[^\n.]+)/i,
  /Diagram\s*(\d+[\d\w.-]*[:\s–—\-]+[^\n.]+)/i,
  /(?:Figure|Fig\.)\s*(\d+[\d\w.-]*)/i,
  /Table\s*(\d+[\d\w.-]*)/i,
  /(?:Architecture|Workflow|Pipeline|State Machine|Topology|Lifecycle|Hierarchy|Model Overview)\b[^\n.]*/i,
];

/**
 * Inspects a PDF page's operator list and text content to detect visual figures,
 * diagrams, charts, and tables.
 */
export async function assessPageVisualContent(
  page: pdfjsLib.PDFPageProxy,
  pageText: string
): Promise<PageVisualAssessment> {
  let imageCount = 0;
  let pathCount = 0;

  try {
    const opList = await page.getOperatorList();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const OPS = (pdfjsLib as any).OPS || {};

    const imageOpCodes = new Set(
      [
        OPS.paintImageXObject,
        OPS.paintInlineImageXObject,
        OPS.paintImageMaskXObject,
        OPS.paintSolidColorImageMask,
      ].filter((x) => typeof x === 'number')
    );

    const pathOpCodes = new Set(
      [
        OPS.constructPath,
        OPS.stroke,
        OPS.fill,
        OPS.eoFill,
        OPS.fillStroke,
        OPS.eoFillStroke,
        OPS.clip,
        OPS.eoClip,
      ].filter((x) => typeof x === 'number')
    );

    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i];
      if (imageOpCodes.has(fn)) {
        imageCount++;
      } else if (pathOpCodes.has(fn)) {
        pathCount++;
      }
    }
  } catch (err) {
    console.warn('Could not inspect operator list:', err);
  }

  // Check text for caption patterns
  let caption = '';
  let detectedType: FigureType = 'figure';

  for (const pat of CAPTION_PATTERNS) {
    const match = pageText.match(pat);
    if (match) {
      caption = match[0].trim().replace(/[\r\n]+/g, ' ');
      if (/^table/i.test(caption)) {
        detectedType = 'table';
      } else if (/^diagram|architecture|workflow|pipeline/i.test(caption)) {
        detectedType = 'diagram';
      } else {
        detectedType = 'figure';
      }
      break;
    }
  }

  const wordCount = pageText.split(/\s+/).filter(Boolean).length;

  // Criteria for flagging visual content:
  // 1. Explicit caption pattern matched ("Figure 1.1", "Table 2", etc.)
  // 2. Contains embedded images (imageCount > 0)
  // 3. Heavy vector diagrams (pathCount >= 18 and words < 120)
  // 4. Slide-style visual diagrams (words < 45 and pathCount >= 8)
  const isVisual =
    Boolean(caption) ||
    imageCount > 0 ||
    (pathCount >= 18 && wordCount < 120) ||
    (wordCount < 45 && pathCount >= 8);

  if (isVisual && !caption) {
    if (imageCount > 0) {
      caption = `Figure (Slide Page ${page.pageNumber})`;
      detectedType = 'figure';
    } else if (pathCount > 15) {
      caption = `Diagram (Slide Page ${page.pageNumber})`;
      detectedType = 'diagram';
    } else {
      caption = `Visual Content (Page ${page.pageNumber})`;
      detectedType = 'slide';
    }
  }

  return {
    hasVisualContent: isVisual,
    caption: caption || `Figure on Page ${page.pageNumber}`,
    type: detectedType,
    imageCount,
    pathCount,
  };
}

/**
 * Calculates a crop bounding box by detecting non-white visual content envelope.
 * Excludes standard 5% slide margins if they are uniform background.
 */
export function detectContentBoundingBox(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): CropBox | null {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    // Sample pixels in steps to remain fast and responsive
    const step = 4;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Pixel is non-white / non-transparent
        const isNotWhite = a > 30 && (r < 240 || g < 240 || b < 240);

        if (isNotWhite) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;

    // If the detected visual box is meaningful (at least 120x80px)
    if (boxWidth > 120 && boxHeight > 80 && (boxWidth < width * 0.96 || boxHeight < height * 0.96)) {
      const padding = 16;
      return {
        x: Math.max(0, minX - padding),
        y: Math.max(0, minY - padding),
        width: Math.min(width, boxWidth + padding * 2),
        height: Math.min(height, boxHeight + padding * 2),
      };
    }
  } catch (err) {
    console.warn('Canvas pixel analysis unavailable:', err);
  }

  return null;
}

/**
 * Renders a PDF page to a canvas, crops to the figure bounding box if present,
 * and generates full and thumbnail WebP blobs.
 */
export async function renderAndExtractFigure(
  page: pdfjsLib.PDFPageProxy,
  assessment: PageVisualAssessment,
  documentId: string,
  workspaceId: string
): Promise<ExtractedFigure> {
  const scale = 1.5; // Moderate scale for crisp readability without RAM bloat
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable.');
  }

  // Fill clean background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await page.render({ canvasContext: ctx, viewport } as any).promise;

  // Auto-detect bounding box
  const cropBox = detectContentBoundingBox(ctx, canvas.width, canvas.height);

  // Prepare cropped canvas if box found, else use full canvas
  let targetCanvas: HTMLCanvasElement = canvas;
  if (cropBox) {
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropBox.width;
    croppedCanvas.height = cropBox.height;
    const cropCtx = croppedCanvas.getContext('2d');
    if (cropCtx) {
      cropCtx.drawImage(
        canvas,
        cropBox.x,
        cropBox.y,
        cropBox.width,
        cropBox.height,
        0,
        0,
        cropBox.width,
        cropBox.height
      );
      targetCanvas = croppedCanvas;
    }
  }

  // 1. Generate full-resolution compressed Blob (WebP / JPEG fallback)
  const fullBlob = await new Promise<Blob>((resolve) => {
    targetCanvas.toBlob(
      (b) => resolve(b || new Blob([], { type: 'image/webp' })),
      'image/webp',
      0.85
    );
  });

  // 2. Generate thumbnail Blob (max 360px wide)
  const thumbMaxWidth = 360;
  const thumbScale = Math.min(1.0, thumbMaxWidth / targetCanvas.width);
  const thumbWidth = Math.round(targetCanvas.width * thumbScale);
  const thumbHeight = Math.round(targetCanvas.height * thumbScale);

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = thumbWidth;
  thumbCanvas.height = thumbHeight;
  const thumbCtx = thumbCanvas.getContext('2d');
  if (thumbCtx) {
    thumbCtx.drawImage(targetCanvas, 0, 0, thumbWidth, thumbHeight);
  }

  const thumbnailBlob = await new Promise<Blob>((resolve) => {
    thumbCanvas.toBlob(
      (b) => resolve(b || new Blob([], { type: 'image/webp' })),
      'image/webp',
      0.70
    );
  });

  const figureId = `fig-${documentId}-p${page.pageNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  return {
    id: figureId,
    workspaceId,
    documentId,
    pageNumber: page.pageNumber,
    caption: assessment.caption,
    type: assessment.type,
    fullBlob,
    blob: fullBlob,
    thumbnailBlob,
    width: targetCanvas.width,
    height: targetCanvas.height,
    cropBox: cropBox || { x: 0, y: 0, width: canvas.width, height: canvas.height },
    status: 'kept',
    userStatus: 'kept',
    figureIndex: 0,
    score: assessment.imageCount > 0 ? 0.95 : 0.7,
    detectedBy: assessment.imageCount > 0 ? 'operator_list' : 'caption',
    createdAt: Date.now(),
  };
}

/**
 * Re-crops a figure Blob to a user-specified bounding box.
 */
export async function reCropFigureBlob(
  sourceBlob: Blob,
  newCrop: CropBox
): Promise<{ fullBlob: Blob; thumbnailBlob: Blob; width: number; height: number }> {
  const img = new Image();
  const blobUrl = URL.createObjectURL(sourceBlob);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = blobUrl;
  });

  URL.revokeObjectURL(blobUrl);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(10, Math.round(newCrop.width));
  canvas.height = Math.max(10, Math.round(newCrop.height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');

  ctx.drawImage(
    img,
    newCrop.x,
    newCrop.y,
    newCrop.width,
    newCrop.height,
    0,
    0,
    newCrop.width,
    newCrop.height
  );

  const fullBlob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b || sourceBlob), 'image/webp', 0.85);
  });

  // Thumbnail
  const thumbScale = Math.min(1.0, 360 / canvas.width);
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = Math.round(canvas.width * thumbScale);
  thumbCanvas.height = Math.round(canvas.height * thumbScale);
  const thumbCtx = thumbCanvas.getContext('2d');
  if (thumbCtx) {
    thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  }

  const thumbnailBlob = await new Promise<Blob>((resolve) => {
    thumbCanvas.toBlob((b) => resolve(b || sourceBlob), 'image/webp', 0.70);
  });

  return {
    fullBlob,
    thumbnailBlob,
    width: canvas.width,
    height: canvas.height,
  };
}
