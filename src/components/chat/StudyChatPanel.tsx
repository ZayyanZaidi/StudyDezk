import React, { useState, useRef, useEffect } from 'react';
import { useStudyStore } from '../../store/useStudyStore';
import {
  MessageSquare,
  Sparkles,
  Send,
  Plus,
  Trash2,
  Edit2,
  Check,
  Copy,
  ExternalLink,
  Zap,
  Layers,
  FileText,
  ChevronDown,
  ChevronUp,
  Info,
  Clock,
  BookOpen,
  X,
} from 'lucide-react';

export const StudyChatPanel: React.FC = () => {
  const {
    activeDocumentId,
    documents,
    activeWorkspaceId,
    chatThreads,
    chatMessages,
    activeThreadId,
    createChatThread,
    setActiveThreadId,
    updateThreadReferenceDocuments,
    sendChatMessage,
    deleteChatThread,
    renameChatThread,
    clearThreadMessages,
  } = useStudyStore();

  const currentDoc = documents.find((d) => d.id === activeDocumentId);
  const wsDocs = documents.filter((d) => d.workspaceId === activeWorkspaceId);

  // Filter threads for current workspace
  const workspaceThreads = chatThreads.filter((t) => t.workspaceId === activeWorkspaceId);
  const activeThread = workspaceThreads.find((t) => t.id === activeThreadId) || workspaceThreads[0];

  // Active messages for this thread
  const currentMessages = activeThread
    ? chatMessages.filter((m) => m.threadId === activeThread.id)
    : [];

  const [inputQuery, setInputQuery] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [newTopicModalOpen, setNewTopicModalOpen] = useState(false);
  const [newTopicInput, setNewTopicInput] = useState('');
  const [newTopicScope, setNewTopicScope] = useState<'document' | 'workspace'>('document');
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCitations, setExpandedCitations] = useState<{ [msgId: string]: boolean }>({});
  const [showTokenInfo, setShowTokenInfo] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Synchronize topic input with active thread
  useEffect(() => {
    if (activeThread) {
      setTopicInput(activeThread.topic || activeThread.title || '');
    } else {
      setTopicInput('');
    }
    setIsEditingTopic(false);
  }, [activeThread?.id, activeThread?.topic, activeThread?.title]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length, isSending]);

  // Handle creating thread with user-typed topic
  const handleCreateNewThread = async (e: React.FormEvent) => {
    e.preventDefault();
    const topic = newTopicInput.trim() || 'General Study Discussion';
    const targetDocId = newTopicScope === 'document' ? currentDoc?.id : undefined;

    const newThread = await createChatThread(topic, targetDocId);
    setNewTopicInput('');
    setNewTopicModalOpen(false);
    setActiveThreadId(newThread.id);
  };

  // Handle saving edited topic
  const handleSaveTopic = async () => {
    if (!activeThread) return;
    const cleanTopic = topicInput.trim() || activeThread.title;
    await renameChatThread(activeThread.id, cleanTopic);
    setIsEditingTopic(false);
  };

  // Handle sending a message
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputQuery.trim();
    if (!text || isSending) return;

    setInputQuery('');
    setIsSending(true);

    try {
      let targetThreadId = activeThread?.id;

      // Auto-create thread with user's typed topic or question if none exists
      if (!targetThreadId) {
        const autoTopic = topicInput.trim() || text.slice(0, 40);
        const thread = await createChatThread(autoTopic, currentDoc?.id);
        targetThreadId = thread.id;
      }

      await sendChatMessage(targetThreadId, text, topicInput.trim());
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleCitations = (msgId: string) => {
    setExpandedCitations((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  // Compute latest token stats from the last assistant message
  const lastAssistantMsg = [...currentMessages].reverse().find((m) => m.role === 'assistant' && m.tokenStats);
  const latestTokenStats = lastAssistantMsg?.tokenStats;

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-white dark:bg-black">
      {/* Sidebar: Threads & Topics */}
      <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950 flex flex-col shrink-0 max-h-48 lg:max-h-full">
        {/* Threads Header */}
        <div className="p-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              Study Chats ({workspaceThreads.length})
            </span>
          </div>

          <button
            onClick={() => {
              setNewTopicInput('');
              setNewTopicModalOpen(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-[11px] font-bold text-white dark:text-black transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Topic</span>
          </button>
        </div>

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {workspaceThreads.length === 0 ? (
            <div className="p-4 text-center text-xs text-neutral-400">
              No chat threads yet. Type a topic and start chatting!
            </div>
          ) : (
            workspaceThreads.map((thread) => {
              const isActive = activeThread?.id === thread.id;
              const threadMsgCount = chatMessages.filter((m) => m.threadId === thread.id).length;
              return (
                <div
                  key={thread.id}
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`group flex items-center justify-between p-2 rounded-xl transition cursor-pointer text-xs ${
                    isActive
                      ? 'bg-neutral-200/70 dark:bg-neutral-800 font-semibold text-neutral-950 dark:text-white'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-xs">
                      {thread.topic || thread.title}
                    </p>
                    <span className="text-[10px] text-neutral-400 font-normal">
                      {thread.documentId ? 'Doc Focus' : 'Cross-Doc'} • {threadMsgCount} msg{threadMsgCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete thread "${thread.title}"?`)) {
                        deleteChatThread(thread.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-neutral-400 hover:text-rose-600 transition"
                    title="Delete thread"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Conversation View */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Top Topic & Token Bar */}
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Typable Topic Area */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <span className="text-xs font-bold text-neutral-500 shrink-0">
              Topic:
            </span>

            {isEditingTopic ? (
              <div className="flex items-center gap-1.5 flex-1 max-w-md">
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTopic()}
                  placeholder="Type any study topic (e.g. Distributed Consensus)..."
                  className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  autoFocus
                />
                <button
                  onClick={handleSaveTopic}
                  className="p-1 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-black hover:opacity-90"
                  title="Save topic"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTopic(true)}>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-white truncate max-w-sm">
                  {topicInput || activeThread?.title || 'Type any topic to study...'}
                </h3>
                <button
                  className="opacity-60 group-hover:opacity-100 p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
                  title="Click to edit topic"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Token Efficiency Pill */}
          <div className="flex items-center gap-2">
            {latestTokenStats ? (
              <button
                onClick={() => setShowTokenInfo(!showTokenInfo)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 transition hover:bg-emerald-100"
                title="View token efficiency breakdown"
              >
                <Zap className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>⚡ {latestTokenStats.savingsPercent}% Token Savings</span>
                <span className="text-[10px] opacity-75">
                  ({latestTokenStats.contextTokens}/{latestTokenStats.sourceTokens} tokens)
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 text-[11px] text-neutral-500 font-medium">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Token-Efficient Grounded Retrieval</span>
              </div>
            )}

            {currentMessages.length > 0 && activeThread && (
              <button
                onClick={() => {
                  if (confirm('Clear all messages in this thread?')) {
                    clearThreadMessages(activeThread.id);
                  }
                }}
                className="p-1 rounded-md text-neutral-400 hover:text-rose-600 transition"
                title="Clear messages"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Reference Documents Ribbon (Chat Multi-Document Reference Support) */}
        {activeThread && (
          <div className="px-4 py-2 bg-neutral-50/90 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className="font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1 text-[11px] shrink-0">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                References:
              </span>
              {(() => {
                const currentDocIds = activeThread.documentIds || (activeThread.documentId ? [activeThread.documentId] : []);
                const refDocs = documents.filter((d) => currentDocIds.includes(d.id));

                if (refDocs.length > 0) {
                  return refDocs.map((doc) => (
                    <span
                      key={doc.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-[11px] font-medium"
                    >
                      <FileText className="w-3 h-3 text-blue-500" />
                      <span className="max-w-[130px] truncate">{doc.title}</span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const nextIds = currentDocIds.filter((id) => id !== doc.id);
                          await updateThreadReferenceDocuments(activeThread.id, nextIds);
                        }}
                        className="hover:text-blue-900 dark:hover:text-blue-100 p-0.5 rounded-full"
                        title="Remove reference"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ));
                }
                return (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[11px]">
                    <span>All Workspace Documents ({wsDocs.length})</span>
                  </span>
                );
              })()}

              <button
                onClick={() => setDocPickerOpen(!docPickerOpen)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-blue-500 text-neutral-600 dark:text-neutral-400 hover:text-blue-600 text-[11px] font-medium transition cursor-pointer"
                title="Add or remove reference documents"
              >
                <Plus className="w-3 h-3" />
                <span>{docPickerOpen ? 'Done' : 'Add / Reference More Docs'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Reference Documents Selector Drawer */}
        {docPickerOpen && activeThread && (
          <div className="p-3 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                Select Documents to Reference in this Conversation:
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await updateThreadReferenceDocuments(activeThread.id, wsDocs.map((d) => d.id));
                  }}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Select All
                </button>
                <span className="text-neutral-300">|</span>
                <button
                  onClick={async () => {
                    await updateThreadReferenceDocuments(activeThread.id, []);
                  }}
                  className="text-[11px] text-neutral-500 hover:underline"
                >
                  Reset to All
                </button>
                <span className="text-neutral-300">|</span>
                <button
                  onClick={() => setDocPickerOpen(false)}
                  className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto pt-1">
              {wsDocs.map((doc) => {
                const currentDocIds = activeThread.documentIds || (activeThread.documentId ? [activeThread.documentId] : []);
                const isChecked = currentDocIds.includes(doc.id);
                return (
                  <label
                    key={doc.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                      isChecked
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={async (e) => {
                        let nextIds: string[];
                        if (e.target.checked) {
                          nextIds = Array.from(new Set([...currentDocIds, doc.id]));
                        } else {
                          nextIds = currentDocIds.filter((id) => id !== doc.id);
                        }
                        await updateThreadReferenceDocuments(activeThread.id, nextIds);
                      }}
                      className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                    />
                    <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate flex-1" title={doc.title}>
                      {doc.title}
                    </span>
                    <span className="text-[10px] text-neutral-400 shrink-0 font-normal">
                      {doc.totalPages}p
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Token Info Banner (Expandable) */}
        {showTokenInfo && latestTokenStats && (
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-start justify-between">
            <div className="space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-600" />
                Token-Efficient Retrieval Architecture
              </p>
              <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300 max-w-2xl">
                Instead of feeding all {latestTokenStats.sourceTokens} raw document tokens into memory, StudyDezk performs dense vector matching and TextRank salience scoring to distill the exact relevant evidence into just {latestTokenStats.contextTokens} tokens ({latestTokenStats.savingsPercent}% token savings).
              </p>
            </div>
            <button
              onClick={() => setShowTokenInfo(false)}
              className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                Study Chat on Any Topic
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md">
                Topics are completely typable and not limited to fixed options. Ask any question about your lecture notes, slides, or whiteboard photos below.
              </p>
            </div>
          ) : (
            currentMessages.map((msg) => {
              const isUser = msg.role === 'user';
              const isExpanded = expandedCitations[msg.id];
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1 max-w-3xl ${
                    isUser ? 'ml-auto' : 'mr-auto'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 px-1">
                    <span>{isUser ? 'You' : 'StudyDezk AI'}</span>
                    <span>•</span>
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl text-xs leading-relaxed transition shadow-xs ${
                      isUser
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-black rounded-tr-xs'
                        : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-800 rounded-tl-xs w-full'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Citations & Evidence Section for Assistant Messages */}
                    {!isUser && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                        <button
                          onClick={() => toggleCitations(msg.id)}
                          className="flex items-center justify-between w-full text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition"
                        >
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                            Grounded Citations ({msg.citations.length} sources)
                          </span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-2">
                            {msg.citations.map((cite, cIdx) => (
                              <div
                                key={cIdx}
                                className="p-2.5 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800 text-[11px]"
                              >
                                <div className="flex items-center justify-between font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                                  <span className="truncate max-w-xs">{cite.documentTitle}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                                    Page {cite.pageNumber}
                                  </span>
                                </div>
                                <p className="text-neutral-600 dark:text-neutral-400 italic">
                                  &ldquo;{cite.text}&rdquo;
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom Actions for Assistant Message */}
                    {!isUser && (
                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-neutral-400 pt-1">
                        {msg.tokenStats ? (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <Zap className="w-3 h-3" />
                            {msg.tokenStats.savingsPercent}% tokens saved ({msg.tokenStats.contextTokens} tokens)
                          </span>
                        ) : (
                          <span />
                        )}

                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="flex items-center gap-1 hover:text-neutral-700 dark:hover:text-neutral-200 transition cursor-pointer"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Answer</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isSending && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 max-w-xs">
              <div className="w-3.5 h-3.5 border-2 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin" />
              <span>Retrieving salient passages &amp; synthesizing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shrink-0">
          <form onSubmit={handleSendMessage} className="space-y-2">
            <div className="flex items-end gap-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-2.5 focus-within:ring-1 focus-within:ring-neutral-400 dark:focus-within:ring-neutral-600 transition">
              <textarea
                ref={textareaRef}
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder={
                  topicInput.trim()
                    ? `Ask anything about "${topicInput.trim()}"...`
                    : 'Type any study question or topic (press Enter to send)...'
                }
                className="flex-1 bg-transparent border-none text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none resize-none max-h-32 min-h-[24px]"
              />

              <button
                type="submit"
                disabled={!inputQuery.trim() || isSending}
                className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 cursor-pointer"
                title="Send query"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-neutral-400 px-1">
              <span>
                Scope:{' '}
                <strong className="text-neutral-600 dark:text-neutral-300">
                  {activeThread?.documentId ? currentDoc?.title || 'Selected Document' : `All Workspace Documents (${wsDocs.length})`}
                </strong>
              </span>
              <span>Press Shift + Enter for new line</span>
            </div>
          </form>
        </div>
      </div>

      {/* New Topic Chat Modal */}
      {newTopicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                Start Chat with Custom Topic
              </h3>
              <button
                onClick={() => setNewTopicModalOpen(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewThread} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
                  Typable Study Topic
                </label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Consensus, Buffer Overflow, TDD Cycle..."
                  value={newTopicInput}
                  onChange={(e) => setNewTopicInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  autoFocus
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  You can type any custom topic; you are not limited to fixed options.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
                  Document Knowledge Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTopicScope('document')}
                    disabled={!currentDoc}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer text-left ${
                      newTopicScope === 'document'
                        ? 'border-neutral-900 bg-neutral-900 text-white dark:bg-white dark:text-black dark:border-white'
                        : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300'
                    } ${!currentDoc ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-semibold">Current Document</div>
                    <div className="text-[10px] opacity-75 truncate">{currentDoc?.title || 'No doc selected'}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewTopicScope('workspace')}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer text-left ${
                      newTopicScope === 'workspace'
                        ? 'border-neutral-900 bg-neutral-900 text-white dark:bg-white dark:text-black dark:border-white'
                        : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <div className="font-semibold">All Workspace Docs</div>
                    <div className="text-[10px] opacity-75">{wsDocs.length} material(s)</div>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewTopicModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-xs font-bold text-white dark:text-black transition"
                >
                  Create &amp; Start Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
