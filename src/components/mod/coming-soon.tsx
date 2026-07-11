import Link from "next/link";
import { Wrench, ArrowLeft } from "lucide-react";

/** Placeholder for moderator tools that are wired up in a later pass. */
export function ModComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/mod"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Dashboard
      </Link>
      <div className="glass grid place-items-center rounded-2xl px-6 py-16 text-center">
        <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <Wrench className="size-6" />
        </span>
        <h1 className="text-xl font-extrabold">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-muted">
          This moderator tool is coming soon. The dashboard is live now — the rest of the moderation
          suite is being wired up next.
        </p>
        <Link
          href="/mod"
          className="mt-5 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
