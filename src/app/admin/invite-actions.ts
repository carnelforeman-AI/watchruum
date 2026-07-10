"use server";

import { createClient } from "@/lib/supabase/server";

async function adminCtx() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return null;
  return { supabase, userId: user.id };
}

export interface CreateInvitePayload {
  token: string;
  name: string;
  type: string;
  audience: string;
  subject: string;
  message: string;
  expiresDays: number | null; // null = never
  maxUses: number | null;
  allowForward: boolean;
  track: boolean;
  requireVerify: boolean;
  sendNow: boolean;
  baseUrl: string;
}

/** Persist a real invite row so its /join/<token> link becomes live. */
export async function createInvite(p: CreateInvitePayload): Promise<{ ok: boolean; url?: string; error?: string }> {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false, error: "Not authorized" };
  if (!p.token) return { ok: false, error: "Missing invite token" };

  let expiresAt: string | null = null;
  if (p.expiresDays != null) {
    const d = new Date();
    d.setDate(d.getDate() + p.expiresDays);
    expiresAt = d.toISOString();
  }

  const { error } = await ctx.supabase.from("invites").insert({
    token: p.token,
    name: p.name || null,
    type: p.type || null,
    audience: p.audience || null,
    subject: p.subject || null,
    message: p.message || null,
    expires_at: expiresAt,
    max_uses: p.maxUses,
    allow_forward: p.allowForward,
    track: p.track,
    require_verify: p.requireVerify,
    send_now: p.sendNow,
    created_by: ctx.userId,
    status: "active",
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, url: `${p.baseUrl}/join/${p.token}` };
}

export interface InviteLookup {
  state: "valid" | "expired" | "used" | "revoked" | "not_found";
  invite_name: string | null;
  subject: string | null;
  message: string | null;
  expires_at: string | null;
  uses_count: number;
  max_uses: number | null;
}

/** Read an invite by token for the public accept page. */
export async function lookupInvite(token: string): Promise<InviteLookup> {
  const empty: InviteLookup = {
    state: "not_found",
    invite_name: null,
    subject: null,
    message: null,
    expires_at: null,
    uses_count: 0,
    max_uses: null,
  };
  const supabase = await createClient();
  if (!supabase) return empty;
  const { data, error } = await supabase.rpc("invite_lookup", { p_token: token });
  if (error) return empty;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as InviteLookup) ?? empty;
}

/** Redeem an invite (increments its use counter). */
export async function acceptInvite(token: string): Promise<{ state: string }> {
  const supabase = await createClient();
  if (!supabase) return { state: "not_found" };
  const { data, error } = await supabase.rpc("invite_accept", { p_token: token });
  if (error) return { state: "error" };
  return { state: typeof data === "string" ? data : "error" };
}
