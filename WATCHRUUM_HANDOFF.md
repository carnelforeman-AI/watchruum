# Watchruum — Build Handoff Log

Spoiler-safe social app for TV & movie fans. Users join rooms for shows, movies,
seasons and episodes and discuss what they've actually watched — spoilers beyond
a person's progress are hidden by default. **Not** a streaming app: no playback,
no copyrighted posters (procedural gradient/TMDb art only).

**Live** on GitHub + Vercel + Supabase. Tagline: *"Never get spoiled again."*

---

## 1. Live status & infrastructure

- **GitHub**: `carnelforeman-AI/watchruum` (branch `main`). Every push auto-deploys.
- **Vercel**: project `watchruum` (org `carnelforeman-ais-projects`). Live at
  **watchruum.vercel.app**. Env vars set for Production + Preview (Supabase URL +
  anon key, TMDb key).
- **Supabase**: project `watchruum`, ref `jmjktypvuyvzmeifsqac` ("CivicLens Dev" org).
- **TMDb**: connected — real search, metadata, posters.
- **Auth**: Google OAuth (Sign in with Google) working end-to-end.
- **Admin**: user **Ctrader247** has `is_admin = true`.

### Local repo (user's machine)
`C:\Users\carne\OneDrive\Desktop\AI Learning\AI Projects\Watchruum\watchruum`
— this **nested** `watchruum` folder is the real git repo (it has `.git`,
`package.json`, `.env.local`). An outer duplicate (`...\Watchruum\src`, etc.) was
cleaned up and deleted; do not recreate it.

### Iteration workflow (how changes ship)
Claude edits files in its cloud workspace → delivers them to the local repo via the
desktop bridge → **user runs** `git add . && git commit -m "..." && git push` →
Vercel auto-deploys (~35s build). CRLF/LF warnings on `git add` are harmless.

---

## 2. Tech stack & conventions

- **Next.js 16** (App Router, Turbopack). Breaking changes vs. older Next — see
  repo `AGENTS.md`. Key points: `params` and `searchParams` are **Promises**
  (`await` them); route groups `(main)` / `(auth)`; `export const dynamic =
  "force-dynamic"` on data pages; middleware is `proxy.ts`.
- **React 19**, TypeScript, **Tailwind CSS v4** (`@theme` in `globals.css`).
  Custom utilities: `glass`, `glass-hover`, `brand-gradient`. Color tokens:
  `text-foreground`, `text-muted`, `text-muted-2`, `text-safe`, `text-warn`,
  `text-danger`, `text-accent`, `text-accent-2`, `text-primary`,
  `primary-strong`, `border-border`, `bg-bg-elevated`.
- **Supabase** via `@supabase/ssr` (browser + server clients, guarded by
  `isSupabaseConfigured`). RLS everywhere. `is_admin()` SECURITY DEFINER function
  avoids RLS recursion.
- Hand-built shadcn-style UI primitives in `src/components/ui/` (Button, Badge,
  Avatar, Card, Input/Textarea, Progress).
- Dependency-free inline-SVG charts (`src/components/admin/charts.tsx`):
  AreaChart, Donut, Sparkline.

---

## 3. Database — schema & migrations

Base schema is `supabase/schema.sql` (profiles, media_items, seasons, episodes,
watch_status, episode_watches, ratings, reviews, comments, follows, reactions,
notifications, reports + RLS + signup trigger).

**Migrations that must be run in the Supabase SQL editor** (all have been run):

| File | Adds | Status |
|------|------|--------|
| `supabase/schema.sql` | base tables, RLS, signup trigger | ✅ run |
| `supabase/moderation.sql` | `is_admin()`, `profiles.status/status_reason/status_updated_at`, `admin_notes`, `user_warnings` | ✅ run |
| `supabase/rooms.sql` | `room_states` (admin room overrides: featured/pinned/locked/archived/hidden) | ✅ run |
| `supabase/privacy.sql` | `profiles.is_private` | ✅ run |

If the DB is ever recreated, run them in that order (`moderation.sql` before
`rooms.sql`, since `rooms.sql` depends on `is_admin()`).

