# Watchruum — Engineering Changelog

Commit-anchored work log. Each entry names the commit so you can run
`git show <hash>` for the exact diff — this log explains **intent, order, and
gotchas**, not line-by-line code. For current architecture/state see
`WATCHRUUM_HANDOFF.md`.

Repo: `carnelforeman-AI/watchruum` · deploys to Vercel (`watchruum.vercel.app`)
on every push to `main`.

---

## 2026-07-09

Big session: built the user-facing watch rooms (TV + movies), public profiles,
profile privacy, Discover filtering, profile/logout menus, a security pass, and
fixed a schema bug that was silently breaking reviews, room-chat authors, and
reports. Also finished the admin Watch Rooms management page.

### Database migrations run today
Run in the Supabase SQL editor (project ref `jmjktypvuyvzmeifsqac`). Dependency
order matters — **run top to bottom** on a fresh DB:

| Order | File | Adds | Run today |
|------:|------|------|:---------:|
| 1 | `supabase/schema.sql` | base tables, RLS, signup trigger | pre-existing |
| 2 | `supabase/moderation.sql` | `is_admin()`, `profiles.status/status_reason/status_updated_at`, `admin_notes`, `user_warnings` | ✅ |
| 3 | `supabase/rooms.sql` | `room_states` (admin room overrides) — needs `is_admin()` | ✅ |
| 4 | `supabase/privacy.sql` | `profiles.is_private` | ✅ |
| 5 | `supabase/relationships.sql` | FKs from `reviews`/`comments`/`reports` → `profiles` | ✅ |

`relationships.sql` was the critical fix (see the report/review bug below). All
files are committed to the repo even though they run against the DB, not in the
build.

### Commits (chronological)

**`1b553bd` — Add admin Watch Rooms management page with wired room actions**
Admin `/admin/rooms`: rooms derived from real TMDb titles (movies = 1 room; TV =
1 show room + per-episode rooms), with **real report counts** per title, stats,
status donut, top-shows bars, recent activity. Feature/Pin/Lock/Archive/
Delete-Restore actions are real and persist to the new `room_states` table
(`rooms.sql`). Files: `src/lib/admin.ts`, `src/app/admin-actions.ts`,
`src/components/admin/room-actions-menu.tsx`, `src/app/admin/rooms/page.tsx`,
`supabase/rooms.sql`. Verify: build green; actions persist across refresh.

**`ebc1e86` — Add spoiler-safe episode chat room + navigator + members + public profiles**
The core user-facing room at `/title/[id]/season/[s]/episode/[e]`: 3-pane layout
(episode navigator · real chat · room info + spoiler legend + members),
real persisted messages via `postComment`, per-message spoiler hide/reveal/
report/react, and the shared spoiler standard (`SPOILER_LEVELS` in
`spoiler.ts`). New public profile route `/u/[username]`. Data: `getRoomFeed` in
`src/lib/queries.ts`. Key files: `src/components/room/*`, `src/lib/spoiler.ts`.
Verify: build green; route registered.

**`246f0c6` — Gate episode chat until "Mark Watched" unlocks it**
Replaced the confusing banner+bar combo with a single "Discussion is locked"
gate; clicking **Mark as watched** unlocks the full chat and saves progress.
File: `src/components/room/room-chat.tsx`.

**`54b01c0` — Make Discover filter chips actually filter results**
The `/explore` chips were cosmetic (local highlight only). Now they filter via a
URL param (`?filter=`) so results respond, the state is shareable, and it works
with search. Files: `src/components/media/explore-search.tsx`,
`src/app/(main)/explore/page.tsx`. Note: "Most Active" is a rating proxy until
real room-activity metrics exist.

**`07625a6` — Add movie watch rooms (one spoiler-safe chat per film)**
Movies had no room. Added `/title/[id]/room` (single chat, Safe/Spoiler tagging,
mark-watched gate) with an "Enter the Watchruum" entry on movie title pages and
routing from room cards. Generalized `getRoomFeed` for nullable season/episode.
Files: `src/lib/queries.ts`, `src/components/room/*`, `src/app/(main)/title/[id]/room/page.tsx`,
`src/app/(main)/title/[id]/page.tsx`, `src/components/feed/room-card.tsx`.

**`0b950f7` — Add profile privacy toggle and restricted profile view**
Settings → Privacy toggle persists `is_private` (`privacy.sql`). Private profiles
show a minimal "This profile is private" card to others; owner sees full.
Files: `supabase/privacy.sql`, `src/app/actions.ts` (`setProfilePrivacy`),
`src/app/(main)/settings/page.tsx`, `src/components/settings/settings-panel.tsx`,
`src/app/(main)/u/[username]/page.tsx`.

