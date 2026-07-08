import Link from "next/link";
import { Play, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border">
      {/* Cinematic abstract backdrop (no copyrighted imagery) */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1030] via-[#0b0b16] to-[#0a1424]" />
        <div className="absolute -right-16 -top-10 size-[380px] rounded-full bg-primary/25 blur-[90px]" />
        <div className="absolute bottom-[-60px] right-40 size-[300px] rounded-full bg-accent/20 blur-[90px]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/70 to-transparent" />
      </div>

      <div className="relative z-10 max-w-2xl p-8 md:p-12">
        <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl">
          Never get <span className="brand-gradient">spoiled</span> again.
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
          Track your shows, rate every episode, and join fan rooms that unlock only
          when you&apos;re ready.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/explore">
              <Play className="fill-white" /> Start Watching
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/rooms">
              <Compass /> Explore Rooms
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
