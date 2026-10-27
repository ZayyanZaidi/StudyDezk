-- ==============================================================================
-- StudyDezk Supabase Schema & Row Level Security (RLS) Policies
-- Run this script in the Supabase SQL Editor to provision all tables & security rules
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  university text,
  program text,
  semester text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Courses Table
create table if not exists public.courses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  code text,
  color text default 'amber',
  semester text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Documents Table
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  course_id uuid references public.courses on delete cascade not null,
  title text not null,
  file_name text not null,
  file_type text not null,
  file_size bigint not null default 0,
  total_pages integer not null default 1,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

-- 4. Chunks Table (1,500-word chunks with SHA-256 hash)
create table if not exists public.chunks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  course_id uuid references public.courses on delete cascade not null,
  document_id uuid references public.documents on delete cascade not null,
  chunk_index integer not null default 0,
  text text not null,
  text_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

-- 5. Chunk Notes Table (Structured JSON extraction)
create table if not exists public.chunk_notes (
  id uuid primary key default uuid_generate_v4(),
  chunk_id uuid references public.chunks on delete cascade not null unique,
  user_id uuid references auth.users on delete cascade not null,
  course_id uuid references public.courses on delete cascade not null,
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 6. Compilations Table (ONE living study guide per course)
create table if not exists public.compilations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  course_id uuid references public.courses on delete cascade not null unique,
  markdown text not null default '',
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

-- 7. Diagrams Table (Mermaid code for study guide)
create table if not exists public.diagrams (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  course_id uuid references public.courses on delete cascade not null,
  section_id text,
  title text not null,
  diagram_type text not null default 'flowchart' check (diagram_type in ('flowchart', 'mindmap', 'timeline', 'sequence')),
  mermaid_code text not null,
  created_at timestamptz not null default now()
);

-- 8. Flashcards Table
create table if not exists public.flashcards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  course_id uuid references public.courses on delete cascade not null,
  section_id text,
  front text not null,
  back text not null,
  known boolean not null default false,
  created_at timestamptz not null default now()
);

-- 9. Quizzes Table
create table if not exists public.quizzes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  course_id uuid references public.courses on delete cascade not null,
  section_id text,
  question text not null,
  options jsonb not null,
  correct_index integer not null,
  explanation text,
  user_answer integer,
  is_correct boolean,
  created_at timestamptz not null default now()
);

-- 10. Section Progress Table
create table if not exists public.section_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  course_id uuid references public.courses on delete cascade not null,
  section_id text not null,
  understood boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint section_user_course_unique unique (user_id, course_id, section_id)
);

-- 11. Highlights & Notes Table
create table if not exists public.highlights (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  course_id uuid references public.courses on delete cascade not null,
  section_id text,
  text text not null,
  note text,
  color text default 'amber',
  created_at timestamptz not null default now()
);

-- 12. Usage Table (Limits: 30 chunks/day for Free, unlimited for Pro)
create table if not exists public.usage (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  date date not null default current_date,
  chunks_processed integer not null default 0,
  constraint usage_user_date_unique unique (user_id, date)
);

-- ==============================================================================
-- Indexes for High Performance Querying & Deduplication
-- ==============================================================================
create index if not exists idx_profiles_user_id on public.profiles(id);
create index if not exists idx_courses_user_id on public.courses(user_id);
create index if not exists idx_documents_user_id on public.documents(user_id);
create index if not exists idx_documents_course_id on public.documents(course_id);
create index if not exists idx_chunks_user_id on public.chunks(user_id);
create index if not exists idx_chunks_course_id on public.chunks(course_id);
create index if not exists idx_chunks_text_hash on public.chunks(text_hash);
create index if not exists idx_chunks_status on public.chunks(status);
create index if not exists idx_chunk_notes_user_id on public.chunk_notes(user_id);
create index if not exists idx_compilations_course_id on public.compilations(course_id);
create index if not exists idx_diagrams_course_id on public.diagrams(course_id);
create index if not exists idx_flashcards_course_id on public.flashcards(course_id);
create index if not exists idx_quizzes_course_id on public.quizzes(course_id);
create index if not exists idx_section_progress_user_course on public.section_progress(user_id, course_id);
create index if not exists idx_highlights_course_id on public.highlights(course_id);
create index if not exists idx_usage_user_date on public.usage(user_id, date);

-- ==============================================================================
-- Row Level Security (RLS) - Users only access their own rows
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.chunk_notes enable row level security;
alter table public.compilations enable row level security;
alter table public.diagrams enable row level security;
alter table public.flashcards enable row level security;
alter table public.quizzes enable row level security;
alter table public.section_progress enable row level security;
alter table public.highlights enable row level security;
alter table public.usage enable row level security;

