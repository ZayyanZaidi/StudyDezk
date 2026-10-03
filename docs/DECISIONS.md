# Architecture Decision Records (ADRs)

### ADR 001: Pure In-House NLP (TextRank & TF-IDF) vs Heavy Dependencies
- **Status**: Accepted
- **Context**: The app must run on consumer hardware with limited RAM, without shipping heavy Python or Node binary bindings into the browser.
- **Decision**: Implemented pure TypeScript functions for TextRank, TF-IDF, tokenization, and cosine similarity.
- **Consequences**: Zero bundle bloat, instant execution, deterministic testability, 100% browser compatibility.

---

### ADR 002: Selective OCR for PDFs
- **Status**: Accepted
- **Context**: Running OCR on every page of a 40-page lecture slide deck consumes excessive CPU and battery.
- **Decision**: Extract text layer via `pdfjs-dist` first. If text length is < 30 characters, only then render the page to a canvas and pass to `tesseract.js` in a Web Worker.
- **Consequences**: Digital PDFs process in under 1 second; only scanned images incur OCR computation.

---

### ADR 003: Slide Line Merger Strategy
- **Status**: Accepted
- **Context**: Lecture slides format text as fragmented bullet wrap lines that break standard sentence splitters and degrade summarization quality.
- **Decision**: Implemented `mergeSlideLines` to detect wrap points, bullet characters, and capitalization continuation, stitching lines back into fluent sentences before analysis.
- **Consequences**: Extracted summaries read fluently rather than outputting disjointed slide fragments.

---

### ADR 004: Course Workspaces & Isolation
- **Status**: Accepted
- **Context**: University students take multiple disparate courses simultaneously and need clean isolation between subjects.
- **Decision**: Added `workspaces` table in Dexie IndexedDB with `workspaceId` foreign keys across documents, flashcards, glossary terms, diagrams, and session histories.
- **Consequences**: Fast workspace switching, clear context isolation, and modular backup sets.

---

### ADR 005: Summary Session History Persistence
- **Status**: Accepted
- **Context**: Students generate variations of summaries with different focus requirements and need to revisit past outputs without recomputing.
- **Decision**: Persist every summary run with its parameters, requirement string, and results in `db.sessionHistories` with full search and inline rename support.
- **Consequences**: Fast retrieval, zero recalculation overhead, and full preservation in JSON backups.

---

### ADR 006: Data Durability & Storage Eviction Protection
- **Status**: Accepted
- **Context**: Browsers can evict IndexedDB under storage pressure or clear it on private mode exit.
- **Decision**: Request `navigator.storage.persist()`, detect private browsing to show high-visibility warnings, and prompt backup exports when unbacked for > 7 days.
- **Consequences**: Protects student study notes from silent browser storage eviction.
