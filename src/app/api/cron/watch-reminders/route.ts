import { dispatchWatchReminders } from "@/lib/notify/watch-reminders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * "Starting soon" reminder cron for scheduled watches. Triggered by Vercel Cron
 * (see vercel.json). Protected by CRON_SECRET like the release-alert cron.
 *
 * Timely reminders need a sub-daily schedule (Vercel Pro allows this; Hobby is
 * daily-only). Until then, the calendar export (.ics / Google Calendar) delivers
 * the phone reminder, and this route is ready to fire once a frequent cron — or
 * an external pinger — hits it.
 */
async function run(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }
  const result = await dispatchWatchReminders();
  return Response.json(result);
}

export const GET = run;
export const POST = run;
