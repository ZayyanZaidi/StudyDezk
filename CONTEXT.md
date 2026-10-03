# StudyDesk — Project Context & Continuity Guide

> **For Future Engineers and AI Assistants**: This document details the purpose, constraints, assumptions, and domain context of StudyDesk so that future iterations maintain architectural purity and user trust.

---

## 🎯 Purpose & User

**StudyDesk** was built specifically for a university student taking intensive engineering and computing courses:
- **Cloud Computing** (Distributed virtualization, IaaS/PaaS/SaaS, SLAs, elasticity, tenancy)
- **Information Security** (CIA triad, cryptographic primitives, public key infrastructure, OWASP, threats)
- **Mobile App Development** (MVVM pattern, Android/iOS lifecycles, declarative UI, token security)
- **Software Testing Strategies** (Test-driven development, test pyramid, boundary value analysis, CI/CD)

The student uploads lecture slides, syllabi, textbook excerpts, and mobile phone photos of whiteboards or handwritten notes.

---

## 🔒 Non-Negotiable Engineering Constraints

1. **Zero External Backend / Zero Paid APIs**:
   - The app must run 100% inside the client browser.
   - Do NOT introduce OpenAI, Anthropic, or external cloud inference endpoints.
   - Do NOT introduce server-side database requirements.
2. **Strict Privacy**:
   - No user documents, text chunks, notes, or embeddings may ever leave the local machine.
3. **RAM & Performance Limits**:
   - The student works on laptops with modest RAM.
   - Web Workers (`comlink` / dedicated workers) are mandatory for heavy operations:
     - OCR via `tesseract.js` in a worker.
     - Embeddings via `@huggingface/transformers` in a worker.
     - PDF parsing processed sequentially page-by-page.
   - Selective OCR: Never run OCR on a whole PDF blindly. Only invoke OCR on pages whose extracted text layer has < 30 characters.
4. **Offline Capability & PWA**:
   - Must be an installable PWA that functions when disconnected from the internet.
   - Model weights and wasm modules are cached in CacheStorage / IndexedDB.
5. **Swappable Summarizer**:
   - All extractive and rule-based summarization conforms to `interface Summarizer`.
   - Any future addition (such as in-browser WebLLM) must simply implement `Summarizer` without rewriting the UI or database layers.
6. **One Compilation Per Course**:
   - Workspaces have exactly ONE unified continuous compilation containing all summary text, inline figures, tables, cross-document deduplicated glossary, and flashcards.
   - Organized in user-orderable document sequence (Lecture 1, 2, 3...) with generated anchor-linked Table of Contents.
   - Incremental update model: caches processed output in IndexedDB (`cachedOutputs`). Adding, removing, reordering, or tuning presets/requirements operates directly from cache without re-reading source files.
   - Duplicate uploads are detected by content hash (SHA-256 / string hash) and warned.
   - Cross-document deduplication identifies shared definitions across lectures, keeps the best version once, and records provenance tags (e.g. `also in Lecture 3 (p. 2)`).
   - User manual notes and custom summary rewrites are stored independently (`manualEdits`) and strictly survive all recompilations.

---

## 📂 Core Algorithms Built In-House

No heavy external NLP libraries are used for standard text processing:
- **TextRank**: Implemented as pure-function power-iteration PageRank on a sentence graph with a 0.85 damping factor and token-overlap or cosine similarity edge weights.
- **TF-IDF**: Pure term frequency calculation with smooth inverse document frequency (`log((1 + N)/(1 + df)) + 1`).
- **Cosine Similarity & Jaccard**: Pure vector mathematics operating on Float32Array and token sets.
- **Sentence Segmentation**: Browser-native `Intl.Segmenter` with abbreviation lookahead to prevent false splits on `e.g.`, `i.e.`, `Dr.`, `Fig.`.
- **Slide Fragment Merger**: Recombines slide-style wrapped lines and bullet lists into coherent grammatical sentences before passing to NLP.
- **Cross-Document Deduplication**: Compares sentence tokens and definition headers across documents to suppress redundant explanations while preserving cross-referencing citations.

