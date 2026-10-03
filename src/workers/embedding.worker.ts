import { pipeline, env } from '@huggingface/transformers';

// Configure transformers for browser environment and offline caching
env.allowLocalModels = false;
env.useBrowserCache = true;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedder: any = null;
let isInitializing = false;

async function getEmbedder(onProgress?: (progress: number) => void) {
  if (embedder) return embedder;
  if (isInitializing) {
    while (isInitializing) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return embedder;
  }

  isInitializing = true;
  try {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      progress_callback: (data: { status: string; progress?: number }) => {
        if (data.status === 'progress' && data.progress !== undefined) {
          self.postMessage({
            type: 'MODEL_PROGRESS',
            progress: Math.round(data.progress),
            status: 'Loading embedding model...',
          });
          if (onProgress) onProgress(data.progress);
        }
      },
    });
    return embedder;
  } finally {
    isInitializing = false;
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data;

  if (type === 'PING') {
    self.postMessage({ id, type: 'PONG' });
    return;
  }

  if (type === 'EMBED') {
    try {
      const { texts } = payload;
      const model = await getEmbedder();
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const output = await model(text, { pooling: 'mean', normalize: true });
        const vector = Array.from(output.data as Float32Array);
        results.push(vector);

        self.postMessage({
          type: 'EMBED_PROGRESS',
          id,
          current: i + 1,
          total: texts.length,
          percentage: Math.round(((i + 1) / texts.length) * 100),
        });
      }

      self.postMessage({ id, type: 'EMBED_SUCCESS', results });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      self.postMessage({ id, type: 'EMBED_ERROR', error: msg });
    }
  }
};
