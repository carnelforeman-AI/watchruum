import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { routeId } from "@/lib/utils";
import { sendEmail, emailConfigured, smsConfigured, type DeliveryResult } from "./providers";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface DispatchResult {
  ok: boolean;
  configured: boolean; // service role available
  due: number; // subscriptions releasing today
  inApp: number; // in-app notifications created
  email: { attempted: number; sent: number; skipped: boolean };
  sms: { attempted: number; sent: number; skipped: boolean };
  error?: string;
}

const todayUTC = () => new Date().toISOString().slice(0, 10);

/**
 * Daily release-alert dispatcher. Finds every "Notify Me" subscription for a
 * title releasing today and delivers a REAL in-app notification to each
 * subscriber (works with no third parties). Email/SMS are attempted only when
 * their providers are configured — otherwise they're skipped cleanly.
 */
export async function dispatchReleaseAlerts(): Promise<DispatchResult> {
  const base: DispatchResult = {
    ok: false,
    configured: false,
    due: 0,
    inApp: 0,
    email: { attempted: 0, sent: 0, skipped: !emailConfigured() },
    sms: { attempted: 0, sent: 0, skipped: !smsConfigured() },
  };

  const sb = createServiceClient();
  if (!sb) return { ...base, ok: true, error: "SUPABASE_SERVICE_ROLE_KEY not set — engine dormant." };
  base.configured = true;

  const today = todayUTC();

  // Subscriptions for a title releasing today that want a "release" alert and
  // haven't been notified yet.
  const { data: dueRows, error } = await sb
    .from("title_alerts")
    .select("id, user_id, tmdb_id, media_type, title")
    .eq("release_date", today)
    .is("notified_at", null)
    .contains("alert_types", ["release"])
    .limit(5000);

  if (error) return { ...base, error: error.message };
  const due = (dueRows as any[]) ?? [];
  base.due = due.length;
  if (due.length === 0) return { ...base, ok: true };

  // 1) In-app notifications (real, no provider needed).
  const link = (r: any) => `/title/${routeId(r.media_type, r.tmdb_id, r.title)}`;
  const rows = due.map((r) => ({
    user_id: r.user_id,
    type: "release",
    message: `${r.title} is out today — your spoiler-safe Watchruum is open.`,
    link: link(r),
  }));
  const { error: insErr } = await sb.from("notifications").insert(rows);
  if (insErr) return { ...base, error: insErr.message };
  base.inApp = rows.length;

  // 2) Email — only when configured. Look up each subscriber's email.
  if (emailConfigured()) {
    for (const r of due) {
      base.email.attempted++;
      try {
        const { data } = await sb.auth.admin.getUserById(r.user_id);
        const to = data?.user?.email;
        if (!to) continue;
        const res: DeliveryResult = await sendEmail({
          to,
          subject: `${r.title} is out today on Watchruum`,
          html: `<p><strong>${r.title}</strong> is out today.</p><p>Its spoiler-safe room is open — rate it, react, and discuss with fans at your exact episode.</p><p><a href="https://www.watchruum.com${link(r)}">Open ${r.title} on Watchruum</a></p>`,
        });
        if (res.sent) base.email.sent++;
      } catch {
        /* skip this recipient */
      }
    }
  }

  // 3) SMS — only when configured. (Phone-number collection is a later step, so
  // this stays a no-op path until numbers exist on profiles.)
  if (smsConfigured()) {
    // Intentionally not wired to a phone source yet — activates with phone collection.
    base.sms.skipped = false;
  }

  // 4) Mark as notified so nobody gets a duplicate.
  await sb
    .from("title_alerts")
    .update({ notified_at: new Date().toISOString() })
    .in(
      "id",
      due.map((r) => r.id),
    );

  return { ...base, ok: true };
}
