import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, RotateCcw, Crop, Maximize2 } from 'lucide-react';
import { ExtractedFigure, CropBox } from '../../types/figure';

interface CropFigureModalProps {
  figure: ExtractedFigure;
  isOpen: boolean;
  onClose: () => void;
  onSaveCrop: (figureId: string, newCrop: CropBox) => Promise<void>;
}

export const CropFigureModal: React.FC<CropFigureModalProps> = ({
  figure,
  isOpen,
  onClose,
  onSaveCrop,
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [naturalWidth, setNaturalWidth] = useState<number>(figure.width || 800);
  const [naturalHeight, setNaturalHeight] = useState<number>(figure.height || 600);
  const [crop, setCrop] = useState<CropBox>(
    figure.cropBox || { x: 0, y: 0, width: figure.width || 800, height: figure.height || 600 }
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Load blob into URL
  useEffect(() => {
    if (!isOpen || !figure.blob) return;
    const url = URL.createObjectURL(figure.blob);
    setImageSrc(url);

    // Initial crop from figure or full
    setCrop(
      figure.cropBox || {
        x: 0,
        y: 0,
        width: figure.width || 800,
        height: figure.height || 600,
      }
    );

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [isOpen, figure]);

  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalWidth(img.naturalWidth);
    setNaturalHeight(img.naturalHeight);
    if (!figure.cropBox || figure.cropBox.width <= 0) {
      setCrop({ x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight });
    }
  };

  // Convert click/drag coordinates from rendered image pixels to natural image pixels
  const getNaturalCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!imageRef.current) return { x: 0, y: 0 };
      const rect = imageRef.current.getBoundingClientRect();
      const scaleX = naturalWidth / Math.max(1, rect.width);
      const scaleY = naturalHeight / Math.max(1, rect.height);

      const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const relY = Math.max(0, Math.min(rect.height, clientY - rect.top));

      return {
        x: Math.round(relX * scaleX),
        y: Math.round(relY * scaleY),
      };
    },
    [naturalWidth, naturalHeight]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const coords = getNaturalCoords(e.clientX, e.clientY);
    setDragStart(coords);
    setIsDragging(true);
    setCrop({ x: coords.x, y: coords.y, width: 10, height: 10 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    const current = getNaturalCoords(e.clientX, e.clientY);

    const x = Math.min(dragStart.x, current.x);
    const y = Math.min(dragStart.y, current.y);
    const width = Math.max(20, Math.abs(current.x - dragStart.x));
    const height = Math.max(20, Math.abs(current.y - dragStart.y));

    setCrop({
      x: Math.max(0, Math.min(naturalWidth - 10, x)),
      y: Math.max(0, Math.min(naturalHeight - 10, y)),
      width: Math.min(naturalWidth - x, width),
      height: Math.min(naturalHeight - y, height),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleResetFullSlide = () => {
    setCrop({
      x: 0,
      y: 0,
      width: naturalWidth,
      height: naturalHeight,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveCrop(figure.id, crop);
      onClose();
    } catch (err) {
      console.error('Failed to save crop:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Compute crop box style relative to displayed image
  const displayCrop = () => {
    if (!imageRef.current || naturalWidth <= 0 || naturalHeight <= 0) return null;
    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = rect.width / naturalWidth;
    const scaleY = rect.height / naturalHeight;

    return {
      left: `${crop.x * scaleX}px`,
      top: `${crop.y * scaleY}px`,
      width: `${crop.width * scaleX}px`,
      height: `${crop.height * scaleY}px`,
    };
  };

  const cropStyle = displayCrop();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2 text-white">
            <Crop className="h-5 w-5 text-indigo-400" />
            <h3 className="font-semibold text-base sm:text-lg">
              Re-Crop Figure: {figure.caption}
            </h3>
            <span className="ml-2 rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
              Page {figure.pageNumber}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="relative flex-1 overflow-auto p-6 flex flex-col items-center justify-center bg-slate-950">
          <p className="mb-3 text-xs text-slate-400">
            Click and drag over the image to define a custom figure crop box.
          </p>

          <div
            ref={containerRef}
            className="relative select-none inline-block border border-slate-800 rounded-lg overflow-hidden cursor-crosshair max-w-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {imageSrc && (
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Figure to crop"
                onLoad={handleImageLoaded}
                className="max-h-[58vh] max-w-full object-contain pointer-events-none"
                draggable={false}
              />
            )}

            {/* Crop Overlay Box */}
            {cropStyle && (
              <div
                style={cropStyle}
                className="absolute border-2 border-indigo-400 bg-indigo-500/15 pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] transition-all"
              >
                <div className="absolute -top-6 left-0 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  {Math.round(crop.width)} &times; {Math.round(crop.height)}px
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-800 px-6 py-4 gap-3 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetFullSlide}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition"
            >
              <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
              Reset to Full Slide
            </button>
            <span className="text-xs text-slate-500">
              Crop: {Math.round(crop.width)} &times; {Math.round(crop.height)}px
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition shadow-lg shadow-indigo-600/30"
            >
              <Check className="h-4 w-4" />
              {isSaving ? 'Saving Crop...' : 'Apply Crop'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
