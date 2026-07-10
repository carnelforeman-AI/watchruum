import Link from "next/link";
import { Users, CalendarClock, Ban } from "lucide-react";
import { lookupInvite } from "@/app/admin/invite-actions";
import { AcceptInviteButton } from "@/components/invite/accept-invite-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "You're Invited · Watchruum" };

function expiryLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (days <= 0) return `on ${date}`;
  return `in ${days} day${days === 1 ? "" : "s"} (${date})`;
}

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await lookupInvite(token);

  const Logo = (
    <p className="text-3xl font-extrabold tracking-tight">
      Watch<span className="brand-gradient bg-clip-text text-transparent">ruum</span>
    </p>
  );

  if (invite.state !== "valid") {
    const copy: Record<string, { icon: React.ReactNode; title: string; body: string }> = {
      expired: {
        icon: <CalendarClock className="size-7" />,
        title: "This invite has expired",
        body: "The link is no longer active. Ask whoever invited you for a fresh one.",
      },
      used: {
        icon: <Users className="size-7" />,
        title: "This invite is all used up",
        body: "It reached its maximum number of uses. Ask for a new invite link.",
      },
      revoked: {
        icon: <Ban className="size-7" />,
        title: "This invite was revoked",
        body: "The link has been turned off by an admin.",
      },
      not_found: {
        icon: <Ban className="size-7" />,
        title: "Invite not found",
        body: "This invite link isn't valid. Double-check the link or ask for a new one.",
      },
    };
    const c = copy[invite.state] ?? copy.not_found;
    return (
      <Shell>
        {Logo}
        <span className="mt-6 grid size-16 place-items-center rounded-full bg-white/5 text-muted-2">{c.icon}</span>
        <h1 className="mt-4 text-xl font-extrabold">{c.title}</h1>
        <p className="mx-auto mt-2 max-w-[300px] text-[14px] text-muted">{c.body}</p>
        <Link href="/" className="mt-6 text-[13px] font-semibold text-primary hover:underline">
          Go to Watchruum
        </Link>
      </Shell>
    );
  }

  const expiry = expiryLabel(invite.expires_at);

  return (
    <Shell>
      {Logo}
      <span className="mt-6 grid size-16 place-items-center rounded-full bg-primary/15 text-primary">
        <Users className="size-7" />
      </span>
      <h1 className="mt-4 text-2xl font-extrabold">You&apos;re Invited!</h1>
      <p className="mx-auto mt-2 max-w-[320px] whitespace-pre-line text-[14px] leading-relaxed text-muted">
        {invite.message?.trim() ||
          "Join Watchruum and be part of the ultimate community for movie and TV lovers."}
      </p>

      <div className="mt-6 w-full">
        <AcceptInviteButton token={token} />
      </div>

      <p className="mt-3 text-[12px] text-muted-2">
        {expiry ? `This invite link expires ${expiry}.` : "This invite link doesn't expire."}
      </p>
      <p className="mt-4 text-[12px] text-muted-2">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4 py-10">
      <div className="glass w-full max-w-md rounded-3xl border border-border-soft p-8 text-center">{children}</div>
    </div>
  );
}
