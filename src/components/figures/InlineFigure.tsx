import React, { useState, useEffect } from 'react';
import {
  Maximize2,
  Crop,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle,
  XCircle,
  X,
  Download,
} from 'lucide-react';
import { ExtractedFigure, CropBox } from '../../types/figure';
import { CropFigureModal } from './CropFigureModal';

interface InlineFigureProps {
  figure: ExtractedFigure;
  onUpdateStatus?: (figureId: string, status: 'kept' | 'removed') => Promise<void>;
  onReCrop?: (figureId: string, newCrop: CropBox) => Promise<void>;
  onDelete?: (figureId: string) => Promise<void>;
  isRemoved?: boolean;
}

export const InlineFigure: React.FC<InlineFigureProps> = ({
  figure,
  onUpdateStatus,
  onReCrop,
  onDelete,
  isRemoved = false,
}) => {
  const [thumbUrl, setThumbUrl] = useState<string>('');
  const [fullUrl, setFullUrl] = useState<string>('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  // Manage Blob URLs
  useEffect(() => {
    const thumbBlob = figure.thumbnailBlob || figure.blob;
    const tUrl = URL.createObjectURL(thumbBlob);
    setThumbUrl(tUrl);

    let fUrl = '';
    if (figure.blob) {
      fUrl = URL.createObjectURL(figure.blob);
      setFullUrl(fUrl);
    }

    return () => {
      URL.revokeObjectURL(tUrl);
      if (fUrl) URL.revokeObjectURL(fUrl);
    };
  }, [figure]);

  const handleToggleStatus = async () => {
    if (!onUpdateStatus) return;
    const nextStatus = figure.userStatus === 'removed' ? 'kept' : 'removed';
    await onUpdateStatus(figure.id, nextStatus);
  };

  const handleDownload = () => {
    if (!fullUrl) return;
    const a = document.createElement('a');
    a.href = fullUrl;
    a.download = `${figure.caption.replace(/[^a-z0-9_-]/gi, '_')}.webp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (isRemoved || figure.userStatus === 'removed') {
    return (
      <div className="my-3 flex items-center justify-between rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <EyeOff className="h-4 w-4 text-slate-500" />
          <span>Figure removed from summary: <strong className="text-slate-300">{figure.caption}</strong> (Page {figure.pageNumber})</span>
        </div>
        <button
          type="button"
          onClick={handleToggleStatus}
          className="rounded border border-slate-700 px-2 py-1 text-xs text-indigo-400 hover:bg-slate-800 hover:text-indigo-300 transition"
        >
          Restore Figure
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="group relative my-4 rounded-xl border border-slate-800 bg-slate-900/70 p-3 shadow-md backdrop-blur-sm transition-all hover:border-indigo-500/40 hover:shadow-lg">
        {/* Figure Header Bar */}
        <div className="mb-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 font-medium text-indigo-400">
              Page {figure.pageNumber}
            </span>
            <span className="font-semibold text-slate-200">
              {figure.caption}
            </span>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              title="Open full size"
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            {onReCrop && (
              <button
                type="button"
                onClick={() => setIsCropModalOpen(true)}
                title="Re-crop figure"
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-indigo-400 transition"
              >
                <Crop className="h-3.5 w-3.5" />
              </button>
            )}
            {onUpdateStatus && (
              <button
                type="button"
                onClick={handleToggleStatus}
                title="Remove figure from summary"
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-amber-400 transition"
              >
                <EyeOff className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(figure.id)}
                title="Delete figure permanently"
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Thumbnail Image Container */}
        <div
          onClick={() => setIsLightboxOpen(true)}
          className="relative flex items-center justify-center overflow-hidden rounded-lg bg-slate-950/60 cursor-pointer border border-slate-800/80 hover:border-slate-700 transition"
        >
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={figure.caption}
              loading="lazy"
              className="max-h-72 w-auto max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.01]"
            />
          ) : (
            <div className="flex h-40 w-full items-center justify-center text-slate-500">
              Loading figure preview...
            </div>
          )}

          {/* Hover overlay hint */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="flex items-center gap-1.5 rounded-full bg-slate-900/90 px-3 py-1 text-xs font-medium text-white shadow">
              <Maximize2 className="h-3.5 w-3.5 text-indigo-400" />
              Tap to expand full size
            </span>
          </div>
        </div>

        {/* Caption */}
        <div className="mt-2 text-center text-xs text-slate-400 font-medium">
          Figure: <span className="text-slate-300">{figure.caption}</span>
        </div>
      </div>

      {/* Full-size Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative max-h-[92vh] max-w-[94vw] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top controls */}
            <div className="mb-3 flex w-full items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-indigo-600/30 border border-indigo-500/40 px-2 py-0.5 text-xs font-semibold text-indigo-300">
                  Page {figure.pageNumber}
                </span>
                <span className="text-sm font-semibold">{figure.caption}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  title="Download figure image"
                  className="rounded-lg bg-slate-800/80 p-2 text-slate-200 hover:bg-slate-700 hover:text-white transition"
                >
                  <Download className="h-4 w-4" />
                </button>
                {onReCrop && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsLightboxOpen(false);
                      setIsCropModalOpen(true);
                    }}
                    title="Re-crop figure"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 hover:text-white transition"
                  >
                    <Crop className="h-3.5 w-3.5 text-indigo-400" />
                    Re-crop
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(false)}
                  className="rounded-lg bg-slate-800/80 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* High-res Image */}
            <div className="max-h-[82vh] overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-2 shadow-2xl">
              <img
                src={fullUrl || thumbUrl}
                alt={figure.caption}
                className="max-h-[78vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Re-crop Modal */}
      {isCropModalOpen && onReCrop && (
        <CropFigureModal
          figure={figure}
          isOpen={isCropModalOpen}
          onClose={() => setIsCropModalOpen(false)}
          onSaveCrop={onReCrop}
        />
      )}
    </>
  );
};
