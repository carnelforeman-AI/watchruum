# Watchruum — Build Handoff Log

Spoiler-safe social app for TV & movie fans. Users join rooms for shows, movies,
seasons and episodes and discuss what they've actually watched — spoilers beyond
a person's progress are hidden by default. **Not** a streaming app: no playback,
no copyrighted posters (procedural gradient/TMDb art only).

**Live** on GitHub + Vercel + Supabase. Tagline: *"Never get spoiled again."*

> This file is the **architecture/state** snapshot ("how the app fits together
> today"). For the chronological, per-change log see **`CHANGELOG.md`**. For the
> launch to-do list see **`PRELAUNCH_CHECKLIST.md`**.

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
`package.json`, `.env.local`). An outer duplicate was cleaned up and deleted; do
not recreate it.

### Iteration workflow (how changes ship)
Claude edits files in its cloud workspace → delivers them to the local repo via the
desktop bridge → **user runs** `git add . && git commit -m "..." && git push` →
Vercel auto-deploys (~35s build). The user runs **all** git commands and **all**
Supabase SQL migrations, and pastes **all** secrets themselves. CRLF/LF warnings on
`git add` are harmless.

---

## 2. Tech stack & conventions

- **Next.js 16** (App Router, Turbopack). Breaking changes vs. older Next — see
  repo `AGENTS.md`. Key points: `params` and `searchParams` are **Promises**
  (`await` them); route groups `(main)` / `(auth)`; `export const dynamic =
  "force-dynamic"` on data pages; middleware is `proxy.ts`.
- **React 19**, TypeScript, **Tailwind CSS v4** (`@theme` in `globals.css`).
  Custom utilities: `glass`, `glass-hover`, `brand-gradient`, `no-scrollbar`,
  `panel`. Color tokens: `text-foreground`, `text-muted`, `text-muted-2`,
  `text-safe`, `text-warn`, `text-danger`, `text-accent`, `text-accent-2`,
  `text-primary`, `primary-strong`, `border-border`, `bg-bg-elevated`, `bg-panel`.
- **Supabase** via `@supabase/ssr` (browser client `src/lib/supabase/client.ts` +
  server client `src/lib/supabase/server.ts`, both guarded by
  `isSupabaseConfigured`). RLS everywhere. `is_admin()` SECURITY DEFINER function
  avoids RLS recursion. A **service-role** client (`src/lib/supabase/service.ts`)
  exists for cron/admin jobs, `null` until `SUPABASE_SERVICE_ROLE_KEY` is set.
- **Supabase Realtime** is in use (first added for DMs): `postgres_changes`
  subscriptions for direct messages, and **presence** channels for "who's in a
  room." Realtime honors RLS.
- Hand-built shadcn-style UI primitives in `src/components/ui/` (Button, Badge,
  Avatar, Card, Input/Textarea, Progress).
- Dependency-free inline-SVG charts (`src/components/admin/charts.tsx`).
- **Client ↔ server split rule** (learned the hard way): never import a *runtime
  value* from the server-only `src/lib/queries.ts` (it pulls `next/headers`) into a
  client component — it drags the server module into the client bundle and fails
  the Turbopack build. Type-only imports are fine. Put shared client-safe helpers
  in their own module (e.g. `src/lib/notif-link.ts`, `src/lib/genres.ts`).

---

## 3. Database — schema & migrations

Base schema is `supabase/schema.sql` (profiles, media_items, seasons, episodes,
watch_status, episode_watches, ratings, reviews, comments, follows, reactions,
notifications, reports + RLS + signup trigger).

**All migrations live in `supabase/*.sql` and are run by the user in the Supabase
SQL editor.** The **full, ordered ledger** is in `CHANGELOG.md` (per session). Run
them in dependency order on a fresh DB — `schema.sql` first, `moderation.sql`
before `rooms.sql` (needs `is_admin()`), everything else after. Current set:

