import React, { useState, useRef } from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import { CourseCategory } from '../../types/document';
import { Upload, FileText, Image as ImageIcon, X, AlertCircle, StopCircle, CheckCircle2, Camera, FileCode } from 'lucide-react';

interface FileUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FileUploaderModal: React.FC<FileUploaderModalProps> = ({ isOpen, onClose }) => {
  const {
    processFile,
    isProcessing,
    processingProgress,
    cancelProcessing,
    workspaces,
    activeWorkspaceId,
    documents,
  } = useStudyStore();

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const activeCourseName = activeWs?.course || activeWs?.name || 'General Studies';

  // Dynamically assemble unique courses from active workspaces and existing documents
  const dynamicCourses = Array.from(
    new Set([
      activeCourseName,
      ...workspaces.map((w) => w.course).filter(Boolean),
      ...workspaces.map((w) => w.name).filter(Boolean),
      ...documents.map((d) => d.course).filter(Boolean),
      'Distributed Systems',
      'Operating Systems',
      'Computer Networks',
      'Machine Learning',
      'Cloud Computing',
    ])
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [course, setCourse] = useState<CourseCategory>(activeCourseName);
  const [customCourse, setCustomCourse] = useState('');
  const [title, setTitle] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    setLocalError(null);

    if (file.size > 50 * 1024 * 1024) {
      setLocalError('File size exceeds 50MB browser limit.');
      return;
    }

    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setLocalError('Please choose a file to process.');
      return;
    }

    const finalCourse = course === 'Custom' ? customCourse.trim() || 'General Studies' : course;

    const res = await processFile(selectedFile, finalCourse, title);
    if (res) {
      // Success: reset and close
      setSelectedFile(null);
      setTitle('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-black shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6 transition-all max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Add Study Material
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Upload PDF slides, textbook pages, or photos of lecture notes
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
                {processingProgress.message || 'Extracting and analyzing text...'}
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Processing locally in your browser — zero data leaves your machine.
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
              <span>Stage: {processingProgress.stage}</span>
              <span className="font-semibold text-neutral-900 dark:text-white">{processingProgress.percentage}%</span>
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

            {/* Dropzone & File Pickers */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
                dragOver
                  ? 'border-neutral-900 dark:border-white bg-neutral-100/50 dark:bg-neutral-900/50'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 bg-neutral-50/50 dark:bg-neutral-900/40'
              }`}
            >
              {/* Universal File Input (Works on all Web & Mobile browsers) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="*/*,application/pdf,image/*,.pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,.txt,.md,.markdown,.docx,.doc,.rtf,.csv,.tsv,.json,text/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />

              {/* Dedicated Camera Input for Mobile Devices */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />

              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  {selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf') ? (
                    <FileText className="w-8 h-8 text-neutral-800 dark:text-neutral-200 shrink-0" />
                  ) : selectedFile.type.startsWith('image/') || /\.(png|jpe?g|webp|heic|heif)$/i.test(selectedFile.name) ? (
                    <ImageIcon className="w-8 h-8 text-neutral-800 dark:text-neutral-200 shrink-0" />
                  ) : (
                    <FileCode className="w-8 h-8 text-neutral-800 dark:text-neutral-200 shrink-0" />
                  )}
                  <div className="text-left">
                    <p className="text-xs font-bold text-neutral-900 dark:text-white truncate max-w-xs">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Click or drop to replace
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                      Click to choose any file
                    </span>{' '}
                    <span className="text-xs text-neutral-500">or drag and drop</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
                    PDF slides, photos, whiteboard notes, Markdown, text, and docs
                  </p>

                  {/* Direct Mobile Quick Actions */}
                  <div className="flex items-center justify-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 transition cursor-pointer"
                    >
                      Browse Files
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 transition cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Take Photo</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Course Category */}
            <div>
              <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
                University Course
              </label>
              <select
                aria-label="Target University Course"
                value={course}
                onChange={(e) => setCourse(e.target.value as CourseCategory)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
              >
                {dynamicCourses.map((c) => (
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

            {/* Document Title */}
            <div>
              <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
                Document Title (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Lecture 3: Threat Modeling & CIA"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-850 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedFile}
                className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-xs font-bold text-white dark:text-black disabled:opacity-50 disabled:cursor-not-allowed transition shadow-xs active:scale-95 cursor-pointer"
              >
                Process & Extract
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
