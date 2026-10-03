# Architecture & Data Flow

This document details the internal architecture, module decomposition, pipeline stages, and worker coordination of StudyDezk.

```
                   ┌────────────────────────────────────────┐
                   │               USER INPUT               │
                   │  (PDF File / Photo / Lecture Slides)   │
                   └───────────────────┬────────────────────┘
                                       │
                                       ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                 COURSE WORKSPACE ASSIGNMENT                 │
        │ Workspaces isolate documents, flashcards, glossary,         │
        │ diagrams, and session histories per university course.      │
        └──────────────────────────────┬──────────────────────────────┘
                                       │
                                       ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                 STAGE 1: DOCUMENT EXTRACTION                │
        ├──────────────────────────────┬──────────────────────────────┤
        │        PDF Text Layer        │         Image / Photo        │
        │       (`pdfjs-dist`)         │       (`tesseract.js`)       │
        │                              │                              │
        │ Detect pages with no text    │ Direct execution via         │
        │ (< 30 chars) -> run selective│ dedicated Web Worker         │
        │ canvas OCR only on them      │                              │
        └──────────────────────────────┴──────────────────────────────┘
                                       │
                                       ▼
        ┌─────────────────────────────────────────────────────────────┐
        │            STAGE 2: SLIDE MERGER & NORMALIZATION            │
        │ Recombines wrap-broken bullet items and fragmented slide    │
        │ lines into complete, grammatically sound sentences.         │
        └──────────────────────────────┬──────────────────────────────┘
                                       │
                                       ▼
        ┌─────────────────────────────────────────────────────────────┐
        │              STAGE 3: EXTRACTION PIPELINES                  │
        ├──────────────────┬──────────────────────┬───────────────────┤
        │   Key Terms &    │ Rule-Based Flashcard │  Mermaid Diagram  │
        │  Acronyms Bank   │     Synthesizer      │     Generators    │
        │  (CIA, IaaS,     │ ("X is defined as Y",│  Mindmap, Steps,  │
        │   TDD, MVVM)     │  "X refers to Y")    │   Concept Graph   │
        └──────────────────┴──────────────────────┴───────────────────┘
                                       │
                                       ▼
        ┌─────────────────────────────────────────────────────────────┐
        │          STAGE 4: LOCAL INDEXEDDB STORAGE (Dexie)           │
        │ Persists workspaces, documents, pages, flashcards, glossary,│
        │ diagrams, and summary session histories.                    │
        └──────────────────────────────┬──────────────────────────────┘
                                       │
                                       ▼
        ┌─────────────────────────────────────────────────────────────┐
        │             STAGE 5: BACKGROUND VECTOR EMBEDDINGS           │
        │ Lazy-loaded `@huggingface/transformers` in Web Worker       │
        │ Model: `Xenova/all-MiniLM-L6-v2` (quantized 384-dim)        │
        │ Enables instant semantic search and requirement boosting.   │
        └─────────────────────────────────────────────────────────────┘
```

---

## 🧵 Worker Architecture & Concurrency

To ensure the main UI thread never drops a frame:
1. **OCR Worker (`src/workers/ocr.worker.ts`)**:
   - Spawns Tesseract wasm engine.
   - Communicates recognition progress (0-100%) back to the UI.
   - Terminates gracefully or on user abort.
2. **Embedding Worker (`src/workers/embedding.worker.ts`)**:
   - Loads ONNX runtime and MiniLM weights.
   - Uses browser cache to avoid re-downloading model assets.
   - Batch processes sentences and returns L2-normalized 384-dimensional vectors.
3. **Worker Manager (`src/workers/workerManager.ts`)**:
   - Manages message IDs, promise settlement, progress subscriptions, and cancellation (`AbortSignal`).

---

## 💾 Durability & Persistence Model

- On app bootstrap, calls `navigator.storage.persist()`.
- Tracks backup age and reminds users to export if > 7 days or after significant additions.
- Displays banner if private/incognito browsing session detected.

---

## 💬 Chat Ready Data Model (Pre-Wired)

The database schema (`db.chatThreads` and `db.chatMessages`) is configured with indexes on `workspaceId` and `documentId`:
```typescript
interface ChatThread {
  id: string;
  workspaceId: string;
  documentId?: string;
  title: string;
  systemPrompt?: string;
  createdAt: number;
  updatedAt: number;
}
```
Ready for local LLM integration without schema migrations.

---

## 📚 Unified Course Compilation System

Each course workspace features exactly **one continuous compilation** uniting all course materials:
1. **Incremental Cached Document Pipeline (`db.cachedOutputs`)**:
   - Each uploaded document computes a deterministic content hash (`computeFileContentHash`).
   - Cleaned text, structural sections, inline figures, embeddings, flashcards, and glossary items are cached in IndexedDB.
   - Processing duplicate files is immediately intercepted with an informational warning.
2. **Compilation Assembler (`src/logic/compilation/incrementalCompiler.ts`)**:
   - Compiles the single course view strictly from cached artifacts without re-reading source files.
   - Preserves user sequence ordering (`DocumentCompilationConfig`), per-document inclusions, and detail preset overrides (`brief`, `standard`, `detailed`, `exam`).
3. **Cross-Document Deduplication (`src/logic/compilation/crossDocDeduplicator.ts`)**:
   - Identifies repetitive definitions and high-similarity statements across different lectures.
   - Retains the most detailed instance once and tags cross-reference badges (e.g. `also in Lecture 3 (p. 2)`).
4. **Manual User Edit Preservation (`db.manualEdits`)**:
   - Student notes and custom summary rewrites are keyed by `sectionId` in a separate table, guaranteeing they are never overwritten during re-indexing or recompilation.
5. **Standalone Export Engine (`src/logic/compilation/compilationExporter.ts`)**:
   - Generates self-contained, printable HTML documents (with inline base64 figures and `@media print` rules) and complete Markdown exports with images.

