# Development Roadmap

This document outlines future planned features and evolutionary enhancements for StudyDezk.

---

## 📍 Phase 1: Current Core Architecture (Complete)
- [x] Course workspaces (e.g. per university course) holding isolated materials
- [x] In-browser PDF extraction with `pdfjs-dist`
- [x] Selective canvas-based OCR using `tesseract.js` Web Worker for textless/scanned pages
- [x] Slide-style fragmented line and bullet point merger
- [x] Pure algorithmic TextRank graph summarizer with length and style controls
- [x] Summary session history with search, rename, delete, and restore
- [x] MiniLM-L6-v2 embedding model in Web Worker for requirement query boosting
- [x] Rule-based definition pattern matching for flashcards & spaced repetition
- [x] Automatic Mermaid diagram generation (Mind Map, Step Flowchart, Concept Graph)
- [x] Client-side semantic vector search over IndexedDB embeddings
- [x] Data durability checks (`navigator.storage.persist()`), private mode alerts, and backup reminders
- [x] Data model prepared for chat threads and messages (`chatThreads`, `chatMessages`)
- [x] Dexie full library JSON backup export and import
- [x] PWA with offline caching and home screen install banners

---

## 🔮 Phase 2: Local WebLLM Chat Threads & Synthesis (Planned)
- [ ] Connect existing `chatThreads` and `chatMessages` schema to WebLLM (`@mlc-ai/web-llm`) running via WebGPU.
- [ ] Implement `WebLLMSummarizer` implementing the existing `Summarizer` interface.
- [ ] Support local document Q&A chat referencing extracted page sentences with citation indices.
- [ ] WebGPU device detection with graceful fallback to extractive TextRank on devices lacking WebGPU support.

---

## 🎯 Phase 3: Advanced Study Tooling
- [ ] Cloze deletion (fill-in-the-blank) flashcard rule generator.
- [ ] Audio synthesis for summaries using browser native `SpeechSynthesis`.
- [ ] Anki `.apkg` format exporter for generated flashcard decks.
