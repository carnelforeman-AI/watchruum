# Watchruum — Engineering Changelog

Commit-anchored work log. Each entry names the commit so you can run
`git show <hash>` for the exact diff — this log explains **intent, order, and
gotchas**, not line-by-line code. For current architecture/state see
`WATCHRUUM_HANDOFF.md`.

Repo: `carnelforeman-AI/watchruum` · deploys to Vercel (`watchruum.vercel.app`)
on every push to `main`.

> **How to reproduce from this log:** this file gives the *order, intent, files,
> migrations, and gotchas* — not literal code. To rebuild exactly, pair it with
> (a) the migration SQL files in `supabase/*.sql` (run in the order of the
> ledgers below) and (b) the git diffs (`git show <hash>` / `git log -p`). The
> log alone is the roadmap; the repo's commits + SQL are the source of truth.

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
  return empty (PGRST200). Add the FK in a migration. (Newer tables sidestep this
  by referencing `profiles(id)` directly for `user_id` — see 2026-07-12.)
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
- ~~Wire the Discussion / Polls / Media room tabs (Chat-only today).~~ **Done 2026-07-12.**
- Real follow/unfollow + activity feed + notifications.
- Real "Most Active" sort once rooms accumulate message counts.
- Privacy could later allow followers (currently owner-only).
- Production hardening: Supabase Auth URL config, re-enable email confirmation,
  set `NEXT_PUBLIC_SITE_URL`.

---

## 2026-07-11

Social + notifications session: built the release-alert notification engine
(in-app real; email/SMS dormant), the Friends hub + right-rail Friends panel
with per-item alert bells, a direct-message ("Message") window on the Friends
panel, and then the **real DM backend** behind it (persistence + Realtime +
read receipts). The user commits/pushes their own git, so hashes below are
marked _(pending push)_ — fill them in from `git log` after pushing, or run
`git show <hash>` once known.

### Database migrations (run in Supabase SQL editor when going live)
| File | Adds | Status |
|------|------|:------:|
| `supabase/release-alerts.sql` | `title_alerts.notified_at` (dedup guard so a subscriber is notified once per release) | run before the cron fires against real data |
| `supabase/direct-messages.sql` | `direct_messages` table + RLS + `mark_conversation_read()` SECURITY DEFINER + Realtime publication + `replica identity full` | run to enable live DMs |

### Work (chronological)

**Release-alert notification engine — _(pending push)_**
Daily cron finds every "Notify Me" subscription for a title releasing today and
delivers a **real in-app notification** to each subscriber — works with zero
third parties. Email/SMS are attempted only when their providers are configured,
otherwise skipped cleanly (engine stays dormant until keys exist). Files:
`supabase/release-alerts.sql`, `src/lib/supabase/service.ts` (`createServiceClient`,
null until `SUPABASE_SERVICE_ROLE_KEY`), `src/lib/notify/providers.ts`
(`sendEmail`/`sendSms` inert until `RESEND_API_KEY` / `TWILIO_*`),
`src/lib/notify/dispatch.ts` (`dispatchReleaseAlerts`),
`src/app/api/cron/release-alerts/route.ts` (GET/POST, `CRON_SECRET`-protected),
`vercel.json` (cron `0 14 * * *`). **Decision:** build the engine now, wire email
+ SMS providers later — the user sets all secrets themselves. SMS path is a
deliberate no-op until phone-number collection exists on profiles.

**Friends hub page + right-rail Friends panel — _(pending push)_**
New Friends hub (`getFriendsHub` in `src/lib/friends.ts`,
`src/components/friends/friends-hub.tsx`, `friends-directory.tsx` with an
`embedded` prop). Right-rail combined Friends panel (Online 65% / Recent
Activity 35%) in `src/components/layout/friends-rail-panel.tsx`, rendered by
`src/components/layout/right-rail.tsx`. Per-item alert bells added to Recent
Activity rows; the message affordance uses `MessageSquare`. "View all" opens the hub.

