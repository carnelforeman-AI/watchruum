"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useDismissed, type DismissKind } from "@/lib/use-dismissed";

/** Deletes a notification/message and returns to its list. */
export function DetailDeleteButton({ id, kind, backHref }: { id: string; kind: DismissKind; backHref: string }) {
  const router = useRouter();
  const { dismiss } = useDismissed(kind);

  return (
    <button
      type="button"
      onClick={() => {
        dismiss(id);
        router.push(backHref);
      }}
      className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-[13px] font-semibold text-muted transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
    >
      <Trash2 className="size-4" /> Delete
    </button>
  );
}
