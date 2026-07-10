import { headers } from "next/headers";
import { randomBytes } from "crypto";
import { InvitesComposer } from "@/components/admin/invites-composer";

export const metadata = { title: "Admin · Send New Invite · Watchruum" };
export const dynamic = "force-dynamic";

export default async function AdminInvitesPage() {
  // A fresh, URL-safe token per load; createInvite persists this exact token so
  // the displayed /join/<token> link goes live once the invite is sent.
  const token = randomBytes(12).toString("base64url");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "watchruum.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const baseUrl = `${proto}://${host}`;

  return <InvitesComposer nowIso={new Date().toISOString()} token={token} baseUrl={baseUrl} />;
}
