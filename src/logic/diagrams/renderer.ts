import { sanitizeMermaidCode, buildEmergencyFallbackMermaid } from './sanitizer';

let mermaidInstance: typeof import('mermaid').default | null = null;
let initialized = false;

let currentTheme: 'dark' | 'neutral' | null = null;

export async function getMermaid() {
  if (!mermaidInstance) {
    const mod = await import('mermaid');
    mermaidInstance = mod.default;
  }
  return mermaidInstance;
}

export async function renderMermaidSvg(id: string, rawCode: string, isDark = false): Promise<string> {
  const mermaid = await getMermaid();
  const targetTheme = isDark ? 'dark' : 'neutral';

  if (!initialized || currentTheme !== targetTheme) {
    mermaid.initialize({
      startOnLoad: false,
      theme: targetTheme,
      themeVariables: isDark
        ? {
            darkMode: true,
            background: '#09090b',
            primaryColor: '#18181b',
            primaryTextColor: '#f4f4f5',
            primaryBorderColor: '#3f3f46',
            lineColor: '#a1a1aa',
            secondaryColor: '#18181b',
            tertiaryColor: '#27272a',
          }
        : {
            darkMode: false,
            background: '#ffffff',
            primaryColor: '#f4f4f5',
            primaryTextColor: '#09090b',
            primaryBorderColor: '#d4d4d8',
            lineColor: '#52525b',
          },
      securityLevel: 'loose',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
        nodeSpacing: 50,
        rankSpacing: 50,
      },
    });
    initialized = true;
    currentTheme = targetTheme;
  }

  const cleanId = `mermaid-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Math.random().toString(36).slice(2, 7)}`;
  const sanitized = sanitizeMermaidCode(rawCode);

  try {
    const { svg } = await mermaid.render(cleanId, sanitized);
    return svg;
  } catch (err: any) {
    console.warn('Initial Mermaid render error, attempting auto-repair fallback:', err?.message || err);
    // Auto-repair attempt 1: fallback minimal graph
    try {
      const fallbackCode = buildEmergencyFallbackMermaid(id, err?.message);
      const retryId = `${cleanId}-retry`;
      const { svg } = await mermaid.render(retryId, fallbackCode);
      return svg;
    } catch {
      throw err;
    }
  }
}

export function exportDiagramAsSvg(svgContent: string, fileName = 'diagram.svg') {
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.endsWith('.svg') ? fileName : `${fileName}.svg`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportDiagramAsPng(svgElement: SVGElement, fileName = 'diagram.png') {
  const svgString = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const URLObj = window.URL || window.webkitURL || window;
  const blobUrl = URLObj.createObjectURL(svgBlob);

  const image = new Image();
  image.crossOrigin = 'anonymous';

  return new Promise<void>((resolve, reject) => {
    image.onload = () => {
      const scale = 2; // High-DPI export
      const canvas = document.createElement('canvas');
      canvas.width = (svgElement.clientWidth || 800) * scale;
      canvas.height = (svgElement.clientHeight || 600) * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URLObj.revokeObjectURL(blobUrl);
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      URLObj.revokeObjectURL(blobUrl);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create PNG blob'));
          return;
        }
        const pngUrl = URLObj.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
        a.click();
        URLObj.revokeObjectURL(pngUrl);
        resolve();
      }, 'image/png');
    };

    image.onerror = (err) => {
      URLObj.revokeObjectURL(blobUrl);
      reject(err);
    };

    image.src = blobUrl;
  });
}
