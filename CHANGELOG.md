# Changelog

All notable changes to **StudyDezk** are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
