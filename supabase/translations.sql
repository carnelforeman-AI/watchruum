-- =====================================================================
--  Multilingual support — language detection + translation cache
--
--  * Stores the detected language of each post/review/actor-comment (`lang`,
--    ISO 639-1), set for free on-device at write time.
--  * Adds `profiles.preferred_language` (the reader's chosen language).
--  * `content_translations` caches each (item → target language) translation
--    once so it's reused for every reader and every load (keeps cost near 0).
--
--  Safe to run multiple times. Run in the Supabase SQL editor.
-- =====================================================================

alter table comments        add column if not exists lang text;
alter table reviews         add column if not exists lang text;
do $$ begin
  alter table person_comments add column if not exists lang text;
exception when undefined_table then null; end $$;

alter table profiles add column if not exists preferred_language text;

create table if not exists content_translations (
  id             uuid primary key default gen_random_uuid(),
  content_type   text not null,          -- 'comment' | 'review' | 'person_comment'
  content_id     uuid not null,
  target_lang    text not null,          -- ISO 639-1
  source_lang    text,                   -- detected/returned source
  translated_text text not null,
  created_at     timestamptz default now(),
  unique (content_type, content_id, target_lang)
);

create index if not exists content_translations_lookup
  on content_translations (content_type, content_id, target_lang);

alter table content_translations enable row level security;

-- Cached translations are public content — anyone can read them.
drop policy if exists "translations read" on content_translations;
create policy "translations read" on content_translations
  for select using (true);

-- Any signed-in user can populate the cache (first viewer of a language pays).
drop policy if exists "translations insert" on content_translations;
create policy "translations insert" on content_translations
  for insert to authenticated with check (true);
