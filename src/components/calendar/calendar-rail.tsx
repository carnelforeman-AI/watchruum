"use client";

import Link from "next/link";
import { useState } from "react";
import { Settings, Bell } from "lucide-react";
import { Poster } from "@/components/media/poster";
import { CalendarRow } from "./calendar-card";
import { useAlerts } from "./alerts-context";
import { routeId } from "@/lib/utils";
import type { CalendarItem, CalKind } from "@/lib/calendar-constants";

const KIND_DOT: Record<CalKind, string> = {
  movie: "bg-primary",
  series: "bg-accent",
  new_season: "bg-accent",
  new_episode: "bg-safe",
};

const KIND_LABEL: Record<CalKind, string> = {
  movie: "Movie",
  series: "New Show",
  new_season: "New Season",
  new_episode: "New Episode",
};

export function CalendarRail({
  byGenre,
  theaters,
  events,
}: {
  byGenre: { name: string; count: number }[];
  theaters: CalendarItem[];
  events: CalendarItem[];
}) {
  return (
    <div className="hidden w-[320px] shrink-0 flex-col gap-4 xl:flex">
      <MyAlertsRail />
      <PopularGenres byGenre={byGenre} />
      <ComingToTheaters theaters={theaters} />
      <ReleaseCalendar events={events} />
    </div>
  );
}

function MyAlertsRail() {
  const { alerts } = useAlerts();
  const list = [...alerts.values()].slice(0, 4);
  return (
    <section className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-bold">Notifications</h3>
        <Link href="/calendar?tab=my_alerts" className="text-[12px] font-semibold text-primary hover:text-primary-strong">
          View All
        </Link>
      </div>
      {list.length === 0 ? (
        <p className="py-4 text-center text-[12px] text-muted-2">
          Tap <span className="font-semibold text-primary">Notify Me</span> on a title to track it here.
        </p>
      ) : (
        <div className="space-y-1">
          {list.map((a) => (
            <Link
              key={`${a.mediaType}_${a.tmdbId}`}
              href={`/title/${routeId(a.mediaType, a.tmdbId, a.title)}`}
              className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-white/5"
            >
              <Poster
                title={a.title}
                src={a.poster}
                showTitle={false}
                rounded="rounded-md"
                className="h-12 w-9 shrink-0 ring-1 ring-white/10"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{a.title}</p>
                <p className="text-[11px] text-muted-2">{a.releaseDate ? a.releaseDate : "TBA"}</p>
              </div>
              <span className="size-2 shrink-0 rounded-full bg-primary" />
            </Link>
          ))}
        </div>
      )}
      <Link
        href="/settings"
        className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-[12px] font-semibold text-muted transition-colors hover:text-foreground"
      >
        <Settings className="size-3.5" /> Manage Alerts
      </Link>
    </section>
  );
}

function PopularGenres({ byGenre }: { byGenre: { name: string; count: number }[] }) {
  const max = Math.max(1, ...byGenre.map((g) => g.count));
  return (
    <section className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-bold">Popular Genres</h3>
        <Link href="/calendar" className="text-[12px] font-semibold text-primary hover:text-primary-strong">
          View All
        </Link>
      </div>
      <div className="space-y-2.5">
        {byGenre.map((g) => (
          <Link key={g.name} href={`/calendar?genre=${encodeURIComponent(g.name)}`} className="block">
            <div className="mb-1 flex items-center justify-between text-[13px]">
              <span className="font-semibold">{g.name}</span>
              <span className="text-muted-2">{g.count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(g.count / max) * 100}%` }} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ComingToTheaters({ theaters }: { theaters: CalendarItem[] }) {
  if (theaters.length === 0) return null;
  return (
    <section className="glass rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[15px] font-bold">Coming to Theaters</h3>
        <Link href="/calendar?platform=Theaters" className="text-[12px] font-semibold text-primary hover:text-primary-strong">
          View All
        </Link>
      </div>
      <div className="space-y-0.5">
        {theaters.map((t) => (
          <CalendarRow key={t.id} item={t} />
        ))}
      </div>
    </section>
  );
}

const WD = ["S", "M", "T", "W", "T", "F", "S"];

function ReleaseCalendar({ events }: { events: CalendarItem[] }) {
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const base = new Date();
  const view = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  const todayIso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;

  // Group this month's dated releases by ISO day.
  const byDay = new Map<string, CalendarItem[]>();
  for (const it of events) {
    if (it.releaseDate && it.releaseDate.startsWith(monthPrefix)) {
      const arr = byDay.get(it.releaseDate) ?? [];
      arr.push(it);
      byDay.set(it.releaseDate, arr);
    }
  }

  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  const goMonth = (d: number) => {
    setOffset((o) => o + d);
    setSelected(null);
  };

  const selItems = selected ? byDay.get(selected) ?? [] : [];
  const selLabel = selected
    ? new Date(`${selected}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "";

  return (
    <section className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-bold">Release Calendar</h3>
      </div>
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => goMonth(-1)} className="rounded-md px-2 py-1 text-muted-2 hover:text-foreground">
          ‹
        </button>
        <span className="text-[13px] font-semibold">{view.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        <button onClick={() => goMonth(1)} className="rounded-md px-2 py-1 text-muted-2 hover:text-foreground">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WD.map((d, i) => (
          <span key={i} className="py-1 text-[10px] font-semibold text-muted-2">
            {d}
          </span>
        ))}
        {cells.map((c, i) => {
          if (c === null) return <span key={i} />;
          const iso = `${monthPrefix}${String(c).padStart(2, "0")}`;
          const dayItems = byDay.get(iso);
          const kinds = dayItems ? Array.from(new Set(dayItems.map((x) => x.kind))) : [];
          const isToday = iso === todayIso;
          const isSel = iso === selected;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected((s) => (s === iso ? null : iso))}
              aria-pressed={isSel}
              className={`relative grid h-7 place-items-center rounded-md text-[12px] transition-colors ${
                isSel
                  ? "bg-primary font-bold text-white ring-2 ring-primary/50"
                  : isToday
                    ? "bg-primary/25 font-bold text-white ring-1 ring-primary/40"
                    : "text-foreground/80 hover:bg-white/10"
              }`}
            >
              {c}
              {kinds.length > 0 && !isSel && (
                <span className="absolute bottom-0.5 flex gap-0.5">
                  {kinds.slice(0, 3).map((k) => (
                    <span key={k} className={`size-1 rounded-full ${KIND_DOT[k]}`} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 space-y-1 text-[11px] text-muted-2">
        <p className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-safe" /> New Episodes
        </p>
        <p className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-accent" /> New Seasons
        </p>
        <p className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" /> Movies
        </p>
      </div>

      {selected && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-[12px] font-bold">{selLabel}</p>
          {selItems.length === 0 ? (
            <p className="py-1 text-[12px] text-muted-2">No releases scheduled this day.</p>
          ) : (
            <div className="space-y-0.5">
              {selItems.map((it) => (
                <Link
                  key={it.id}
                  href={`/title/${it.id}`}
                  className="flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-white/5"
                >
                  <Poster
                    title={it.title}
                    src={it.poster}
                    genres={it.genres}
                    showTitle={false}
                    rounded="rounded-md"
                    className="h-11 w-8 shrink-0 ring-1 ring-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{it.title}</p>
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-2">
                      <span className={`size-1.5 rounded-full ${KIND_DOT[it.kind]}`} /> {KIND_LABEL[it.kind]}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function ManageAlertsIcon() {
  return <Bell className="size-4" />;
}
