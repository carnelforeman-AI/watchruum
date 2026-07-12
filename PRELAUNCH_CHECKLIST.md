# Watchruum — Pre-Launch / Store-Readiness Checklist

> **READ THIS BEFORE GOING LIVE.** Carnel asked to be reminded of these items
> before public launch / app-store submission. None are permanent blockers —
> they're a finite build + setup list. Grouped by who does what.

_Last updated during the settings-preferences session (2026-07-12)._

---

## 1. Code-side blockers I (Claude) can build

- [ ] **Private-profile DB-level enforcement.** Today privacy is enforced in the
      app layer only (profile page + Find Friends hide bio/genres for private
      users). A determined person hitting the raw Supabase API could still read
      `profiles.bio` / `favorite_genres`. Proper fix = move those sensitive
      columns into an **owner-only table** (`profile_private`) with row-level
      security, since Postgres RLS is row-level not column-level and a view
      breaks the app's embedded `author:profiles(...)` joins. ~½ day + migration.
- [ ] **In-app account deletion** (Apple 5.1.1(v) + Google both require it) —
      plus a **public web deletion URL** anyone can use without the app (Google).
      Deleting `auth.users` needs a SECURITY DEFINER function or service-role call.
- [ ] **Privacy Policy page** (`/privacy`) — required by both stores. None exists.
- [ ] **Terms of Service page** (`/terms`).
- [ ] **User "block" feature** — Apple UGC (1.2) requires users to block abusive
      users in-app (reporting already exists; blocking is the gap).
- [ ] **TMDb attribution** in the footer: "This product uses the TMDb API but is
      not endorsed or certified by TMDb" + TMDb logo (required by TMDb terms).

## 2. Shared — I wire the code, you supply credentials / accounts

- [ ] **Sign in with Apple.** Required on iOS because Google login is offered
      (Apple 4.8). Apple button already in the login UI but disabled. Needs Apple
      Developer credentials configured in Supabase.
- [ ] **Packaging:**
      - Android → **Trusted Web Activity** (Bubblewrap / PWABuilder) — manifest +
        icons already exist, so Android is the closer path.
      - iOS → **Capacitor** wrapper with real native features (push, share, etc.);
        a plain web wrapper gets rejected under Apple 4.2 "minimum functionality."

## 3. You do (store portals / accounts — not code)

- [ ] Developer accounts: **Google Play $25 one-time**, **Apple $99/yr**.
- [ ] Google Play **Data Safety** form + Apple **App Privacy** labels (declare
      email, user content, etc.).
- [ ] **Age rating** questionnaire (UGC discussion → likely Teen / 12+).
- [ ] **Reviewer demo account** (Apple requires working login credentials).

## 4. Product cleanup before launch (from the build handoff)

- [ ] Flip **Go Live** in admin + run **Reset Beta Data** for a true fresh start
      (real 0-based counts everywhere).
- [ ] Convert remaining seeded/demo surfaces to real: home social feed (friend
      activity / discussions / notifications), leaderboard demo data, and the
      seeded **"Friends Online"** rail fallback (real Realtime presence now exists
      and takes over when followed friends are actually in a room — the seeded
      list only shows when nobody's around).
- [ ] **Make notifications respect user preferences.** Settings → Notifications
      toggles (replies / likes / discussion-unlocks / trending) **now persist** to
      `profiles.notify_*` (2026-07-12), but nothing *reads* them yet — the
      notification-creation code must check the relevant flag before inserting a
      row. This lands naturally when the notification feed is converted from
      seeded to real (see the bullet above). The release-alert engine
      (`dispatchReleaseAlerts`) should also gate on the trending/release flag.
- [ ] **Tighten the badge system.** Badges are now earned from real activity
      counts, but the engine is lightweight — rules live in `earnedBadges()` in
      `src/lib/queries.ts` and are computed live on each profile load (no
      persistence). To harden:
      - Confirm / finalize the thresholds (current defaults: Binge Master 20 eps,
        Critic 5 reviews, Prolific Critic 25, Rating Machine 50 ratings, Room
        Regular 3 rooms, Community Voice 10).
      - Add a persisted **`badges` / achievements table** so earning one is a real
        event with a timestamp — enables "earned on" dates and an unlock
        **notification** when a threshold is crossed (today it silently appears).
      - Fix **"Finale Survivor"** to count completed **TV series**, not just movies
        (currently keys off `watch_status.movie_watched` only — no series-complete
        signal yet).
      - Reconsider **"Spoiler Guardian"** — currently pegged to the profile-privacy
        toggle, which isn't really about spoilers. A truer signal now exists: the
        persisted **`profiles.spoiler_safety`** level (2026-07-12) — e.g. award it
        for `spoiler_safety = 'strict'`, or for consistent spoiler-tag usage.
      - ~~Persist a real spoiler-safety level so the header chip can show the real
        level.~~ **Done 2026-07-12** — `profiles.spoiler_safety` (strict/balanced/
        off) is persisted and the profile chip now shows it.
- [ ] **SEO / domain**: point `watchruum.com` + `www` at Vercel (www primary,
      apex redirect) or set `NEXT_PUBLIC_SITE_URL`; submit `/sitemap.xml` to
      Google Search Console + Bing.
- [ ] Supabase Auth: set the **Site URL / redirect URLs** to the real domain;
      re-enable **email confirmation**; consider making the GitHub repo private.

---

**Recommended order:** privacy policy + terms + account deletion + TMDb
attribution first (pure blockers for *both* stores, all code I can build), then
the private-profile DB hardening, then Sign in with Apple, then packaging. The
badge-system tightening, notification-preference wiring, and remaining demo→real
conversions are polish — do them alongside **Go Live**, not before the store
blockers.
