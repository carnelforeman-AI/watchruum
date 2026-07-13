"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { blockUser, unblockUser } from "@/app/(main)/u/block-actions";

export function BlockButton({
  targetId,
  targetName,
  initialBlocked,
}: {
  targetId: string;
  targetName: string;
  initialBlocked: boolean;
}) {
  const router = useRouter();
  const [blocked, setBlocked] = useState(initialBlocked);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const toggle = () => {
    setErr(null);
    const next = !blocked;
    start(async () => {
      const res = next ? await blockUser(targetId) : await unblockUser(targetId);
      if (res.ok) {
        setBlocked(next);
        router.refresh();
      } else {
        setErr(res.error ?? "Something went wrong.");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={toggle}
        disabled={pending}
        aria-label={blocked ? `Unblock ${targetName}` : `Block ${targetName}`}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-60",
          blocked
            ? "border-border bg-white/[0.04] text-muted hover:text-foreground"
            : "border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
        )}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : blocked ? (
          <ShieldOff className="size-3.5" />
        ) : (
          <Ban className="size-3.5" />
        )}
        {blocked ? "Unblock" : "Block"}
      </button>
      {err && <span className="text-[11px] text-danger">{err}</span>}
    </div>
  );
}
