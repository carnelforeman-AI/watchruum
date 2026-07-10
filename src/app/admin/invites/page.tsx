import { InvitesComposer } from "@/components/admin/invites-composer";

export const metadata = { title: "Admin · Send New Invite · Watchruum" };
export const dynamic = "force-dynamic";

export default function AdminInvitesPage() {
  // Pass a server-computed timestamp so expiration dates render identically on
  // server and client (no hydration mismatch).
  return <InvitesComposer nowIso={new Date().toISOString()} />;
}
