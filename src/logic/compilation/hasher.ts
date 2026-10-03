/**
 * Computes a deterministic content hash for duplicate upload detection.
 * Uses Web Crypto SHA-256 when available, with a fast string hash fallback.
 */

export async function computeFileContentHash(file: File | Blob): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && file.arrayBuffer) {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (err) {
    console.warn('Subtle crypto unavailable, falling back to text hash:', err);
  }

  // Fallback: chunk-based string hash
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string) || '';
      resolve(computeStringHash(text));
    };
    reader.onerror = () => {
      const fileName = 'name' in file ? (file as File).name : 'blob';
      const lastMod = 'lastModified' in file ? (file as File).lastModified : Date.now();
      resolve(`${fileName}-${file.size}-${lastMod}`);
    };
    reader.readAsText(file.slice(0, 100000));
  });
}

export function computeStringHash(str: string): string {
  let hash1 = 5381;
  let hash2 = 52711;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 * 33) ^ char;
  }

  const hex1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return `${hex1}${hex2}`;
}