-- Profiles Policies
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Courses Policies
create policy "Users can view own courses" on public.courses for select using (auth.uid() = user_id);
create policy "Users can insert own courses" on public.courses for insert with check (auth.uid() = user_id);
create policy "Users can update own courses" on public.courses for update using (auth.uid() = user_id);
create policy "Users can delete own courses" on public.courses for delete using (auth.uid() = user_id);

-- Documents Policies
create policy "Users can view own documents" on public.documents for select using (auth.uid() = user_id);
create policy "Users can insert own documents" on public.documents for insert with check (auth.uid() = user_id);
create policy "Users can update own documents" on public.documents for update using (auth.uid() = user_id);
create policy "Users can delete own documents" on public.documents for delete using (auth.uid() = user_id);

-- Chunks Policies
create policy "Users can view own chunks" on public.chunks for select using (auth.uid() = user_id);
create policy "Users can insert own chunks" on public.chunks for insert with check (auth.uid() = user_id);
create policy "Users can update own chunks" on public.chunks for update using (auth.uid() = user_id);
create policy "Users can delete own chunks" on public.chunks for delete using (auth.uid() = user_id);

-- Chunk Notes Policies
create policy "Users can view own chunk_notes" on public.chunk_notes for select using (auth.uid() = user_id);
create policy "Users can insert own chunk_notes" on public.chunk_notes for insert with check (auth.uid() = user_id);
create policy "Users can update own chunk_notes" on public.chunk_notes for update using (auth.uid() = user_id);
create policy "Users can delete own chunk_notes" on public.chunk_notes for delete using (auth.uid() = user_id);

-- Compilations Policies
create policy "Users can view own compilations" on public.compilations for select using (auth.uid() = user_id);
create policy "Users can insert own compilations" on public.compilations for insert with check (auth.uid() = user_id);
create policy "Users can update own compilations" on public.compilations for update using (auth.uid() = user_id);
create policy "Users can delete own compilations" on public.compilations for delete using (auth.uid() = user_id);

-- Diagrams Policies
create policy "Users can view own diagrams" on public.diagrams for select using (auth.uid() = user_id);
create policy "Users can insert own diagrams" on public.diagrams for insert with check (auth.uid() = user_id);
create policy "Users can update own diagrams" on public.diagrams for update using (auth.uid() = user_id);
create policy "Users can delete own diagrams" on public.diagrams for delete using (auth.uid() = user_id);

-- Flashcards Policies
create policy "Users can view own flashcards" on public.flashcards for select using (auth.uid() = user_id);
create policy "Users can insert own flashcards" on public.flashcards for insert with check (auth.uid() = user_id);
create policy "Users can update own flashcards" on public.flashcards for update using (auth.uid() = user_id);
create policy "Users can delete own flashcards" on public.flashcards for delete using (auth.uid() = user_id);

-- Quizzes Policies
create policy "Users can view own quizzes" on public.quizzes for select using (auth.uid() = user_id);
create policy "Users can insert own quizzes" on public.quizzes for insert with check (auth.uid() = user_id);
create policy "Users can update own quizzes" on public.quizzes for update using (auth.uid() = user_id);
create policy "Users can delete own quizzes" on public.quizzes for delete using (auth.uid() = user_id);

-- Section Progress Policies
create policy "Users can view own progress" on public.section_progress for select using (auth.uid() = user_id);
create policy "Users can insert own progress" on public.section_progress for insert with check (auth.uid() = user_id);
create policy "Users can update own progress" on public.section_progress for update using (auth.uid() = user_id);
create policy "Users can delete own progress" on public.section_progress for delete using (auth.uid() = user_id);

-- Highlights Policies
create policy "Users can view own highlights" on public.highlights for select using (auth.uid() = user_id);
create policy "Users can insert own highlights" on public.highlights for insert with check (auth.uid() = user_id);
create policy "Users can update own highlights" on public.highlights for update using (auth.uid() = user_id);
create policy "Users can delete own highlights" on public.highlights for delete using (auth.uid() = user_id);

-- Usage Policies
create policy "Users can view own usage" on public.usage for select using (auth.uid() = user_id);
create policy "Users can insert own usage" on public.usage for insert with check (auth.uid() = user_id);
create policy "Users can update own usage" on public.usage for update using (auth.uid() = user_id);

-- ==============================================================================
-- Auto-create profile on auth signup trigger
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, plan)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Student'), 'free')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
