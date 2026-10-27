# StudyDezk — Project Context & Status

## 1. Purpose & Target Users
StudyDezk is a calm, library-vibe academic study application where university students create courses, upload lecture slides and whiteboard photos, and get ONE cohesive living study guide per course with structured topic notes, interactive Mermaid diagrams, flashcards, and quizzes. It is built as a freemium subscription-ready application designed to be inexpensive to run, highly reliable with model failovers, and easy to monetize.

## 2. Technology Stack
- **Frontend**: React 19, TypeScript 5.8+, Vite 8, Tailwind CSS v4, Lucide React, Zustand for state management.
- **Client Processing**: Browser-based PDF text extraction (`pdfjs-dist`), selective OCR (`tesseract.js`), sentence segmentation and TextRank extractive processing.
- **Diagrams**: Mermaid.js 12 with syntax auto-repair and theme-adaptive rendering (dark/light neutral mode).
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security, Auth with email/password/reset), paired with local Dexie IndexedDB for offline and private sessions.
- **AI Model Layer**: Open-weight provider-agnostic completions adapter supporting Groq (Qwen 2.5 32B), Cloudflare Workers AI (Gemma), and OpenRouter with automatic 429/timeout failover.

## 3. Folder Structure
```
/
├── .env.example              # Documented environment variables (Supabase & LLM providers)
├── ARCHITECTURE.md           # System architecture, schemas, and policies
├── CHANGELOG.md              # Versioned changelog of changes
├── PROJECT_CONTEXT.md        # High-level product and technical context
├── PROMPTS.md                # Registry of all system prompts and formats
├── prompts/                  # Prompt text templates
├── supabase/
│   └── schema.sql            # PostgreSQL schema, indexes, and RLS policies
├── src/
│   ├── components/
│   │   ├── account/          # Account modal, profile editor, usage meters
│   │   ├── auth/             # Sign in, registration, password reset modals
│   │   ├── backup/           # JSON library backup and restore
│   │   ├── diagrams/         # Mermaid diagram viewer and live code editor
│   │   ├── document/         # Document viewer, tabs, extracted text inspection
│   │   ├── flashcards/       # Flashcard deck with 3D flip and spaced repetition
│   │   ├── glossary/         # Extracted acronyms and key definitions
│   │   ├── guide/            # In-app usability guide modal
│   │   ├── layout/           # Header, sidebar, navigation, theme toggle
│   │   ├── pricing/          # Free vs Pro comparison and upgrade payment stub
│   │   ├── pwa/              # PWA install button and offline status indicators
│   │   ├── search/           # Semantic vector and keyword search modal
│   │   ├── summary/          # Extractive summary panel and session histories
│   │   ├── upload/           # Drag-and-drop file uploader with dynamic course selection
│   │   └── workspace/        # Course workspaces creation and switcher
│   ├── db/                   # IndexedDB / Dexie client and backup utilities
│   ├── lib/                  # External clients (Supabase client and config checks)
│   ├── logic/
│   │   ├── diagrams/         # Concept graph, flowchart, and Mermaid sanitizer
│   │   ├── extraction/       # PDF and image text extraction, OCR heuristics
│   │   └── nlp/              # Sentence segmentation, TF-IDF, TextRank
│   ├── store/                # Zustand stores (useStudyStore, useAuthStore)
│   └── types/                # TypeScript interface definitions
```

## 4. Design Tokens & Study Vibe
- **Backgrounds**: Pure white `#ffffff` (light), deep charcoal / black `#000000` & `#09090b` (dark).
- **Accents**: Deep neutral stone and amber gold highlights (`#f59e0b` / `#d97706`).
- **Typography**: Clean sans UI font paired with readable serif headings.
- **Borders & Radii**: Subtle hairline borders (`border-neutral-200 dark:border-neutral-800`), 12px-24px rounded containers.

## 5. Current Status
- **Auth & Profiles**: Completed (Supabase Auth integration, profile editing, usage meter, and delete account).
- **Sidebar Account Menu & Management**: Completed (embedded user profile card in sidebar footer with popover menu for profile, custom settings, subscription plan, and registration CTA).
- **Custom Account Settings**: Completed (`CustomSettingsModal` with summarization defaults, font and line-height ergonomics, high-contrast mode, and daily chunk targets).
- **Course Context Switching & Isolation**: Completed (strict state isolation on workspace change; clears prior document, resets tab to summary, isolates flashcards, glossary terms, diagrams, summaries, and search queries per workspace).
- **Dynamic Course Topics**: Completed (course topics are completely dynamic and unconstrained across workspaces and uploaders).
- **Mermaid Lexical Error**: Resolved (introduced `sanitizeMermaidCode` in `src/logic/diagrams/sanitizer.ts`, auto-repairs `== co-occurs ==` and unquoted node IDs, updated `conceptGraph.ts` and `DiagramViewer.tsx`).
- **Manual Theme Toggle**: Completed (explicit segmented Light / Dark toggle in Header, immediate mode switching without relying on system setting ambiguity).
- **Universal File Input (Web & Mobile)**: Completed (PDF, all image formats, Markdown, plain text, Word docx/rtf, plus dedicated mobile camera snap button for chalkboards/whiteboards).
- **Advanced Summarization & Multi-Representation**: Completed (Executive summary TL;DR, key definitions detection, section/topic grouping, compression metrics, and interactive 'Mark as understood' checklist).

## 6. Known Issues & Next Steps
- **Next Steps**: Step 2 & 3 of Build Order (job queue `/api/process-next`, text_hash caching, open-weight chat completion failover adapter).
