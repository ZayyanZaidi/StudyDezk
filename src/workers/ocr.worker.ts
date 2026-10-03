import { createWorker } from 'tesseract.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tesseractWorker: any = null;
let currentLanguage = 'eng';

async function getTesseractWorker(lang = 'eng') {
  if (tesseractWorker && currentLanguage === lang) {
    return tesseractWorker;
  }

  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
  }

  tesseractWorker = await createWorker(lang, 1, {
    logger: (m) => {
      self.postMessage({
        type: 'OCR_PROGRESS',
        status: m.status,
        progress: Math.round((m.progress || 0) * 100),
      });
    },
  });

  currentLanguage = lang;
  return tesseractWorker;
}

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data;

  if (type === 'PING') {
    self.postMessage({ id, type: 'PONG' });
    return;
  }

  if (type === 'RECOGNIZE') {
    try {
      const { image, language = 'eng' } = payload;
      const worker = await getTesseractWorker(language);
      const ret = await worker.recognize(image);
      const text = ret.data.text || '';

      self.postMessage({
        id,
        type: 'RECOGNIZE_SUCCESS',
        text,
        confidence: ret.data.confidence,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      self.postMessage({ id, type: 'RECOGNIZE_ERROR', error: msg });
    }
  } else if (type === 'TERMINATE') {
    if (tesseractWorker) {
      await tesseractWorker.terminate();
      tesseractWorker = null;
    }
    self.postMessage({ id, type: 'TERMINATED' });
  }
};
