# Watchruum 🎬

**Never get spoiled again.** A spoiler-safe social platform for TV and movie fans.
Track what you watch, rate every episode, and join fan rooms that unlock only when
you're ready.

Built with **Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn-style
components · Supabase (Auth + Postgres + RLS) · TMDb metadata**.

> The app runs out of the box on a fictional sample catalog and mock data.
> Add Supabase + TMDb keys to make it fully live — no code changes required.

---

## The core promise

You only ever see spoilers for content you've already marked as watched. Each post,
review, and comment carries a **spoiler scope** (`none` / `episode` / `season` /
`series`). The spoiler engine (`src/lib/spoiler.ts`) compares that scope against your
watch progress and decides whether to show, blur, or lock it — with a "Reveal anyway"
escape hatch and a report button for unmarked spoilers.

Try it: open any show → season → episode. The discussion is **locked** until you
click **Mark as watched**. Once watched, you can rate, react, review, and comment —
but a comment tagged *whole series* stays hidden with an explanation of exactly why.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — fill in keys, or leave blank for demo mode
npm run dev                  # http://localhost:3000
```

Build & run production:

```bash
npm run build && npm run start
```

### Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql). It creates
   all tables, indexes, Row Level Security policies, and a trigger that
   auto-creates a `profiles` row on signup.
3. Copy your Project URL + anon key into `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Restart. Auth, watch progress, ratings, and comments now persist.

### Connecting TMDb

Grab a free key at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
and set `TMDB_API_KEY` (v3) or `TMDB_READ_ACCESS_TOKEN` (v4) in `.env.local`. Search
and detail pages switch from the sample catalog to live movie/TV metadata and real
poster art automatically.

---

## What's built

**Phase 1 — foundations & the core loop**
- Next.js + TypeScript + Tailwind, dark cinematic theme, mobile-responsive.
- shadcn-style component library (`src/components/ui`).
- Supabase Auth (email/password), auth callback, session refresh via `proxy.ts`.
- Two-step profile onboarding after signup.
- TMDb search + movie / TV / season / episode pages (mock fallback).
- Selected TMDb titles are upserted into `media_items` on interaction.
- Watchlist, mark-episode-watched, mark-movie-watched.
- Ratings at movie / show / season / episode level (1–10).

**Phase 2 — social (UI + persistence wired)**
- Episode discussion comments with optimistic posting.
- Reviews and reactions (like) on cards.
- User profile pages, activity feed, notifications.

**Phase 3 — spoiler safety (the differentiator)**
- `spoiler_scope` on comments/reviews + progress-based filtering.
- Discussion hidden behind a spoiler gate until the episode is marked watched.
- "Show spoilers anyway" / "Reveal anyway" overrides.
- "Report spoiler" button and a `reports` table with admin-only RLS.

---

## Project structure

```
src/
  app/
    (main)/            # authenticated shell: sidebar + top bar + mobile nav
      page.tsx         # home dashboard (matches the design mockup)
      explore, trending, rooms, watchlist, activity, profile,
      settings, notifications/
      title/[id]/…/season/[season]/episode/[ep]/   # the important page
    (auth)/            # login, signup (no shell)
    onboarding/        # post-signup profile setup
    auth/callback/     # OAuth / email confirmation
    actions.ts         # server actions (persist to Supabase, no-op in demo)
  components/
    ui/                # button, card, badge, input, avatar, progress
    layout/            # sidebar, topbar, right-rail, mobile-nav, logo
    feed/              # hero, room-card, discussion-card, review-card
    media/             # poster, rating, media-card, title-actions
    room/              # episode-room (spoiler gate), episode-picker
    auth/, settings/
  lib/
    spoiler.ts         # ← the spoiler engine
    tmdb.ts            # TMDb client + mock fallback
    supabase/          # browser + server clients, config guard
    mock-data.ts, types.ts, utils.ts
  proxy.ts             # Next 16 middleware (session refresh)
supabase/schema.sql    # full Postgres schema + RLS
```

## Notes on artwork & content

No copyrighted posters or streaming content. The sample catalog uses fictional
titles and original **procedurally-generated cinematic poster art** — genre-aware
scenery, film grain, and title typography rendered as SVG
(`src/components/media/cinematic-poster.tsx`). Real poster art appears only when
TMDb is connected (a licensed metadata provider). There is no video playback.

## Deploy

Push to GitHub and import into Vercel. Add the same environment variables in the
Vercel dashboard. Set the Supabase Auth redirect URL to
`https://your-domain/auth/callback`.
