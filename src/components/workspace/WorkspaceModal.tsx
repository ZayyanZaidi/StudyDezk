import React, { useState } from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import { Workspace } from '../../types/workspace';
import { FolderPlus, X, Trash2, Check, BookOpen, Layers } from 'lucide-react';

const COLOR_OPTIONS = [
  { id: 'blue', label: 'Blue', class: 'bg-blue-500 text-white' },
  { id: 'rose', label: 'Rose', class: 'bg-rose-500 text-white' },
  { id: 'emerald', label: 'Emerald', class: 'bg-emerald-500 text-white' },
  { id: 'amber', label: 'Amber', class: 'bg-amber-500 text-white' },
  { id: 'purple', label: 'Purple', class: 'bg-purple-500 text-white' },
  { id: 'indigo', label: 'Indigo', class: 'bg-indigo-500 text-white' },
];

export const WorkspaceModal: React.FC = () => {
  const {
    workspaceModalOpen,
    setWorkspaceModalOpen,
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    createWorkspace,
    deleteWorkspace,
  } = useStudyStore();

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [color, setColor] = useState('blue');
  const [description, setDescription] = useState('');

  if (!workspaceModalOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createWorkspace(name, course || name, color, description);
    setName('');
    setCourse('');
    setDescription('');
    setIsCreating(false);
    setWorkspaceModalOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete workspace "${name}" and all its materials?`)) {
      await deleteWorkspace(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-black shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6 space-y-5 max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Course Workspaces
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Organize documents, summaries, flashcards, and diagrams per course
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsCreating(false);
              setWorkspaceModalOpen(false);
            }}
            className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isCreating ? (
          /* Create Form */
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                Workspace Name
              </label>
              <input
                type="text"
                placeholder="e.g. Distributed Systems & Cloud..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                Course / Subject Code
              </label>
              <input
                type="text"
                placeholder="e.g. CS 4410"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                Color Accent
              </label>
              <div className="flex items-center gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                      c.class
                    } ${color === c.id ? 'ring-2 ring-offset-2 ring-neutral-900 dark:ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
                  >
                    {color === c.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                Description (Optional)
              </label>
              <textarea
                placeholder="Brief description of course modules or goals..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-xs font-bold text-white dark:text-black shadow-xs transition active:scale-95 cursor-pointer"
              >
                Create Workspace
              </button>
            </div>
          </form>
        ) : (
          /* Workspace List */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Active & Saved Workspaces ({workspaces.length})
              </span>
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>New Workspace</span>
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 min-h-0">
              {workspaces.map((ws) => {
                const isActive = ws.id === activeWorkspaceId;
                return (
                  <div
                    key={ws.id}
                    onClick={() => {
                      setActiveWorkspace(ws.id);
                      setWorkspaceModalOpen(false);
                    }}
                    className={`flex items-start justify-between p-3.5 rounded-2xl border transition cursor-pointer ${
                      isActive
                        ? 'border-neutral-900 bg-neutral-100 dark:border-white dark:bg-neutral-900'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200 font-bold text-xs shrink-0 mt-0.5">
                        {ws.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                            {ws.name}
                          </h4>
                          {isActive && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-black">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                          {ws.description || ws.course}
                        </p>
                      </div>
                    </div>

                    {workspaces.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(ws.id, ws.name);
                        }}
                        className="p-1 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0 ml-2"
                        title="Delete workspace"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
