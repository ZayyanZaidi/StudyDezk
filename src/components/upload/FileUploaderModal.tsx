import React, { useState, useRef } from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import { CourseCategory } from '../../types/document';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  AlertCircle,
  StopCircle,
  CheckCircle2,
  Trash2,
  Plus,
  Layers,
} from 'lucide-react';

interface FileUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COURSES: CourseCategory[] = [
  'Cloud Computing',
  'Information Security',
  'Mobile App Development',
  'Software Testing Strategies',
];

export const FileUploaderModal: React.FC<FileUploaderModalProps> = ({ isOpen, onClose }) => {
  const { processMultipleFiles, isProcessing, processingProgress, cancelProcessing } = useStudyStore();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [course, setCourse] = useState<CourseCategory>('Cloud Computing');
  const [customCourse, setCustomCourse] = useState('');
  const [singleTitle, setSingleTitle] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAddFiles = (files: FileList | File[]) => {
    setLocalError(null);
    const incoming = Array.from(files);
    const validFiles: File[] = [];

    for (const file of incoming) {
      const valid =
        file.type === 'application/pdf' ||
        file.type.startsWith('image/') ||
        /\.(pdf|png|jpe?g|webp|bmp)$/i.test(file.name);

      if (!valid) {
        setLocalError(`"${file.name}" is not a supported file. Please upload PDFs or Images.`);
        continue;
      }

      if (file.size > 50 * 1024 * 1024) {
        setLocalError(`"${file.name}" exceeds the 50MB browser memory limit.`);
        continue;
      }

      // Check if duplicate already in list
      const alreadyExists = selectedFiles.some(
        (f) => f.name === file.name && f.size === file.size
      );
      if (!alreadyExists) {
        validFiles.push(file);
      }
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      if (selectedFiles.length === 0 && validFiles.length === 1 && !singleTitle) {
        setSingleTitle(validFiles[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setLocalError('Please choose at least one document or image to process.');
      return;
    }

    const finalCourse = course === 'Custom' ? customCourse.trim() || 'General Studies' : course;
    const optionalTitle = selectedFiles.length === 1 ? singleTitle.trim() : undefined;

    try {
      const res = await processMultipleFiles(selectedFiles, finalCourse, optionalTitle);
      if (res && res.length > 0) {
        setSelectedFiles([]);
        setSingleTitle('');
        onClose();
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Processing failed.');
    }
  };

  const pdfCount = selectedFiles.filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf')).length;
  const imgCount = selectedFiles.length - pdfCount;
  const totalSizeBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-black shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6 transition-all max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Add Study Materials
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Upload multiple PDF slides, textbook excerpts, or lecture whiteboard photos at once
            </p>
          </div>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        {isProcessing ? (
          <div className="py-8 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-900 dark:text-white">
              <div className="w-8 h-8 border-3 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin" />
            </div>

            <div>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                {processingProgress.message || 'Extracting and analyzing documents...'}
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Processing locally in your browser with zero external API calls.
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-3 overflow-hidden border border-neutral-200 dark:border-neutral-700">
              <div
                className="bg-neutral-900 dark:bg-white h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${processingProgress.percentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span className="capitalize">Stage: {processingProgress.stage}</span>
              <span className="font-semibold text-neutral-900 dark:text-white">
                {processingProgress.percentage}%
              </span>
            </div>

            {processingProgress.cancellable && (
              <button
                type="button"
                onClick={cancelProcessing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition active:scale-95 cursor-pointer"
              >
                <StopCircle className="w-4 h-4" />
                Cancel Processing
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {localError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{localError}</span>
              </div>
            )}

            {/* Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition ${
                dragOver
                  ? 'border-neutral-900 dark:border-white bg-neutral-100/50 dark:bg-neutral-900/50'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 bg-neutral-50/50 dark:bg-neutral-900/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,image/png,image/jpeg,image/webp,image/bmp"
                className="hidden"
                onChange={(e) => e.target.files && handleAddFiles(e.target.files)}
              />

              <div className="space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                    Click to select multiple files
                  </span>{' '}
                  <span className="text-xs text-neutral-500">or drag and drop them here</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Select multiple PDF slide decks and note images (PNG, JPG, WebP) simultaneously
                </p>
              </div>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    Selected Files ({selectedFiles.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px]">
                      {pdfCount > 0 ? `${pdfCount} PDF${pdfCount > 1 ? 's' : ''}` : ''}
                      {pdfCount > 0 && imgCount > 0 ? ', ' : ''}
                      {imgCount > 0 ? `${imgCount} Image${imgCount > 1 ? 's' : ''}` : ''}
                      {' • '}
                      {(totalSizeBytes / 1024).toFixed(0)} KB total
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedFiles([])}
                      className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                  {selectedFiles.map((file, idx) => {
                    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
                    return (
                      <div
                        key={`${file.name}-${idx}`}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg shrink-0 ${
                              isPdf
                                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                            }`}
                          >
                            {isPdf ? <FileText className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-xs">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-neutral-400">
                              {(file.size / 1024).toFixed(1)} KB • {isPdf ? 'PDF Document' : 'Photo / Image'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="p-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                          title="Remove file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Course Category */}
            <div>
              <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
                Target University Course
              </label>
              <select
                aria-label="Target University Course"
                value={course}
                onChange={(e) => setCourse(e.target.value as CourseCategory)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
              >
                {COURSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="Custom">+ Other / Custom Course...</option>
              </select>

              {course === 'Custom' && (
                <input
                  type="text"
                  placeholder="Enter course name (e.g. Distributed Systems)..."
                  value={customCourse}
                  onChange={(e) => setCustomCourse(e.target.value)}
                  className="w-full mt-2 px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
                />
              )}
            </div>

            {/* Optional Title for Single File */}
            {selectedFiles.length === 1 && (
              <div>
                <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
                  Document Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lecture 3: Threat Modeling & CIA"
                  value={singleTitle}
                  onChange={(e) => setSingleTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
                />
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More Files</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-850 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedFiles.length === 0}
                  className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-xs font-bold text-white dark:text-black disabled:opacity-50 disabled:cursor-not-allowed transition shadow-xs active:scale-95 cursor-pointer"
                >
                  {selectedFiles.length <= 1
                    ? 'Process & Extract'
                    : `Process All (${selectedFiles.length} Materials)`}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
