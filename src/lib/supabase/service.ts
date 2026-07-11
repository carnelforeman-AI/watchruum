import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * Service-role Supabase client for TRUSTED SERVER JOBS ONLY (e.g. the cron
 * release-alert dispatcher). It bypasses Row Level Security, so it must never
 * be used in a request that carries user input or be exposed to the client.
 *
 * Returns null until SUPABASE_SERVICE_ROLE_KEY is set — so the engine is built
 * and deployable now, and simply activates once the key is added.
 */
export function createServiceClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createSupabaseClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