| File | Adds |
|------|------|
| `schema.sql` | base tables, RLS, signup trigger |
| `moderation.sql` | `is_admin()`, `profiles.status/...`, `admin_notes`, `user_warnings` |
| `moderator.sql` / `moderator_role.sql` | moderator role + powers |
| `rooms.sql` | `room_states` (admin room overrides) |
| `privacy.sql` | `profiles.is_private` |
| `relationships.sql` | FKs from `reviews`/`comments`/`reports` → `profiles` |
| `avatars.sql`, `review-images.sql`, `person-comments.sql`, `person-comment-images.sql` | image/upload + person-page support |
| `invites.sql`, `translations.sql`, `watch_calendar.sql`, `app-settings.sql`, `user_messages.sql`, `reset-beta-data.sql` | invites, i18n, calendar, Go-Live settings, admin→member inbox, beta reset |
| `release-alerts.sql` | `title_alerts.notified_at` (release-notification dedup) |
| `direct-messages.sql` | `direct_messages` + RLS + `mark_conversation_read()` + Realtime publication + `replica identity full` |
| `presence.sql` | `profiles.show_activity` (broadcast-my-room privacy switch) |
| `room-tabs.sql` | `room_threads`, `room_thread_replies`, `room_polls`, `room_poll_votes`, `room_media` (+RLS) — Discussion/Polls/Media tabs |
| `preferences.sql` | `profiles.spoiler_safety` + `notify_replies/likes/unlocks/trending` |

### `profiles` columns worth knowing
`id, username, display_name, avatar_url, bio, favorite_genres[], preferred_language,
is_admin, is_moderator, onboarded, status(+reason/updated_at), is_private,
show_activity, spoiler_safety, notify_replies, notify_likes, notify_unlocks,
notify_trending, created_at`.

### Room data model (important)
Rooms are **not** a stored table — they're derived from TMDb titles. The "room key"
for messages/threads/polls/media is `(media_id, season_number, episode_number)`:
- **TV show** → one main show room + one room per episode.
- **Movie** → one room (season/episode stored as `null`).
`room_states` stores admin overrides keyed by a derived room id
(e.g. `show_1399`, `ep_1399_s1e4`, `mov_27205`).

### FK-embed rule (recurring gotcha)
Any query that embeds `author:profiles(...)` needs an FK from that table's user
column to `public.profiles(id)` — referencing only `auth.users` returns empty
(PGRST200). **Newer user-owned tables reference `profiles(id)` directly for
`user_id`** (room-tabs, direct_messages via the pattern) to get embeds for free.
Reuse that for any new user-owned table.

---

## 4. Spoiler system (the core promise)

`src/lib/spoiler.ts` is the single source of truth. `evaluateSpoiler(content,
progress, isMovie)` returns `safe | episode | season | series | locked`.
`SPOILER_LEVELS` + `spoilerMeta` define the standard colors/labels used
**everywhere** (legend, per-post tags, badges, **Discussion threads**). Reusable UI
in `src/components/room/spoiler-standard.tsx` (`SpoilerLegend`, `SpoilerTag`,
`SafeZonePill`).

Standard scale: **Safe Zone** (green) · **Episode Spoilers** (yellow) · **Season
Spoilers** (orange) · **Full Series Spoilers** (red) · **Locked** (purple).

Users also have a persisted **spoiler-safety preference** (`profiles.spoiler_safety`
= strict/balanced/off), set in Settings and shown on their profile. (Note: the
selector is persisted, but the app doesn't yet vary blur/hide behavior by level —
gating is always the strict comparison for now.)

---

## 5. Features built (high level; see `CHANGELOG.md` for the per-change log)

### Foundation
- Full MVP UI, spoiler engine, TMDb search/detail/season/episode pages.
- Auth + onboarding; watch/rate/comment/review/react server actions
  (`src/app/actions.ts`). Procedural cinematic posters (no copyrighted art).
- Home dashboard wired to real Supabase user data; logged-out visitors get sample
  data; empty states throughout.

### Auth, admin, moderation
- Split-screen login, Google OAuth, "Watchruum" wordmark.
- Full **admin console** (`/admin`): overview, reports queue, users management +
  14-action moderation menu, Watch Rooms management (real, persisted to
  `room_states`), admin⇄user view switch. Separate **moderator** view.

