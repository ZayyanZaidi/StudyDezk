# StudyDezk Architecture & Security Specification

## 1. System Pipeline Overview
```
[User Browser]
  ├── In-Browser PDF/Image Extraction (PDF.js / Tesseract OCR)
  ├── Sentence Segmentation & Slide Line Merger
  ├── Chunk Splitter (~1,500 words with SHA-256 text_hash deduplication)
  │
  ▼
[/api/process-next Job Queue]
  ├── Deduplication Check (Lookup text_hash in chunk_notes cache)
  ├── Open-Weight LLM Adapter (/api/_llm.js)
  │     Primary: Groq (Qwen 2.5 32B)
  │     Failover 1: Cloudflare Workers AI (Gemma)
  │     Failover 2: OpenRouter Free Tier
  ├── JSON Validation & Coverage Audit
  │
  ▼
[Merge & Synthesis Engine]
  ├── Merges chunk notes into ONE living Markdown compilation per course
  ├── Generates Mermaid Diagrams (flowchart, mindmap, timeline, sequence)
  │
  ▼
[Living Study Suite]
  ├── Inline Living Study Guide with understood progress checkboxes
  ├── Spaced-repetition Flashcards (3D flip, Anki CSV export)
  └── Active Recall Quizzes (MCQ with rationale explanations)
```

## 2. Database Schema (Supabase PostgreSQL)
All tables feature UUID primary keys, user isolation via `user_id`, and foreign key cascade rules:
1. `profiles`: `id`, `full_name`, `university`, `program`, `semester`, `plan` ('free'|'pro'), `created_at`, `updated_at`.
2. `courses`: `id`, `user_id`, `name`, `code`, `color`, `semester`, timestamps.
3. `documents`: `id`, `user_id`, `course_id`, `title`, `file_name`, `file_type`, `file_size`, `total_pages`, `status`, `created_at`.
4. `chunks`: `id`, `user_id`, `course_id`, `document_id`, `chunk_index`, `text`, `text_hash`, `status` ('pending'|'processing'|'completed'|'failed'), `error`.
5. `chunk_notes`: `id`, `chunk_id` (unique), `user_id`, `course_id`, `notes` (JSONB), `created_at`.
6. `compilations`: `id`, `user_id`, `course_id` (unique), `markdown`, `version`, `updated_at`.
7. `diagrams`: `id`, `user_id`, `course_id`, `section_id`, `title`, `diagram_type`, `mermaid_code`, `created_at`.
8. `flashcards`: `id`, `user_id`, `course_id`, `section_id`, `front`, `back`, `known`, `created_at`.
9. `quizzes`: `id`, `user_id`, `course_id`, `section_id`, `question`, `options` (JSONB), `correct_index`, `explanation`, `user_answer`, `is_correct`.
10. `section_progress`: `id`, `user_id`, `course_id`, `section_id`, `understood`, `updated_at`.
11. `highlights`: `id`, `user_id`, `course_id`, `section_id`, `text`, `note`, `color`, `created_at`.
12. `usage`: `id`, `user_id`, `date`, `chunks_processed`.

## 3. Row Level Security (RLS) Policies
Row Level Security is enabled on every table in `supabase/schema.sql`:
- **Isolation Rule**: All queries enforce `auth.uid() = user_id` (or `auth.uid() = id` for `profiles`).
- Users are cryptographically prohibited from viewing, inserting, modifying, or deleting other accounts' course data.
- Automatically handles new profile creation upon sign up via `handle_new_user()` security definer trigger.

## 4. Plan Limits & Monetization
| Metric | Free Plan | Pro Plan ($9/mo) |
|---|---|---|
| Courses | 2 | Unlimited |
| Documents | 5 total | Unlimited |
| Daily Chunks | 30 chunks/day | 500 chunks/day |
| Diagrams | View & Edit | View, Edit, Vector SVG/PNG Export |
| Quizzes | Not included | Interactive MCQs with retry |
| Exports | In-browser view | Full PDF & Anki CSV exports |

## 5. Universal Ingestion & Multi-Representation Architecture
- **Web & Mobile Ingestion**:
  - Direct file extraction for PDF (`pdfjs-dist`), Image OCR (`tesseract.js` web worker), Text/Markdown (`.txt`, `.md`, `.markdown`, `.csv`, `.tsv`, `.json`, `.rtf`), and fallback decoders.
  - Mobile camera capture integration (`capture="environment" accept="image/*"`).
- **Multi-Representation Extractive Synthesis**:
  - **Structured Guide**: Organizes insights into hierarchical topic modules and extracted definitions.
  - **Interactive Checklists**: Understood state tracking with real-time progress calculations (`X / Y Understood`).
  - **Prose & Executive Summary**: Concise continuous narrative with quantifiable compression statistics.

## 6. Custom Account Settings & Course Context Isolation Architecture
- **Account & Preferences Layer (`useAuthStore`)**:
  - Manages student profiles (`Profile`), session limits (`DailyUsageStats`), and custom preferences (`UserCustomSettings`).
  - Settings encompass default summary representation mode, default compression density, diagram auto-synthesis toggle, reading font family (`sans`, `serif`, `mono`), line-height ergonomics, high-contrast mode, and daily chunk targets.
  - Settings are persisted to `localStorage` and dynamically applied to the DOM via root attributes (`data-font`, `data-line-height`, and `high-contrast` class).
- **Course Context Switching & Isolation Guarantee**:
  - Workspaces represent independent academic subjects/courses.
  - Calling `setActiveWorkspace(id)` triggers atomic state clearing:
    - Sets `activeWorkspaceId: id` and updates `selectedCourse`.
    - Resets `activeDocumentId` strictly to the first document of the selected workspace (or `null` if empty).
    - Resets `activeTab` to `'summary'`.
  - All feature components (`DocumentViewer`, `SummaryPanel`, `FlashcardDeck`, `GlossaryView`, `DiagramViewer`, `SessionHistoryView`) strictly filter their records by `workspaceId === activeWorkspaceId`.
  - Empty course workspaces render a clean course-specific onboarding screen, preventing lingering data from previously opened subjects.
  - Global semantic search supports scoping to the current course workspace or across all courses.
