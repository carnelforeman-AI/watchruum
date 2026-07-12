# Watchruum — Scaling & Infrastructure Hardening

Readiness notes for carrying the app to hundreds of thousands of users. Split
into **code changes** (done in the repo) and **operational actions** (account /
dashboard steps you take — these aren't code).

---

## TL;DR

The architecture — Next.js on Vercel + Supabase (Postgres) + the TMDb API — is a
proven, scalable stack. Nothing needs a rebuild. What's required is a short
hardening pass plus tier upgrades, ideally done **before** traffic arrives, not
during a spike.

---

## ✅ Handled in code

| Item | Status | Where |
|---|---|---|
| **TMDb response caching** | Done | Every TMDb fetch is cached in the Next Data Cache. Volatile lists (trending/search/discover/popular) revalidate hourly; stable detail/credits/season data every 24h. Cuts external API calls dramatically and works even on `force-dynamic` pages. See `revalidateFor()` in `src/lib/tmdb.ts`. |
| **Scale-readiness DB indexes** | Migration ready | `supabase/scale-indexes.sql` — adds the missing hot-path indexes (reaction counts, review ordering, followers, notification feed, report lookups, per-title tracking counts). **Run it in the Supabase SQL editor.** |
| **Row-Level Security** | In place | All user tables use RLS; cross-user writes go through `SECURITY DEFINER` functions. |
| **Client connection model** | Safe by design | The app talks to Postgres through the Supabase JS client (PostgREST over HTTPS), **not** raw `postgres://` connections — so the classic serverless "connection exhaustion" footgun does **not** apply here (see note below). |

## 🔧 Operational actions (you do these — not code)

### 1. Upgrade hosting & database tiers
- **Vercel:** Hobby → **Pro** now (Hobby's limits — including once-a-day cron —
  will not sustain growth), then Enterprise as traffic warrants.
- **Supabase:** → **Pro** ($25/mo), then **Team** + compute add-ons as load
  grows. Watch the dashboard's CPU / connection / disk metrics.

### 2. Connection pooling — *only if you add a direct-Postgres tool later*
Today this is **N/A**: the app uses the Supabase JS/PostgREST client, which
pools server-side. **If** you ever add an ORM or driver that opens raw Postgres
connections (Prisma, Drizzle, `node-postgres`) from Vercel functions, you MUST
use Supabase's **Supavisor transaction-mode pooler** (port **6543**) and disable
prepared statements — the direct connection string will exhaust slots under
serverless load.

### 3. Caching beyond TMDb (bigger win as you grow)
Every page is currently `export const dynamic = "force-dynamic"`, so each visit
hits the server and DB. TMDb data is already cached; the next lever is caching
the **public, non-personalized** pages (title, calendar, explore, genres) with
ISR / CDN. This is a targeted refactor (separate the cacheable shell from
per-user parts that read auth cookies) — worth doing in the Growth phase.

### 4. Monitoring (set up before launch)
- Enable **`pg_stat_statements`** in Supabase; review the slowest queries
  monthly and `EXPLAIN ANALYZE` anything over ~50ms.
- Watch Vercel Analytics + Supabase dashboard for function duration, egress,
  DB CPU, and connection counts.
- Add error tracking (e.g. Sentry) so issues surface before users report them.

### 5. As you approach six figures of users
- Add a Supabase **read replica** to offload heavy reads.
- Add **rate limiting** on write-heavy endpoints (posting, reactions).
- Revisit RLS policy performance — confirm every referenced column is indexed.

---

## Rough monthly infrastructure cost by scale

| Stage | Users | Est. infra / mo | Notes |
|---|---|---|---|
| Launch | 0–10K | ~$50–$150 | Vercel Pro + Supabase Pro + basics |
| Growth | 50–100K | ~$400–$1,200 | Compute add-ons, bandwidth, caching layer |
| Scale | ~500K | ~$2,500–$7,000+ | Scale plan, read replica, cache/CDN, egress |

Directional — real cost depends heavily on activity (reads/writes per user).

---

## Pre-traffic checklist

- [ ] Run `supabase/scale-indexes.sql` in the Supabase SQL editor
- [ ] (Confirm all prior migrations are run — see the migration files under `supabase/`)
- [ ] Upgrade Vercel to Pro
- [ ] Upgrade Supabase to Pro
- [ ] Enable `pg_stat_statements` and set a monthly slow-query review
- [ ] Add error monitoring (Sentry or similar)
- [ ] Load-test a hot path (title page + posting) before a big push