**Direct-message ("Message") window — _(pending push)_**
`src/components/friends/message-window.tsx`: a DM window styled to the mockup.
Composer has an emoji picker, a "GIF" sticker button, and a purple **"+"** that
attaches **photos only**. Header links to `/u/${username}`. **Join Room** wires
to the friend's current room via `roomHref`. (Later docked to the bottom-right
as a collapsible, non-blur widget — 2026-07-12.)

**Real DM backend + live read receipts — _(pending push)_**
Turned the DM window from front-end-only into a real feature. New
`supabase/direct-messages.sql`: symmetric `direct_messages` table
(sender/recipient/body/image_url/sticker/read_at), RLS (both participants read,
sender inserts), and a `mark_conversation_read(other)` **SECURITY DEFINER**
function — read-marking goes through the function (no table UPDATE policy) so a
recipient can't tamper with a received message's body/sender. Table added to the
`supabase_realtime` publication with `replica identity full`. New client hook
`src/lib/use-direct-messages.ts` loads history, subscribes to Realtime INSERT +
UPDATE, and calls `mark_conversation_read` on open — that UPDATE flips the
sender's checkmarks. `message-window.tsx` has **two modes**: LIVE (real
`recipientId`, signed in, configured) vs DEMO (seeded local). Images downscaled
to ≤1024px JPEG before send. **First Realtime usage in the app.**

### Key decisions & gotchas
- **DM window has two modes** — LIVE with a real `recipientId`; else DEMO
  (seeded, session-only). Seeded rail friends were mock until presence landed
  (2026-07-12) and now supply real `userId`s.
- **Read receipts require the function** — marking-read runs through
  `mark_conversation_read()` (SECURITY DEFINER), not a table UPDATE policy.
- **Realtime needs the migration** — run `direct-messages.sql` or live mode stays
  in loading/demo. Realtime honors RLS.
- **Images kept small on purpose** — downscaled client-side to fit Realtime
  payload limits. Supabase Storage bucket is the production upgrade.
- **Notification engine is dormant by design** — no `SUPABASE_SERVICE_ROLE_KEY` →
  no-op. In-app works once the key is set; email/SMS need their own keys.
- **Attachments are photos only** — enforced twice (accept filter + runtime type
  guard).

### Known follow-ups
- Conversation list / inbox — no "all my DMs" view yet.
- Move DM images to a Supabase Storage bucket.
- Real GIF search would need a Giphy/Tenor key.
- Phone-number collection on profiles to activate the SMS path.
- Set `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, and later `RESEND_API_KEY` /
  `TWILIO_*` in Vercel to bring the notification engine fully live.

---

## 2026-07-12

Big polish + real-data session: notifications route to where the action
happened; friends can see which room you're in (Realtime presence + privacy
toggle); the DM window became a docked collapsible widget; the **room activity
tabs went from dead spans to five real spaces** (Chat / Discussion / Polls /
Media / About); the **profile was wired to real data** (stats, badges, bio,
genres, reviews) with **editable genres**; and **Settings preferences**
(spoiler-safety + notification toggles) now persist. Hashes _(pending push)_.

### Database migrations (run in Supabase SQL editor)
| File | Adds | Status |
|------|------|:------:|
| `supabase/presence.sql` | `profiles.show_activity boolean default true` (per-user switch for broadcasting your current room) | run to enable the Settings toggle; presence works without it (defaults on) |
| `supabase/room-tabs.sql` | `room_threads`, `room_thread_replies`, `room_polls`, `room_poll_votes`, `room_media` + RLS. Powers the Discussion / Polls / Media tabs | run to enable those tabs (they show empty states until run) |
| `supabase/preferences.sql` | `profiles.spoiler_safety` (checked strict/balanced/off) + `notify_replies/likes/unlocks/trending` booleans | run so Settings toggles persist + the profile shows the real spoiler-safety level |

### Work (chronological)

**Notifications route to the action — _(pending push)_**
Each notification deep-links to where it happened. `queries.ts` seeded `href`s
got type anchors (likes/reactions/reviews → `#reviews`; replies/mentions/invites/
episode/poll → `#rooms`; follow → profile). New `src/lib/notif-link.ts` exports
`notificationHref(n)`; system notices (report/warning/hidden) open the detail
view. Both render sites route through it; added an `id="reviews"` anchor on the
title page. **Gotcha (build-breaker):** the helper must live in its own module —
importing a *value* from `queries.ts` (pulls `next/headers`) into a client
component drags the server-only module into the client bundle and fails the
Turbopack build. Type-only imports are fine; the value import is the trap.

