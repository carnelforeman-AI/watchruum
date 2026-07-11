import "server-only";

/**
 * External notification channels — email and SMS. These are wired but DORMANT:
 * each checks for its provider credentials and no-ops (returns skipped) until
 * they're added, exactly like the translation engine waits for a Google key.
 * No third party is required to build, deploy, or run the release-alert engine;
 * in-app notifications work without any of this. Drop in the keys later and
 * these light up with zero code changes.
 */

export interface DeliveryResult {
  channel: "email" | "sms";
  sent: boolean;
  skipped?: boolean; // provider not configured
  error?: string;
}

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export function smsConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

/** Send a transactional email. No-ops until RESEND_API_KEY is set. */
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<DeliveryResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Watchruum <notify@watchruum.com>";
  if (!key) return { channel: "email", sent: false, skipped: true };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: input.to, subject: input.subject, html: input.html }),
    });
    if (!res.ok) return { channel: "email", sent: false, error: `HTTP ${res.status}` };
    return { channel: "email", sent: true };
  } catch (e) {
    return { channel: "email", sent: false, error: String(e) };
  }
}

/** Send an SMS. No-ops until the Twilio credentials are set. */
export async function sendSms(input: { to: string; body: string }): Promise<DeliveryResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return { channel: "sms", sent: false, skipped: true };
  try {
    const body = new URLSearchParams({ To: input.to, From: from, Body: input.body });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!res.ok) return { channel: "sms", sent: false, error: `HTTP ${res.status}` };
    return { channel: "sms", sent: true };
  } catch (e) {
    return { channel: "sms", sent: false, error: String(e) };
  }
}
