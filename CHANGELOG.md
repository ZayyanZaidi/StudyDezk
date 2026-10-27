# Changelog

All notable changes to **StudyDezk** are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-10-26

### Added
- **Account Creation and Management with Sidebar Menu**:
  - Embedded an interactive Account & User Management card in the Sidebar footer displaying user avatar, name, email, and Free/Pro status.
  - Interactive popover menu with links to "Account & Academic Profile", "Custom Settings & Fonts", "Plan & Quotas", "Manage Workspaces", and "Sign Out".
  - Dedicated "Sign In or Register" action and "Create Account →" CTA for unregistered/guest users.
- **Custom Account & Study Settings (`CustomSettingsModal`)**:
  - User settings store and modal with three organized preference tabs: Summarization, Reading & Typography, and Goals & Export.
  - Summarization defaults: default view format (Structured Outline, Key Bullets, Prose Narrative, TL;DR), compression density (Concise, Balanced, Exhaustive), auto-extract diagrams toggle, auto-save session logs.
  - Reading typography controls: Font family (Modern Sans, Editorial Serif, Technical Mono), line spacing (Compact 1.5, Relaxed 1.75, Spacious 2.0), High Readability Contrast toggle, and live typography preview card.
  - Learning targets: customizable daily chunk target (10–100 chunks/day), default flashcards export format (Anki TSV, JSON, CSV), reset to defaults.
  - Settings persisted in `localStorage` (`studydezk_user_settings`) and automatically applied to document root attributes (`data-font`, `data-line-height`, `high-contrast`).
- **Strict Course Context Switching Isolation**:
  - `setActiveWorkspace`: Completely resets course context upon selection, resetting active document to the target course's first document (or `null` if empty) and active tab to `'summary'`.
  - `DocumentViewer`: Renders a dedicated course-isolated empty state when switching to an empty course workspace with a direct "Upload Notes" CTA, guaranteeing zero residual context from prior courses.
  - `FlashcardDeck`: Strictly isolates cards by `workspaceId === activeWorkspaceId` and `documentId`, preventing any cross-course flashcard leakage.
  - `GlossaryView`: Strictly filters terminology and course acronyms by `workspaceId === activeWorkspaceId`.
  - `DiagramViewer`: Strictly isolates diagrams by `workspaceId === activeWorkspaceId` and `documentId`, clearing editor and rendered SVG on course change.
  - `SummaryPanel`: Flushes previous summary results, custom requirements, and checklist states immediately when document/course changes.
  - `SemanticSearchModal`: Added "Current Course" vs "All Courses" scope selector, and automatically switches active course workspace when opening a search hit from another course.
  - Unit tests added in `src/test/accountAndContextSwitching.test.ts`.

---

## [1.3.0] - 2026-10-26

### Added
- **Manual Light / Dark Theme Switcher**:
  - Replaced ambiguous 3-cycle button with an explicit, manual segmented Light / Dark toggle in the Header.
  - Toggling explicitly updates `document.documentElement` class list and `color-scheme` property immediately without depending on system setting state.
- **Universal File Ingestion (Web & Mobile)**:
  - Enabled support for all document formats: PDF, all standard image types (PNG, JPG, WebP, BMP, TIFF, HEIC/HEIF), Markdown (`.md`, `.markdown`), plain text (`.txt`), CSV/TSV, JSON, RTF, and Word docs (`.docx`).
  - Added dedicated 1-tap mobile camera capture button (`capture="environment" accept="image/*"`) allowing students to photograph physical whiteboards or handwritten notes directly on mobile devices.
  - Broadened JSON backup import input to ensure mobile browsers never grey out `.json` files.
- **Enhanced Data Summarization & Multi-Representation**:
  - Implemented noise and OCR artifact filtering (filters lone slide numbers, copyright lines, and garbled low-alpha lines).
  - Added automatic definition & primitive detection (`SummaryDefinition`) for core concepts.
  - Added hierarchical section & topic grouping (`SummarySectionGroup`) with collapsible topic headers.
  - Synthesized executive summaries (TL;DR) answering the core premise of lectures.
  - Added interactive "Mark as understood" checklists on summary points with live progress tracking (`X / Y Understood`).
  - Added quantifiable compression efficiency statistics (exact words saved and reading minutes saved).

---

## [1.2.0] - 2026-10-15

### Added
- **Auth and Accounts (Supabase Integration)**:
  - Email registration, authentication, login, logout, and password reset workflows.
  - Profiles table integration (`id`, `full_name`, `university`, `program`, `semester`, `plan`, `created_at`).
  - Account management modal: academic profile editing, current plan badge, and today's usage meter (chunks processed out of daily limit).
  - Pricing modal with comparison table for Free vs Pro Scholar ($9/mo) with instant test payment stub.
  - Delete account action with confirmation and cascade removal.
  - Full PostgreSQL schema with Row Level Security (RLS) policies in `supabase/schema.sql`.
- **Dynamic Course Topics**:
  - Replaced hardcoded course list with dynamic course selector derived from user workspaces and documents, with custom input option.
- **Mermaid Syntax Sanitizer & Auto-Repair**:
  - Implemented `sanitizeMermaidCode` in `src/logic/diagrams/sanitizer.ts`.
  - Resolved lexical errors caused by `== co-occurs ==` and unquoted multi-word node labels.
  - Added live "Auto-Repair" button in `DiagramViewer.tsx` when syntax errors occur.
- **Mandatory Context Files**:
  - Initialized and updated `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `PROMPTS.md`, and `CHANGELOG.md`.

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
