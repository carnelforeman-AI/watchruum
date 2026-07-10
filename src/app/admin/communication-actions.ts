"use server";

import { createClient } from "@/lib/supabase/server";

async function adminCtx() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin, display_name, username")
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.is_admin) return null;
  return {
    supabase,
    userId: user.id,
    name: (me.display_name || me.username || "Watchruum Team") as string,
  };
}

export interface RecipientOption {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
}

/** Members an admin can target when sending to "select users". */
export async function getRecipientOptions(): Promise<RecipientOption[]> {
  const ctx = await adminCtx();
  if (!ctx) return [];
  const { data } = await ctx.supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .order("display_name", { ascending: true })
    .limit(500);
  return ((data as any[]) ?? []).map((p) => ({
    id: p.id,
    name: p.display_name ?? "Member",
    username: p.username ?? null,
    avatar_url: p.avatar_url ?? null,
  }));
}

export interface SendCommunicationInput {
  subject: string;
  body: string;
  audience: "all" | "selected";
  userIds?: string[];
}

/**
 * Deliver a communication (announcement / push / email template) to the chosen
 * audience. Delivery lands in each recipient's envelope inbox (the real channel
 * that exists today); email/push providers are a later add.
 */
export async function sendCommunication(
  input: SendCommunicationInput,
): Promise<{ ok: boolean; count?: number; error?: string }> {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false, error: "Not authorized" };

  let ids: string[] = [];
  if (input.audience === "all") {
    const { data } = await ctx.supabase.from("profiles").select("id").limit(5000);
    ids = ((data as any[]) ?? []).map((p) => p.id);
  } else {
    ids = Array.from(new Set(input.userIds ?? []));
  }
  if (ids.length === 0) return { ok: false, error: "No recipients selected." };

  const subject = input.subject.trim() || "A message from the Watchruum team";
  const body = input.body.trim() || subject;

  const rows = ids.map((rid) => ({
    recipient_id: rid,
    sender_id: ctx.userId,
    sender_name: ctx.name,
    subject,
    body,
    official: true,
  }));

  const { error } = await ctx.supabase.from("user_messages").insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true, count: ids.length };
}
