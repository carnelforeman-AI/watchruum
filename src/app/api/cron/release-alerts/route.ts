import { dispatchReleaseAlerts } from "@/lib/notify/dispatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Daily release-alert cron endpoint. Triggered by Vercel Cron (see vercel.json).
 * Protected by CRON_SECRET: Vercel automatically sends `Authorization: Bearer
 * <CRON_SECRET>` when that env var is set, so random visitors can't run it.
 */
async function run(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }
  const result = await dispatchReleaseAlerts();
  return Response.json(result);
}

export const GET = run;
export const POST = run;