**`a6d7b04` — Harden against injection: sanitize search, cap content, security headers**
Audit found no XSS sinks (React auto-escapes; no `dangerouslySetInnerHTML`/
`eval`). Fixed the one real hole: admin search interpolated raw input into a
PostgREST `.or()` filter → added `sanitizeSearch()`. Added server-side length
caps on comments/reviews/reports + score clamp. Added security headers in
`next.config.ts` (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy,
CSP object-src/base-uri/frame-ancestors/form-action). **Decision:** CSP does not
restrict `script-src`/`style-src` — a strict script policy needs per-request
nonces and would risk breaking Next hydration / Tailwind / Google OAuth, for
little gain given there are no XSS sinks. Files: `src/lib/admin.ts`,
`src/app/actions.ts`, `next.config.ts`.

**`3f92611` — Add profile dropdown menus with log out at header and sidebar**
Both the top-right avatar and the bottom-left sidebar chip now open the same
profile dropdown (View Profile, Watchlist, Settings, admin-only Switch to Admin
View, **Log out**). Files: `src/components/layout/profile-menu.tsx` (new),
`topbar.tsx`, `sidebar.tsx`, `src/app/(main)/layout.tsx`.

**`dfe22ba` — Fix report inserts and make title pages show reviews live**
First pass at the "report didn't show up" bug: `reportContent` now rejects
non-UUID (sample) ids and un-authed calls instead of silently returning success;
the Report button awaits the result and only confirms on real success; title
page marked `force-dynamic`. Files: `src/app/actions.ts`,
`src/app/(main)/title/[id]/page.tsx`, `src/components/review/reviews-section.tsx`.
(Necessary but not the root cause — see next.)

**`7d3ead3` — Point reports reporter embed at profiles FK** + `relationships.sql`
**Root cause found (diagnosed against the live DB):** `reviews.user_id`,
`comments.user_id`, `reports.reporter_id` reference `auth.users`, not
`profiles`. So every query embedding `author:profiles(...)` failed with
`PGRST200` ("could not find a relationship") and returned **empty** — which is
why the real review showed "No reviews yet" and reports appeared to vanish.
Fix: `relationships.sql` adds FKs to `profiles(id)` (the 1:1 mirror of
auth.users), resolving the embeds for reviews, comments, room-chat authors, and
reports at once. `admin.ts` reporter embeds repointed to the new FK
(`reports_reporter_id_profiles_fkey`). Verify (done live): REST embed went
`400 PGRST200` → `200 OK` with author; a live report inserted a real `reports`
row (`target_type=review, status=open, reporter=Ctrader247`); Backrooms review
now displays.

### Key decisions & gotchas (read before touching these areas)
- **profiles FK embeds** — any new query that does `author:profiles(...)` /
  `reporter:profiles(...)` needs an FK from that table's user column to
  `public.profiles(id)`. Referencing only `auth.users` will make the whole query
  return empty (PGRST200). Add the FK in a migration.
- **Rooms are derived, not stored** — the "room" for messages is the key
  `(media_id, season_number, episode_number)`; movies use null/null. TV =
  1 show room + per-episode rooms; movie = 1 room. Admin overrides live in
  `room_states`, keyed by a derived id (`show_1399`, `ep_1399_s1e4`, `mov_27205`).
- **Spoiler standard** — one source of truth in `spoiler.ts` (`SPOILER_LEVELS`,
  `evaluateSpoiler`, `spoilerMeta`) drives the legend, per-post tags, and gating
  everywhere. Don't hardcode spoiler colors/labels elsewhere.
- **Security posture** — CSP is intentionally permissive on scripts/styles; the
  real XSS defense is React escaping. Don't add `dangerouslySetInnerHTML` without
  sanitizing.
- **Repo location** — the git repo is the **nested** `…/Watchruum/watchruum/`
  folder; an outer duplicate was deleted, don't recreate it.

### Known follow-ups (not done today)
- Reply threading in chat (Reply button is a placeholder).
- Wire the Discussion / Polls / Media room tabs (Chat-only today).
- Real follow/unfollow + activity feed + notifications.
- Real "Most Active" sort once rooms accumulate message counts.
- Privacy could later allow followers (currently owner-only).
- Production hardening: Supabase Auth URL config, re-enable email confirmation,
  set `NEXT_PUBLIC_SITE_URL`.

---

_Maintenance: add a new dated section per working session; one entry per commit
with hash, what, why, files, and how it was verified. Record every DB migration
in the ledger with its run status and dependency order._
