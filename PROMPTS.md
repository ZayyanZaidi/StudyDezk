# Model Prompts Reference (PROMPTS.md)

All prompts used by StudyDezk are versioned, documented, and stored in `/prompts`.

---

## 1. Chunk Analysis Prompt (`/prompts/chunk_analysis.txt`)
- **Version**: 1.0.0
- **Purpose**: Parses an extracted ~1,500-word lecture or reading text chunk into strict structured JSON.
- **Inputs**: `{{DOCUMENT_TITLE}}`, `{{COURSE_NAME}}`, `{{CHUNK_TEXT}}`
- **Output Format**: Strict JSON object containing:
  - `topics_covered` (array of string)
  - `key_concepts` (array of `{topic, summary, importance}`)
  - `definitions` (array of `{term, definition}`)
  - `formulas` (array of `{name, formula, variables}`)
  - `examples` (array of `{concept, description}`)
  - `diagram_candidates` (array of `{title, type, description}`)
- **Failover / Validation**: Validates JSON syntax. If parsing fails, retries once with raw output. Strips `<think>...</think>` tokens before parsing.

---

## 2. Coverage Check Prompt (`/prompts/coverage_check.txt`)
- **Version**: 1.0.0
- **Purpose**: Audits the extracted study notes against the original source chunk to verify no critical topics or details were dropped.
- **Inputs**: `{{CHUNK_TEXT}}`, `{{COVERED_TOPICS}}`
- **Output Format**: Strict JSON object containing:
  - `all_source_topics` (array of string)
  - `missing_topics` (array of string)
  - `is_complete` (boolean)
  - `targeted_recovery` (markdown notes for any missing items)

---

## 3. Merge Compilation Prompt (`/prompts/merge_compilation.txt`)
- **Version**: 1.0.0
- **Purpose**: Synthesizes newly processed chunk notes with the existing living study guide for the course into ONE cohesive Markdown document.
- **Inputs**: `{{COURSE_NAME}}`, `{{EXISTING_COMPILATION}}`, `{{NEW_NOTES_JSON}}`
- **Output Format**: Clean Markdown with structured headings (`#`, `##`, `###`), bolded definitions, formulas, and examples.

---

## 4. Diagram Generator Prompt (`/prompts/diagram_generate.txt`)
- **Version**: 1.0.0
- **Purpose**: Generates syntactically valid Mermaid.js diagrams (flowchart, mindmap, timeline, sequence) for a given topic or concept.
- **Inputs**: `{{TOPIC}}`, `{{DIAGRAM_TYPE}}`, `{{CONTEXT}}`
- **Output Format**: Raw Mermaid syntax only (no markdown code fence blocks).

---

## 5. Explain Simpler & Examples Prompt (`/prompts/explain_simpler.txt`)
- **Version**: 1.0.0
- **Purpose**: Provides inline on-demand student assistance for a section ("Explain simpler" or "Give an example").
- **Inputs**: `{{MODE}}` (`explain_simpler` | `give_example`), `{{SECTION_TITLE}}`, `{{SECTION_TEXT}}`
- **Output Format**: Markdown snippet under 150 words with intuitive analogies or concrete real-world applications.

---

## 6. Quiz Generation Prompt (`/prompts/quiz_generate.txt`)
- **Version**: 1.0.0
- **Purpose**: Creates 3-5 multiple-choice questions with answer keys and explanations for active recall.
- **Inputs**: `{{COURSE_NAME}}`, `{{SECTION_TITLE}}`, `{{SECTION_TEXT}}`
- **Output Format**: Strict JSON object containing an array of `{question, options, correct_index, explanation}`.

---

## 7. User Custom Preferences & Options (`/src/types/auth.ts`)
- **Version**: 1.1.0
- **Purpose**: Governs summarizer behavior, default output representation modes, and typography across all client-side extraction operations.
- **Configurable Parameters**:
  - `defaultSummaryStyle`: `'structured'` | `'bullets'` | `'paragraph'` | `'tldr'`
  - `defaultSummaryLength`: `'concise'` (30%) | `'auto'` | `'detailed'` (70%)
  - `autoExtractDiagrams`: `boolean` (controls automatic synthesis of Mindmaps and Flowcharts on document upload)
  - `fontPreference`: `'sans'` | `'serif'` | `'mono'`
  - `readingLineHeight`: `'normal'` | `'relaxed'` | `'loose'`
  - `highReadabilityContrast`: `boolean`
  - `dailyChunkTarget`: `number` (default: 30)