**Live room presence + privacy toggle — _(pending push)_**
Supabase Realtime **presence** (ephemeral, no table). `supabase/presence.sql`
adds only `profiles.show_activity`. `<RoomPresence>` broadcasts location on both
room pages when `enabled` (signed in **and** `show_activity !== false`) — opting
out is source-enforced. `useFriendsPresence` observes and returns followed
friends in a room; wired home → `right-rail` → `friends-rail-panel` (with a Live
badge). Present rows carry real `userId`s → messaging opens a LIVE DM. Settings
gained a "Show my current room to friends" toggle (`setShowActivity`).

**DM window docked + collapsible — _(pending push)_**
`message-window.tsx` moved from a centered blur-backdrop modal to a **bottom-right
docked widget** (380px; full-width on mobile), **non-modal / no backdrop** so the
app stays clear and usable behind it. Added a **minimize** control (collapses to
the header bar, expand chevron restores) and Escape-to-close; expanding scrolls
to the latest message.

**Room activity tabs — real Discussion / Polls / Media / About — _(pending push)_**
The four tabs were dead `<span>`s (only Chat worked). Now they're a real
`RoomTabs` client shell that switches the center column; Chat stays mounted
(hidden when inactive) so its state survives tab switches; the episode room keeps
its 3-pane layout, the movie room its 2-pane, via optional left/right rail slots.
New `supabase/room-tabs.sql` (5 tables, all keyed by `(media_id, season, episode)`
like comments; **`user_id` references `profiles(id)` directly** so PostgREST
embeds `author:profiles(...)` with no PGRST200 trap; RLS = read-all, insert-own;
poll votes have PK `(poll_id, user_id)` = one vote/user). New fetchers
`src/lib/room-tabs.ts` (`getRoomThreads` with embedded replies, `getRoomPolls`
with tallies + the viewer's vote, `getRoomMedia`) and server actions
`src/app/room-actions.ts` (`createThread`, `postThreadReply`, `createPoll`,
`votePoll` upsert, `addRoomMedia`). Panels: `discussion-panel.tsx` (Reddit-style
threads, spoiler-gated via `evaluateSpoiler`), `polls-panel.tsx` (create + vote,
one vote/user, live bars), `media-panel.tsx` (trailers/links + uploaded images,
YouTube thumbs, per-item spoiler blur, copyright-ack checkbox), `about-panel.tsx`
(fully derived room info + rules + report). Both room pages fetch in the existing
`Promise.all` and render `<RoomTabs>` with chat/rails as slots.

**Profile wired to real data — _(pending push)_**
Profile stats (Rooms/Reviews/Ratings/Badges), badges, bio, favorite genres, and
"recent reviews" were hardcoded/sample. New `getProfileOverview()` in `queries.ts`
returns real counts (reviews/ratings via head-count; **rooms** = distinct room
keys from the viewer's `comments`; episodes from `episode_watches`; completed from
`watch_status.movie_watched`), **badges** computed by `earnedBadges()` from those
counts, and the viewer's own recent reviews. `src/app/(main)/profile/page.tsx`
renders real data when signed in, sample when logged-out; empty states added.
Files: `src/lib/queries.ts`, `src/app/(main)/profile/page.tsx`. Badge thresholds
are default placeholders (see the pre-launch checklist "tighten the badge system").

**Editable favorite genres — _(pending push)_**
Extracted the canonical genre list to `src/lib/genres.ts` (`GENRES`), now shared
by onboarding and the profile. New `src/components/profile/genre-editor.tsx` —
inline chips with an Edit affordance → toggle the full set → Save (optimistic,
revert on failure), persisted by `setFavoriteGenres` (validates against `GENRES`).
Wired into the profile page (editor signed-in, static chips logged-out).
`onboarding-flow.tsx` now imports the shared list.

**Settings preferences persisted (spoiler safety + notifications) — _(pending push)_**
Settings → Spoiler safety selector and Notifications toggles were local-only
React state (reset on refresh). New `supabase/preferences.sql` adds
`profiles.spoiler_safety` (checked strict/balanced/off) + `notify_replies/likes/
unlocks/trending`. New actions `setSpoilerSafety`, `setNotificationPrefs`.
`settings/page.tsx` loads them; `settings-panel.tsx` initializes from props and
persists on change with Saved indicators + revert-on-failure. The profile badge
now shows the **real** spoiler-safety level (`getProfileOverview` returns
`spoiler_safety`; replaced the old hardcoded "Spoiler-safe: strict"). **Caveat:**
prefs now persist but the notification-creation code doesn't *read* them yet —
that lands when the notification feed becomes real (tracked in the checklist).

### Key decisions & gotchas
- **Presence is broadcast; the toggle is the real gate.** Opting out is
  source-enforced (client never broadcasts); friend-scoping is client-side in
  `useFriendsPresence`, so the `presence:rooms` channel is shared, not
  friend-private. True friend-only visibility → Realtime Authorization (future).
- **Broadcaster vs observer never collide** — right-rail (observer) only on the
  home page; `<RoomPresence>` only on room pages.
- **New user-owned tables reference `profiles(id)` for `user_id`** — the clean way
  to get `author:profiles(...)` embeds without the separate FK dance older tables
  needed. Reuse this for new user-owned tables (room-tabs did).
- **Room tabs need the migration** — `room-tabs.sql` must be run or Discussion /
  Polls / Media show empty states (no error; just no rows). Same for
  `preferences.sql` (Settings toggles won't save until the columns exist).
- **Chat stays mounted across tab switches** — `RoomTabs` toggles Chat with a
  `hidden` class (not unmount) so typed text / scroll survive.
- **Profile / Settings client↔server split** — the notif-link build-breaker taught
  the rule: don't import a *runtime value* from the server-only `queries.ts` into a
  client component. `getProfileOverview` is server-only (page is a Server
  Component); the client `genre-editor` / `settings-panel` import only actions and
  the plain `GENRES` const.

### Known follow-ups
- **Notifications don't yet respect the persisted prefs** — the toggles save to
  `profiles.notify_*` but nothing reads them; wire the notification-creation code
  (and `dispatchReleaseAlerts`) to check the flags when the feed becomes real.
- Realtime for the room tabs — Discussion/Polls/Media fetch on load; no live
  update yet (refresh to see others' new threads/votes). Realtime subs are next.
- Room-tab moderation — authors can delete their own rows (RLS); no per-item
  mod report/delete UI.
- Tighten the badge system (persisted achievements table, finalize thresholds,
  fix "Finale Survivor" for TV, re-signal "Spoiler Guardian" off `spoiler_safety`).
- Media images → Supabase Storage bucket (currently inline downscaled data URLs).
- Realtime Authorization / private presence channels; presence "away"/idle.
- Conversation list / inbox for DMs; comment-level notification anchoring.

---

_Maintenance: add a new dated section per working session; one entry per commit
with hash, what, why, files, and how it was verified. Record every DB migration
in the ledger with its run status and dependency order._
