import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";

/**
 * Global "Live Mode" flag (the admin "Go Live" switch).
 *
 * OFF (default): the app shows the seeded demo numbers used before launch.
 * ON: every count is a REAL database count — each real action = +1, starting
 * from 0 — across the title pages, watch rooms and leaderboard.
 *
 * Reads the single `app_settings` row. Returns false (demo) when Supabase
 * isn't configured or the table hasn't been created yet, so nothing breaks.
 * Cached per request.
 */
export const getLiveMode = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  if (!supabase) return false;
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("live_mode")
      .eq("id", 1)
      .maybeSingle();
    return Boolean((data as { live_mode?: boolean } | null)?.live_mode);
  } catch {
    return false;
  }
});
