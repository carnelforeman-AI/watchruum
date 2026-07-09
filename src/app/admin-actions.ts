"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };

async function adminContext() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return null;
  return supabase;
}

/** Resolve / dismiss / reopen a report. */
export async function setReportStatus(
  reportId: string,
  status: "open" | "reviewing" | "resolved" | "dismissed",
): Promise<Result> {
  const supabase = await adminContext();
  if (!supabase) return { ok: false, error: "Not authorized" };
  const { error } = await supabase.from("reports").update({ status }).eq("id", reportId);
  revalidatePath("/admin/reports");
  return { ok: !error, error: error?.message };
}

/** Remove the reported comment/review, then mark its report resolved. */
export async function removeReportedContent(
  reportId: string,
  targetType: "comment" | "review",
  targetId: string,
): Promise<Result> {
  const supabase = await adminContext();
  if (!supabase) return { ok: false, error: "Not authorized" };

  const table = targetType === "comment" ? "comments" : "reviews";
  const { error: delErr } = await supabase.from(table).delete().eq("id", targetId);
  if (delErr) return { ok: false, error: delErr.message };

  await supabase.from("reports").update({ status: "resolved" }).eq("id", reportId);
  revalidatePath("/admin/reports");
  return { ok: true };
}
