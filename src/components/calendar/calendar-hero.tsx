"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotifyButton, useAlerts, formatFans } from "./alerts-context";
import { entryOf } from "./calendar-card";
import type { CalendarItem } from "@/lib/calendar-constants";

export function CalendarHero({ items }: { items: CalendarItem[] }) {
  const [i, setI] = useState(0);
  const { fans } = useAlerts();

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setI((v) => (v + 1) % items.length), 7000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;
  const item = items[Math.min(i, items.length - 1)];
  const total = fans(item.mediaType, item.tmdbId);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-soft">
      {/* Backdrop */}
      <div className="absolute inset-0">
        {item.backdrop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.backdrop} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: "linear-gradient(120deg,#1a1030,#0d0d16)" }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg/90 to-transparent" />
      </div>

      <div className="relative flex min-h-[300px] flex-col justify-center gap-3 p-6 md:max-w-[55%] md:p-8">
        <span className="w-fit rounded-md bg-primary/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-primary">
          Featured
        </span>
        <h2 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">{item.title}</h2>
        <p className="text-[13px] text-muted">{item.genres.slice(0, 3).join(" • ") || "Coming soon"}</p>
        <p className="text-lg font-bold text-primary">Coming {item.releaseLabel}</p>
        <div className="flex items-center gap-3 text-[13px] text-muted-2">
          {item.network && <span className="font-semibold text-foreground/90">{item.network}</span>}
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" /> {formatFans(total)} fans waiting
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2.5">
          <NotifyButton entry={entryOf(item)} className="px-4 py-2.5 text-[13px]" />
          <Link
            href={`/title/${item.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white/5 px-4 py-2.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-white/10"
          >
            View Details <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-6 flex gap-1.5 md:left-8">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`Slide ${idx + 1}`}
              className={cn("h-1.5 rounded-full transition-all", idx === i ? "w-6 bg-primary" : "w-1.5 bg-white/30")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