### Room data model (important)
Rooms are **not** a stored table — they're derived from TMDb titles, matching the
whole app. The "room key" for messages is `(media_id, season_number,
episode_number)`:
- **TV show** → one main show room + one room per episode.
- **Movie** → one room (season/episode stored as `null`).
A message's `spoiler_scope` (`none`/`episode`/`season`/`series`) carries its
spoiler reach; the spoiler engine compares it to the viewer's watch progress.
`room_states` stores admin overrides keyed by a derived room id
(e.g. `show_1399`, `ep_1399_s1e4`, `mov_27205`).

---

## 4. Spoiler system (the core promise)

`src/lib/spoiler.ts` is the single source of truth. `evaluateSpoiler(content,
progress, isMovie)` returns `safe | episode | season | series | locked`.
`SPOILER_LEVELS` + `spoilerMeta` define the standard colors/labels used
**everywhere** (legend, per-post tags, badges). The reusable UI lives in
`src/components/room/spoiler-standard.tsx` (`SpoilerLegend`, `SpoilerTag`,
`SafeZonePill`) — TV shows the 5-level scale; movies show a 3-level Safe /
Spoilers / Locked scale.

Standard scale: **Safe Zone** (green) · **Episode Spoilers** (yellow) · **Season
Spoilers** (orange) · **Full Series Spoilers** (red) · **Locked** (purple).

---

## 5. Features built (chronological, start → current)

### Foundation (earlier batches)
- Full MVP UI, spoiler engine, TMDb search/detail/season/episode pages.
- Auth + onboarding; watch/rate/comment/review/react server actions persisting to
  Supabase (`src/app/actions.ts`).
- Procedural cinematic posters (genre-aware SVG) — no copyrighted art.
- Home dashboard wired to real Supabase user data (Continue Watching, Watchlist,
  Your Progress, profile chip); logged-out visitors get sample data; empty states.

### Auth & branding
- **Split-screen login page** (`/login`) with poster panel + login gate.
- Logo simplified to the **"Watchruum" wordmark** (no icon), larger.
- **Google OAuth** set up end-to-end (Google Cloud OAuth client + Supabase
  provider). Note: the OAuth **Client Secret** is entered by the user only.

### Admin console (`/admin`)
- **Overview** dashboard: real counts (users/reviews/posts/titles/reports),
  breakdown donut, activity series, recent reports, recent activity, content
  overview from TMDb. Data layer: `src/lib/admin.ts`.
- **Reports** queue (`/admin/reports`) — resolve/dismiss/remove reported content.
- **Users** management (`/admin/users`) — real member data, tabs, stat cards,
  donut + growth chart, search/filter/paginate, per-user detail page
  (`/admin/users/[id]`).
- **User moderation**: 14-action `⋯` menu (view/notes/message/role/warn/limit/
  mute/suspend/ban/force-logout/delete) with a real backend — `admin_notes`,
  `user_warnings`, account `status` with enforcement (blocked write actions +
  layout redirect to `/suspended` for banned/suspended).
- **Watch Rooms** management (`/admin/rooms`) — rooms derived from TMDb, **real
  report counts**, stats, status donut, top shows, recent activity. Actions
  (Feature/Pin/Lock/Archive/Delete-Restore) are **real**, persisted to
  `room_states`.
- **Admin ⇄ User view** switcher; sidebar grouped nav.
- Action menus are **anchored dropdowns** at the `⋯` button (no dimmed backdrop),
  rendered via portal so tables don't clip them.

### User-facing watch rooms (this session's big build)
- **Episode chat room** (`/title/[id]/season/[s]/episode/[e]`): 3-pane layout —
  left **episode navigator** (current room + clickable episode list with
  watched/current/locked states), center **real-time chat**, right rail (Room
  Info + Spoiler Protection legend + clickable Room Members). Plus tabs, safe-zone
  banner, pinned mod message, bottom bar (online + Top Chatters + Room Rules).
