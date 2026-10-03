/**
 * Worker Manager
 * Coordinates lifecycle, lazy-loading, cancellation, and message passing
 * for OCR and Embedding Web Workers.
 */

class WorkerManager {
  private embeddingWorker: Worker | null = null;
  private ocrWorker: Worker | null = null;
  private nextMsgId = 1;

  private getEmbeddingWorker(): Worker {
    if (!this.embeddingWorker) {
      this.embeddingWorker = new Worker(
        new URL('./embedding.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return this.embeddingWorker;
  }

  private getOcrWorker(): Worker {
    if (!this.ocrWorker) {
      this.ocrWorker = new Worker(
        new URL('./ocr.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return this.ocrWorker;
  }

  /**
   * Generates dense semantic embeddings for a batch of text chunks.
   */
  async getBatchEmbeddings(
    texts: string[],
    onProgress?: (percentage: number, statusText: string) => void,
    abortSignal?: AbortSignal
  ): Promise<number[][]> {
    if (texts.length === 0) return [];

    const worker = this.getEmbeddingWorker();
    const id = `embed-${this.nextMsgId++}`;

    return new Promise((resolve, reject) => {
      let isSettled = false;

      const abortHandler = () => {
        if (!isSettled) {
          isSettled = true;
          worker.removeEventListener('message', messageHandler);
          // Restart worker to clear pending queue
          this.terminateEmbeddingWorker();
          reject(new DOMException('Embedding generation was cancelled by the user.', 'AbortError'));
        }
      };

      if (abortSignal) {
        if (abortSignal.aborted) {
          return reject(new DOMException('Embedding generation was cancelled.', 'AbortError'));
        }
        abortSignal.addEventListener('abort', abortHandler, { once: true });
      }

      const messageHandler = (e: MessageEvent) => {
        const data = e.data;
        if (data.type === 'MODEL_PROGRESS' && onProgress) {
          onProgress(data.progress, data.status);
        } else if (data.type === 'EMBED_PROGRESS' && onProgress) {
          onProgress(data.percentage, `Embedding text chunk ${data.current} of ${data.total}`);
        } else if (data.id === id) {
          isSettled = true;
          worker.removeEventListener('message', messageHandler);
          if (abortSignal) abortSignal.removeEventListener('abort', abortHandler);

          if (data.type === 'EMBED_SUCCESS') {
            resolve(data.results);
          } else {
            reject(new Error(data.error || 'Failed to generate embeddings'));
          }
        }
      };

      worker.addEventListener('message', messageHandler);
      worker.postMessage({
        id,
        type: 'EMBED',
        payload: { texts },
      });
    });
  }

  /**
   * Generates a dense semantic embedding for a single text string.
   */
  async getEmbedding(
    text: string,
    onProgress?: (percentage: number, statusText: string) => void,
    abortSignal?: AbortSignal
  ): Promise<number[]> {
    const results = await this.getBatchEmbeddings([text], onProgress, abortSignal);
    return results[0] || [];
  }

  /**
   * Runs Tesseract OCR on an image Blob, File, or base64 data URL.
   */
  async runOcr(
    imageSource: Blob | File | string,
    onProgress?: (percentage: number, statusText: string) => void,
    abortSignal?: AbortSignal
  ): Promise<string> {
    const worker = this.getOcrWorker();
    const id = `ocr-${this.nextMsgId++}`;

    return new Promise((resolve, reject) => {
      let isSettled = false;

      const abortHandler = () => {
        if (!isSettled) {
          isSettled = true;
          worker.removeEventListener('message', messageHandler);
          this.terminateOcrWorker();
          reject(new DOMException('OCR process was cancelled by the user.', 'AbortError'));
        }
      };

      if (abortSignal) {
        if (abortSignal.aborted) {
          return reject(new DOMException('OCR process was cancelled.', 'AbortError'));
        }
        abortSignal.addEventListener('abort', abortHandler, { once: true });
      }

      const messageHandler = (e: MessageEvent) => {
        const data = e.data;
        if (data.type === 'OCR_PROGRESS' && onProgress) {
          onProgress(data.progress, `OCR: ${data.status} (${data.progress}%)`);
        } else if (data.id === id) {
          isSettled = true;
          worker.removeEventListener('message', messageHandler);
          if (abortSignal) abortSignal.removeEventListener('abort', abortHandler);

          if (data.type === 'RECOGNIZE_SUCCESS') {
            resolve(data.text);
          } else {
            reject(new Error(data.error || 'OCR processing failed'));
          }
        }
      };

      worker.addEventListener('message', messageHandler);
      worker.postMessage({
        id,
        type: 'RECOGNIZE',
        payload: { image: imageSource },
      });
    });
  }

  terminateEmbeddingWorker() {
    if (this.embeddingWorker) {
      this.embeddingWorker.terminate();
      this.embeddingWorker = null;
    }
  }

  terminateOcrWorker() {
    if (this.ocrWorker) {
      this.ocrWorker.terminate();
      this.ocrWorker = null;
    }
  }

  terminateAll() {
    this.terminateEmbeddingWorker();
    this.terminateOcrWorker();
  }
}

export const workerManager = new WorkerManager();