### User-facing watch rooms
- **Episode room** (`/title/[id]/season/[s]/episode/[e]`) and **movie room**
  (`/title/[id]/room`): real persisted chat, spoiler tagging + per-message
  hide/reveal/report, mark-watched gate, member rails, top chatters.
- **Room activity tabs** (2026-07-12) — the five tabs are now real spaces, not dead
  spans, via `RoomTabs` (`src/components/room/room-tabs.tsx`):
  - **Chat** — the existing live chat (stays mounted across tab switches).
  - **Discussion** — Reddit-style threads + replies, spoiler-gated.
  - **Polls** — create + vote (one vote/user, live bars).
  - **Media** — official trailers/links + uploaded images/memes, spoiler blur,
    copyright-ack gate.
  - **About** — derived room info, rules, moderation, where-to-watch, report.
  Backends: `supabase/room-tabs.sql`, fetchers `src/lib/room-tabs.ts`, actions
  `src/app/room-actions.ts`, panels `src/components/room/{discussion,polls,media,about}-panel.tsx`.

### Profiles
- **Public profiles** (`/u/[username]`); **profile privacy** (`is_private`).
- **Profile wired to real data** (2026-07-12): stats (Rooms/Reviews/Ratings/Badges),
  earned **badges**, bio, genres, and the user's own recent reviews all come from
  `getProfileOverview()` in `queries.ts` (`earnedBadges()` computes badges from real
  counts). **Editable favorite genres** via `src/components/profile/genre-editor.tsx`
  (+ `setFavoriteGenres`, shared list `src/lib/genres.ts`).

### Social — friends, presence, DMs
- **Friends hub** (`/friends`) + right-rail **Friends panel** (Online + Recent
  Activity) with per-item alert bells. Data: `src/lib/friends.ts`.
- **Live room presence** (2026-07-12): Supabase Realtime presence — friends see
  which room you're in, gated by the **"Show my current room"** toggle
  (`profiles.show_activity`, source-enforced). `<RoomPresence>` broadcasts;
  `useFriendsPresence` observes. The seeded "Friends Online" list is the fallback
  when no followed friend is actually in a room.
- **Direct messages**: a **docked, collapsible, non-modal** DM window
  (`src/components/friends/message-window.tsx`) with a **real backend**
  (`direct_messages` + Realtime + read receipts via `mark_conversation_read()`),
  hook `src/lib/use-direct-messages.ts`. LIVE mode with a real recipient; DEMO
  (seeded, session-only) otherwise. Photo-only attachments (downscaled).

### Notifications
- **Release-alert engine**: daily cron (`/api/cron/release-alerts`,
  `dispatchReleaseAlerts`) creates real in-app notifications for titles releasing
  today; email/SMS adapters are dormant until keys exist.
- **Notifications route to the action** (2026-07-12): `notificationHref()` in
  `src/lib/notif-link.ts` deep-links each notification to where it happened
  (review `#reviews`, room `#rooms`, profile, or the detail view for system notices).
- **Settings preferences persisted** (2026-07-12): spoiler-safety + notification
  toggles save to `profiles` (`setSpoilerSafety`, `setNotificationPrefs`). *The
  notification-creation code doesn't yet **read** the toggles — see checklist.*

### Discover / Explore
- `/explore` filter chips actually filter (URL-driven), alongside search.

---

## 6. Key files map

- `src/lib/spoiler.ts` — spoiler engine + standard scale.
- `src/lib/queries.ts` — `getRoomFeed`, `getTrendingRooms`, reviews, user library,
  inbox/notifications (seeded), **`getProfileOverview` + `earnedBadges`**. **Server-only.**
- `src/lib/room-tabs.ts` — Discussion/Polls/Media fetchers (server-only).
- `src/lib/friends.ts` — friends hub data. `src/lib/notif-link.ts` — client-safe
  `notificationHref`. `src/lib/genres.ts` — shared `GENRES` list.
- `src/lib/use-direct-messages.ts`, `src/lib/use-presence.ts` — client Realtime hooks.
- `src/lib/notify/` — `dispatch.ts`, `providers.ts` (email/SMS adapters).
- `src/lib/admin.ts` — admin data. `src/lib/tmdb.ts` — TMDb. `src/lib/utils.ts`.
- `src/app/actions.ts` — user actions (watch/rate/comment/review/react, privacy,
  show-activity, favorite-genres, spoiler-safety, notification-prefs).
  `src/app/room-actions.ts` — thread/poll/media actions.
  `src/app/admin-actions.ts` — admin actions.
