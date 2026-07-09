import Link from "next/link";

export function WatchruumLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center">
      <span
        className={`font-extrabold tracking-tight ${compact ? "text-xl" : "text-2xl"}`}
      >
        Watch<span className="brand-gradient">ruum</span>
      </span>
    </Link>
  );
}
