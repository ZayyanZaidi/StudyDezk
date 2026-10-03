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