- **Real persisted chat**: posts save to Supabase, spoiler-tagged; per-message
  hiding with **Reveal Spoiler** / **Report Spoiler**; hearts + reports persist;
  composer forces the episode tag + spoiler-scope selector.
- **Locked gate**: chat is gated until the viewer clicks **Mark as watched**
  (or Show anyway), which unlocks the conversation and saves progress.
- **Movie rooms** (`/title/[id]/room`): one spoiler-safe chat per film; Safe /
  Spoiler tagging; entry via a "Enter the Watchruum" card on movie title pages and
  from room cards. Data layer generalized in `getRoomFeed` (nullable
  season/episode).
- **Public profiles** (`/u/[username]`): avatar, bio, favorite genres, stat tiles,
  recent reviews. Members and chat authors link here.
- **Profile privacy**: Settings → Privacy toggle (`is_private`, persisted). Private
  profiles show a restricted "This profile is private" card to everyone but the
  owner; basic identity (name/avatar) still appears in chat/member lists.

### Discover / Explore
- **Filter chips now actually filter** (`/explore`): TV Shows, Movies, New,
  Most Active (rating proxy), Spoiler-Safe, Trending. Filter lives in the URL and
  works alongside search.

---

## 6. Key files map

- `src/lib/spoiler.ts` — spoiler engine + standard scale.
- `src/lib/queries.ts` — `getRoomFeed`, `getTrendingRooms`, reviews, user library.
- `src/lib/admin.ts` — all admin data (overview, users, rooms, reports).
- `src/lib/tmdb.ts` — TMDb client. `src/lib/utils.ts` — `cn`, `timeAgo`, `compact`,
  `posterGradient`.
- `src/app/actions.ts` — user server actions (watch/rate/comment/review/react/
  privacy). `src/app/admin-actions.ts` — admin server actions (reports, roles,
  status, notes, warnings, `setRoomFlags`).
- `src/components/room/` — `room-chat.tsx`, `episode-nav.tsx`, `room-rail.tsx`,
  `spoiler-standard.tsx`.
- `src/components/admin/` — sidebar, topbar, charts, `user-actions-menu.tsx`,
  `room-actions-menu.tsx`, user-detail forms.
- Pages: `src/app/(main)/…` (title, season, episode, room, u/[username], explore,
  settings, rooms, profile, etc.) and `src/app/admin/…`.
- Now-unused (safe to delete): `src/components/room/episode-room.tsx`,
  `episode-picker.tsx` (replaced by the new room).

---

## 7. Environment / keys (in `.env.local` — browser-safe ones only)

- `NEXT_PUBLIC_SUPABASE_URL` = https://jmjktypvuyvzmeifsqac.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (publishable key, set)
- `TMDB_API_KEY` = (set)
- `SUPABASE_SERVICE_ROLE_KEY` = kept **private** (only for local `npm run seed`);
  never committed. Force Logout / Delete Account are surfaced as manual Supabase
  dashboard links because they require this key.

---

## 8. Not yet done / next candidates

- **Reply threading** in chat (Reply button is a placeholder).
- Wire the **Discussion / Polls / Media** room tabs (Chat-only today).
- **Follow/unfollow** real + activity feed + notifications (still partly mock).
- Real **"Most Active"** sort once rooms accumulate message counts (rating proxy
  for now).
- Privacy could later allow **followers** to see details (currently owner-only).

### Production hardening (do before public launch)
1. Add the Vercel URL to Supabase → Auth → URL Configuration (email/OAuth flows).
2. Re-enable email confirmation.
3. Set `NEXT_PUBLIC_SITE_URL` to the Vercel domain.
4. Optionally make the GitHub repo private.

---

## 9. Guardrails observed (keep following)

- User pastes all secrets (OAuth Client Secret, API keys) — Claude never sees them.
- Claude does not accept Terms/legal agreements on the user's behalf.
- Deleting credentials / OAuth clients / changing security settings is user-driven.
- Deletes on the user's machine aren't possible via the bridge — move to a
  `_to_delete/` folder and let the user delete.

_Last updated: end of the room-building + profile-privacy session._