- `src/components/room/` — `room-chat.tsx`, `episode-nav.tsx`, `room-rail.tsx`,
  `room-presence.tsx`, `room-tabs.tsx`, `{discussion,polls,media,about}-panel.tsx`,
  `spoiler-standard.tsx`.
- `src/components/friends/` — `message-window.tsx`, `friends-hub.tsx`,
  `friends-directory.tsx`. `src/components/layout/` — `friends-rail-panel.tsx`,
  `right-rail.tsx`, `inbox-menus.tsx`, sidebar/topbar.
- `src/components/profile/` — `genre-editor.tsx`, `avatar-uploader.tsx`.
- `src/components/settings/settings-panel.tsx`, `src/components/inbox/*`.
- Pages under `src/app/(main)/…` and `src/app/admin/…`; cron at
  `src/app/api/cron/release-alerts/route.ts`; `vercel.json` holds the cron schedule.

---

## 7. Environment / keys (in `.env.local` — browser-safe ones only)

- `NEXT_PUBLIC_SUPABASE_URL` = https://jmjktypvuyvzmeifsqac.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (publishable key, set)
- `TMDB_API_KEY` = (set)
- `SUPABASE_SERVICE_ROLE_KEY` = kept **private** — enables the notification engine
  (in-app notifications) + admin service tasks. Not set in prod yet.
- `CRON_SECRET` = protects the release-alert cron route. Set in Vercel to arm it.
- `RESEND_API_KEY` / `TWILIO_*` = later, to activate email/SMS notifications.
- All secrets are entered by the user; Claude never sees them.

---

## 8. Not yet done / next candidates

- ~~Wire the Discussion / Polls / Media room tabs.~~ **Done 2026-07-12.**
- **Realtime for the room tabs** — Discussion/Polls/Media fetch on load; they don't
  live-update yet (refresh to see others' new threads/votes).
- **Notifications must respect the persisted prefs** — toggles save but nothing
  reads them yet; wire when the notification feed becomes real.
- **Tighten the badge system** — persisted achievements table, finalize thresholds,
  fix "Finale Survivor" for TV series, re-signal "Spoiler Guardian" off
  `spoiler_safety`. (See `PRELAUNCH_CHECKLIST.md`.)
- **Reply threading** in chat (Reply button is a placeholder).
- **DM inbox / conversation list**; move DM + room-media images to a Supabase
  **Storage bucket** (currently inline downscaled data URLs).
- **Realtime Authorization** / private presence channels for true friend-only
  visibility; presence "away"/idle heartbeat.
- Room-tab **moderation UI** (authors can delete own rows via RLS; no mod UI yet).
- Real **"Most Active"** sort once rooms accumulate message counts.
- **Store/launch blockers** — see `PRELAUNCH_CHECKLIST.md` (privacy policy, terms,
  account deletion, TMDb attribution, block feature, Sign in with Apple, packaging).

### Production hardening (do before public launch)
1. Add the real domain to Supabase → Auth → URL Configuration.
2. Re-enable email confirmation.
3. Set `NEXT_PUBLIC_SITE_URL`; set `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` in Vercel.
4. Optionally make the GitHub repo private.

---

## 9. Guardrails observed (keep following)

- User pastes all secrets (OAuth Client Secret, API keys, `CRON_SECRET`,
  `SUPABASE_SERVICE_ROLE_KEY`) — Claude never sees them.
- User runs **all** SQL migrations and **all** git commands.
- Claude does not accept Terms/legal agreements on the user's behalf.
- Deleting credentials / OAuth clients / changing security settings is user-driven.
- Deletes on the user's machine aren't possible via the bridge — move to a
  `_to_delete/` folder and let the user delete.
- No copyrighted posters/media; TMDb art via the API, procedural gradients otherwise.

_Last updated: 2026-07-12 (settings-preferences session). Keep this in sync with
`CHANGELOG.md` on each change._
