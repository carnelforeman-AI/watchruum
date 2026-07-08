# Going live — connect Supabase + TMDb

Follow these once and Watchruum switches from sample data to a real, persistent
app. ~10 minutes.

---

## 1. Supabase (auth + database)

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick a name and a
   strong database password (save it). Wait for it to finish provisioning.
2. In the left nav open **SQL Editor** → **New query**. Open the file
   [`supabase/schema.sql`](supabase/schema.sql) from this project, paste the whole
   thing in, and click **Run**. You should see "Success". This creates every table,
   the security policies, and a trigger that auto-creates a profile on signup.
3. Open **Project Settings → API**. Copy these three values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret — local only)
4. Open **Authentication → Providers → Email** and make sure Email is enabled.
   For quick testing you can turn **off** "Confirm email" so signups log in
   immediately. Under **Authentication → URL Configuration**, add
   `http://localhost:3000/auth/callback` (and your Vercel URL later) to the
   redirect allow-list.

## 2. TMDb (movie + TV metadata)

1. Create a free account at [themoviedb.org](https://www.themoviedb.org), then go to
   **Settings → API** and request a developer key (instant approval).
2. Copy either the **API Key (v3 auth)** → `TMDB_API_KEY`, or the
   **API Read Access Token (v4)** → `TMDB_READ_ACCESS_TOKEN`. One is enough.

## 3. Put the keys in `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...           # anon public
SUPABASE_SERVICE_ROLE_KEY=eyJ...               # service_role (local only)
TMDB_API_KEY=your-tmdb-v3-key                  # or TMDB_READ_ACCESS_TOKEN
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 4. Seed the sample catalog (optional but nice)

Loads the fictional titles so rooms aren't empty before you search TMDb:

```bash
npm run seed
```

## 5. Run it

```bash
npm install
npm run dev
```

Sign up → you'll be routed into onboarding → pick a username and genres → land on
the dashboard. Now search a real show, open an episode, mark it watched, rate it,
and comment — all of it persists in your Supabase tables. Watch progress drives the
spoiler filtering for real.

---

## Deploy to Vercel

1. Push the project to a GitHub repo.
2. [vercel.com](https://vercel.com) → **New Project** → import the repo.
3. Add the same environment variables (Project → Settings → Environment Variables).
   Set `NEXT_PUBLIC_SITE_URL` to your Vercel domain.
4. Back in Supabase → Authentication → URL Configuration, add
   `https://your-domain.vercel.app/auth/callback` to the redirect allow-list.
5. Deploy.

## Troubleshooting

- **"Demo mode" banner still shows** → the anon key/URL aren't being read. Confirm
  `.env.local` is in the project root and restart `npm run dev`.
- **Signup works but no profile** → make sure the whole `schema.sql` ran (the
  `on_auth_user_created` trigger is what creates the profile row).
- **Search returns sample titles only** → TMDb key missing or invalid.
- **RLS errors on write** → you're not signed in, or the schema's policies didn't
  apply; re-run `schema.sql`.
