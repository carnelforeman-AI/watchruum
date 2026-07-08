/**
 * Seed the sample fictional catalog into Supabase.
 *
 * Usage:
 *   1. Fill SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   2. npm run seed
 *
 * Idempotent: upserts on (tmdb_id, media_type), so re-running is safe.
 * Uses the service-role key (server-only) to bypass RLS for the insert.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// --- load .env.local ---------------------------------------------------
try {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env.local — rely on process env */
}

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !KEY) {
  console.error("✗ Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}

const db = createClient(URL_, KEY, { auth: { persistSession: false } });

// --- catalog (fictional; matches src/lib/mock-data.ts) -----------------
const TITLES = [
  { tmdb_id: 900001, media_type: "tv", title: "Frontier Blood", genres: ["Drama", "Western"], vote_average: 8.7, release_year: 2023, number_of_seasons: 2, seasons: [8, 8], overview: "A ranching dynasty fights to hold its land as the modern world closes in." },
  { tmdb_id: 900002, media_type: "tv", title: "Campus Ascension", genres: ["Drama", "Sci-Fi"], vote_average: 8.2, release_year: 2024, number_of_seasons: 2, seasons: [10, 10], overview: "Elite university students discover they share impossible abilities." },
  { tmdb_id: 900003, media_type: "tv", title: "The Last Signal", genres: ["Sci-Fi", "Thriller"], vote_average: 9.0, release_year: 2024, number_of_seasons: 1, seasons: [9], overview: "Survivors of a global blackout follow a mysterious broadcast." },
  { tmdb_id: 900004, media_type: "tv", title: "Crown City", genres: ["Fantasy", "Drama"], vote_average: 8.5, release_year: 2022, number_of_seasons: 2, seasons: [10, 10], overview: "Rival dynasties scheme for the throne of a fractured kingdom." },
  { tmdb_id: 900005, media_type: "tv", title: "The Final Table", genres: ["Reality", "Competition"], vote_average: 7.9, release_year: 2025, number_of_seasons: 1, seasons: [12], overview: "Twelve strangers compete in a game where the rules keep changing." },
  { tmdb_id: 900006, media_type: "tv", title: "Echo Station", genres: ["Sci-Fi", "Mystery"], vote_average: 8.8, release_year: 2024, number_of_seasons: 1, seasons: [9], overview: "The crew of a deep-space relay uncovers a signal that should not exist." },
  { tmdb_id: 900007, media_type: "tv", title: "Iron District", genres: ["Crime", "Thriller"], vote_average: 8.4, release_year: 2023, number_of_seasons: 3, seasons: [10, 10, 8], overview: "A homicide detective hunts a killer through a decaying industrial city." },
  { tmdb_id: 900008, media_type: "movie", title: "Midnight Case", genres: ["Thriller", "Drama"], vote_average: 8.1, release_year: 2025, number_of_seasons: null, seasons: [], overview: "A defense attorney takes the one case that could destroy her." },
];

const EP_TITLES = ["Cold Open", "The Arrangement", "Fault Lines", "Day One", "The Trap", "Homecoming", "The Oath", "Everything Burns", "The We We Are", "Last Light"];

async function run() {
  let titles = 0, seasons = 0, episodes = 0;

  for (const t of TITLES) {
    const { data: media, error } = await db
      .from("media_items")
      .upsert(
        {
          tmdb_id: t.tmdb_id, media_type: t.media_type, title: t.title,
          overview: t.overview, genres: t.genres, vote_average: t.vote_average,
          release_year: t.release_year, number_of_seasons: t.number_of_seasons,
        },
        { onConflict: "tmdb_id,media_type" },
      )
      .select("id")
      .single();
    if (error) { console.error(`✗ ${t.title}:`, error.message); continue; }
    titles++;

    for (let s = 0; s < t.seasons.length; s++) {
      const seasonNum = s + 1;
      const count = t.seasons[s];
      await db.from("seasons").upsert(
        { media_id: media.id, season_number: seasonNum, name: `Season ${seasonNum}`, episode_count: count },
        { onConflict: "media_id,season_number" },
      );
      seasons++;

      const eps = Array.from({ length: count }, (_, i) => ({
        media_id: media.id,
        season_number: seasonNum,
        episode_number: i + 1,
        name: EP_TITLES[(seasonNum + i) % EP_TITLES.length],
        overview: "Long-buried tensions finally come to the surface and no one is left unchanged.",
        runtime: 48 + (i % 4) * 6,
      }));
      await db.from("episodes").upsert(eps, { onConflict: "media_id,season_number,episode_number" });
      episodes += eps.length;
    }
    console.log(`✓ ${t.title}`);
  }

  console.log(`\nSeeded ${titles} titles, ${seasons} seasons, ${episodes} episodes.`);
}

run().then(() => process.exit(0));
