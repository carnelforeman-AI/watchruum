import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { ViewerFlags } from "@/components/system/viewer";

/**
 * Server-side role flags for the signed-in user. Use in server components to
 * gate a beta feature before it ever reaches the client, e.g.:
 *
 *   const { isTester, isAdmin } = await getViewerFlags();
 *   if (isTester || isAdmin) { ...render beta section... }
 *
 * The client-side counterpart is <BetaGate> / useViewer (@/components/system/viewer).
 */
export const getViewerFlags = cache(async (): Promise<ViewerFlags> => {
  const none: ViewerFlags = { isAdmin: false, isModerator: false, isTester: false };
  const supabase = await createClient();
  if (!supabase) return none;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return none;
  const { data } = await supabase
    .from("profiles")
    .select("is_admin, is_moderator, is_tester")
    .eq("id", user.id)
    .maybeSingle();
  const p = data as { is_admin?: boolean; is_moderator?: boolean; is_tester?: boolean } | null;
  return { isAdmin: !!p?.is_admin, isModerator: !!p?.is_moderator, isTester: !!p?.is_tester };
});
