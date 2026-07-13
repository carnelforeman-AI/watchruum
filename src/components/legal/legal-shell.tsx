import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WatchruumLogo } from "@/components/layout/logo";

/**
 * Standalone wrapper for the legal pages (Privacy, Terms, Cookies). Publicly
 * reachable (see src/proxy.ts) so signed-out visitors and app-store reviewers
 * can read them.
 */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border-soft px-5 py-4 md:px-8">
        <WatchruumLogo />
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to app
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-[13px] text-muted-2">Last updated {updated}</p>

        <div className="legal-prose mt-8 space-y-6 text-[14px] leading-relaxed text-muted">{children}</div>

        <footer className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-border-soft pt-6 text-[13px] font-semibold text-muted-2">
          <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
          <Link href="/cookies" className="transition-colors hover:text-foreground">Cookies</Link>
          <span className="ml-auto">© {new Date().getFullYear()} Watchruum</span>
        </footer>
      </main>
    </div>
  );
}

/** Small heading helper for legal sections. */
export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-bold text-foreground">{heading}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
