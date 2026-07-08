import Link from "next/link";

export function WatchruumLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-[0_8px_20px_-8px_rgba(124,58,237,0.9)]">
        <svg viewBox="0 0 24 24" className="size-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" stroke="none" />
        </svg>
      </span>
      {!compact && (
        <span className="text-lg font-extrabold tracking-tight">
          Watch<span className="brand-gradient">ruum</span>
        </span>
      )}
    </Link>
  );
}
