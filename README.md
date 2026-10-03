# StudyDezk 📚

> **Simple, Focused University Offline Study Suite**  
> A private, browser-only study app with course workspaces, selective PDF/OCR extraction, TextRank summarization, flashcards, semantic search, and Mermaid diagram synthesis. Target deployment: Vercel static site. No backend, no remote LLMs, zero paid APIs.

---

## ✨ Core Features

1. **Course Workspaces**:
   - Organize notes, slides, flashcards, and diagrams by course (e.g. *Cloud Computing*, *Information Security*, *Mobile App Development*, *Software Testing Strategies*).
   - Create custom workspaces with color tags, custom descriptions, and isolated material sets.
2. **Selective PDF Extraction & Web Worker OCR**:
   - Sequential page-by-page processing via `pdfjs-dist`.
   - Automatically detects pages lacking a text layer (< 30 characters) and runs offline OCR via `tesseract.js` in a dedicated Web Worker only on those pages.
3. **Slide-Style Line & Bullet Merger**:
   - Detects fragmented lecture slide bullet points and wrap breaks, reconstructing complete, coherent sentences prior to NLP analysis.
4. **Automatic Comprehensive Key Points Summarization**:
   - Zero-dependency TextRank graph algorithm with section-aware salience scoring and 0.85 damping factor.
   - **Full Content Coverage**: Automatically scans all slides, sections, and paragraphs to synthesize key points without arbitrary manual cutoffs.
   - **Key Point Highlighting**: Distinguishes primary conceptual takeaways and allows toggling between All Sections and Highlights Only.
   - Output format selection: cohesive executive paragraph or structured key bullets.
   - **Semantic Focus**: Free-text prompt (e.g. *"focus on attack types"*, *"focus on TDD loop"*) generates MiniLM embeddings to elevate matching sentences via cosine similarity.
5. **Interactive Usability Guide**:
   - In-app study manual accessible directly from the header with quick reference tabs for Workspaces, PDF/OCR extraction, Summarization, Flashcards, Diagrams, Shortcuts, and Data Durability.
6. **Simple Study Theme (Light & Dark)**:
   - High-contrast, distraction-free design with true black (`#000000`) dark mode and pure white (`#ffffff`) light mode.
   - Quick theme toggle in header (Light, Dark, Auto/System).
7. **Session History**:
   - Automatically saves generated summaries with source document reference, focus prompt, settings, and output.
   - Searchable, inline-renameable, deletable history view with 1-click session restoration.
   - Fully included in library JSON export/import.
8. **Key Terms & Glossary Extraction**:
   - Automated identification of technical terms and expansions.
   - Pre-seeded university course acronym bank for terms like `CIA`, `IaaS`, `PaaS`, `SaaS`, `TDD`, `BDD`, `JWT`, `RBAC`, `OWASP`, etc.
9. **Rule-Based Flashcards & Spaced Repetition**:
   - Synthesizes study cards using formal definition patterns (`"X is defined as Y"`, `"X refers to Y"`, `"X means Y"`, `"X: Y"`).
   - Interactive 3D flip card viewer with keyboard shortcuts (`Space` to flip, `Arrow` keys to navigate) and spaced repetition tracking.
10. **Mermaid Diagram Generation**:
    - **Mind Map** (`mindmap`): Synthesized from section headings and hierarchical bullet structures.
    - **Step Flowchart** (`flowchart TD`): Extracted from numbered lists, process sequences, and execution stages.
    - **Concept Graph** (`graph LR`): Generated from co-occurring keywords and acronym connections.
    - Live editable Mermaid code drawer, plus vector SVG and high-resolution PNG image exports.
11. **Client-Side Semantic Search**:
    - Vector cosine similarity search across all saved lecture documents and slides using `@huggingface/transformers` (`Xenova/all-MiniLM-L6-v2`) cached locally.
12. **Data Durability, Storage Limits & Backups**:
    - Calls `navigator.storage.persist()` on launch to request persistent storage from the browser.
    - Warns users if Private / Incognito browsing is detected.
    - Tracks backup age and reminds users if it has been over 7 days or after significant data additions.
    - One-click JSON backup export and import with conflict resolution (Merge or Replace).
13. **Dynamically Adjustable for Any Device**:
    - Responsive layout with `100dvh` mobile viewport adaptation, collapsible lecture drawer, touch-friendly study tabs, and clean desktop split view.
14. **Installable PWA**:
    - Fully compliant Progressive Web App with custom service worker precaching, Web App Manifest, offline indicators, and an in-app installation banner for desktop, Android, and iOS Safari.

---

## 💾 Browser Storage Durability & Limits

StudyDezk is client-side only and stores data directly in the browser's IndexedDB engine:

- **Storage Persistence**: On first launch, StudyDezk requests `navigator.storage.persist()`. In standard browsing, modern browsers grant persistence to installed PWAs and frequently visited origins.
- **Private / Incognito Browsing Warning**: In private/incognito browsing, browsers assign a temporary sandbox for IndexedDB. **All stored documents, flashcards, and history will be cleared when the private tab or session closes.** Always export a JSON backup before closing a private browsing session.
- **7-Day Inactivity Limits (iOS Safari non-PWA)**: WebKit applies an Intelligent Tracking Prevention (ITP) cap of 7 days of script-writable storage if the site is not visited or installed. **Installing StudyDezk as a PWA on your home screen or regularly exporting your backup eliminates this risk.**
- **Automatic Backup Reminders**: StudyDezk displays a reminder badge if your last backup was more than 7 days ago or if more than 3 significant changes have occurred without a backup.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript (Strict)
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS v4 (Warm study vibe theme)
- **State Management**: Zustand
- **Text & Document Extraction**: `pdfjs-dist`, `tesseract.js`
- **Embeddings & NLP**: `@huggingface/transformers` (`Xenova/all-MiniLM-L6-v2`), `Intl.Segmenter`
- **Graph Algorithms**: Custom pure implementations of TextRank, TF-IDF, and Cosine Similarity
- **Diagrams**: Mermaid
- **Database & Storage**: Dexie (IndexedDB), `dexie-export-import`
- **PWA**: `vite-plugin-pwa`
- **Testing**: Vitest + React Testing Library + jsdom

---

## 🚀 Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/example/studydezk.git
cd studydezk

# Install dependencies
npm install

# Start local development server (Port 3000)
npm run dev
```

### Running Tests

```bash
# Execute unit and component tests with Vitest
npm test

# Typecheck and lint codebase
npm run lint
```

### Building for Production

```bash
# Compile static bundle into dist/
npm run build

# Preview static production build
npm run preview
```

---

## 🌐 Vercel Deployment

StudyDezk compiles into an entirely static client-side bundle in `dist/`.

1. Push your repository to GitHub.
2. Link the repository in the Vercel Dashboard.
3. Configure the build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. The included `vercel.json` automatically sets:
   - Client-side SPA routing (`/(.*) -> /index.html`)
   - Strict Content Security Policy (`script-src`, `connect-src`, `worker-src`)
   - Anti-clickjacking headers (`X-Frame-Options: SAMEORIGIN`)
   - Service worker cache busting headers (`sw.js`)
