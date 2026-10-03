# Changelog

All notable changes to **StudyDezk** are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-10-03

### Added
- **One Compilation Per Course Workspace**:
  - Replaced isolated per-document summaries with a single continuous compilation uniting all lectures and materials for each course.
  - Organized sequentially by source document (Lecture 1, 2, 3...) and section heading.
  - Interactive Table of Contents with jump anchors.
  - Inline figures and diagrams preserved in context without count limits.
  - Course-wide merged and deduplicated Glossary and Flashcards sections.
- **Incremental Processing & Fast Recompilation**:
  - IndexedDB caching (`db.cachedOutputs`) keyed by content hash (`computeFileContentHash`).
  - Adding, removing, reordering, or tuning presets recompiles instantly (< 20ms) from cache without re-reading source files.
  - Duplicate upload interception warns users instead of creating duplicates.
- **Cross-Document Deduplication**:
  - Automated detection of repetitive definitions and statements across different lecture decks.
  - Keeps the most comprehensive definition and tags cross-references (e.g. `also in Lecture 3 (p. 2)`).
- **Manual Notes & Summary Overrides**:
  - User-authored study notes and custom summary rewrites stored separately (`db.manualEdits`), strictly surviving recompilations.
- **Export & Backup Integration**:
  - Standalone printable HTML with embedded base64 figures and print CSS.
  - Complete Markdown export with embedded figures.
  - JSON backup and restore updated for cached outputs, manual edits, and course compilations.
- **Comprehensive Unit Tests**:
  - Added unit test suite verifying incremental caching, content hash duplicate detection, cross-document deduplication, manual edit survival, and TOC/glossary regeneration.

---

## [1.2.0] - 2026-10-03

### Added
- **Multi-Document & Multi-Image Batch Ingestion**:
  - Ability to upload, inspect, and read multiple PDF slide decks and note images (PNG, JPG, WebP) simultaneously.
  - Multi-file preview queue with individual remove buttons, file size summary, and batch progress tracking.
  - Sequential, RAM-efficient processing pipeline with per-file OCR, slide merging, flashcard generation, and semantic embedding.
- **Typable Topics for Study Chat**:
  - Topics are completely free-form and typable by the user, without being restricted to fixed dropdowns or preset chat options.
  - Ability to create multiple study chat threads with custom topics, rename topics on the fly, and switch between threads.
  - Document-level and cross-document workspace chat scope options.
- **Token-Efficient Grounded QA & Retrieval Engine**:
  - Client-side hybrid retriever combining dense MiniLM embeddings, BM25/TF-IDF token overlap, and TextRank centrality.
  - Strict token budgeting with deduplication, compressing tens of thousands of document tokens into high-salience context (~400-650 tokens), achieving 95%+ token savings.
  - Grounded answers with exact document and page citations (`[Document, Page X]`).
  - Real-time token efficiency badge and breakdown modal in the chat UI.
- **Study Chat Panel in DocumentViewer & Sidebar**:
  - Added dedicated "Study Chat" tab with live message counters and direct sidebar shortcut.

---

## [1.1.0] - 2026-10-03

### Added
- **Rebrand to StudyDezk**: Warm, focused "study vibe" aesthetic with refined academic typography and stone accents.
- **Course Workspaces**:
  - Multi-workspace architecture allowing separate spaces per university course.
  - Workspaces isolate documents, flashcards, glossary terms, diagrams, and session histories.
  - Workspace creation modal with customizable colors, course tags, and descriptions.
- **Summary Session History**:
  - Automatically persists all generated summaries with source document, requirement prompt, and settings.
  - Searchable, inline-renameable, and deletable session history view with 1-click restore.
  - Full inclusion of session history in JSON library backup/restore.
- **Chat Ready Data Model**:
  - Pre-wired `chatThreads` and `chatMessages` IndexedDB tables and TypeScript types linked to workspaces and documents.
- **Data Durability & Storage Protection**:
  - Calls `navigator.storage.persist()` on first run with persistent storage indicator.
  - High-priority warning banner when Private / Incognito browsing is detected.
  - Last backup tracking with intelligent reminders if unbacked for > 7 days or after significant changes.
  - Documented storage policies and limits in `README.md`.
- **Unit Tests**:
  - Added test suite for workspaces, session history, and storage durability heuristics.

---

## [1.0.0] - 2026-10-03

### Added
- Initial release with PDF extraction, selective OCR, TextRank extractive summarization, flashcards, Mermaid diagrams, and PWA offline capabilities.
