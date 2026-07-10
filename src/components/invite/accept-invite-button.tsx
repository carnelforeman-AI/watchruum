"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { acceptInvite } from "@/app/admin/invite-actions";

const MESSAGES: Record<string, string> = {
  expired: "This invite has expired.",
  used: "This invite has reached its maximum number of uses.",
  revoked: "This invite has been revoked.",
  not_found: "This invite is no longer available.",
  error: "Something went wrong. Please try again.",
};

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const accept = () => {
    setError(null);
    start(async () => {
      const { state } = await acceptInvite(token);
      if (state === "accepted") {
        router.push(`/signup?invite=${encodeURIComponent(token)}`);
      } else {
        setError(MESSAGES[state] ?? MESSAGES.error);
      }
    });
  };

  return (
    <div className="w-full">
      <button
        onClick={accept}
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-3 text-[15px] font-bold text-white shadow-[0_8px_24px_-10px_rgba(124,58,237,0.9)] transition hover:brightness-110 disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Accept Invite
      </button>
      {error && <p className="mt-2 text-center text-[13px] font-medium text-danger">{error}</p>}
    </div>
  );
}
