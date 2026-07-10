"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  CalendarDays,
  Tv,
  Layers,
  Film,
  PlayCircle,
  Bell,
  Loader2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { cn, routeId } from "@/lib/utils";
import { loadCalendarPage, searchCalendarAction } from "@/app/calendar-actions";
import {
  CAL_GENRES,
  CAL_PLATFORMS,
  CAL_DATE_WINDOWS,
  DATE_LABELS,
  type CalendarItem,
  type CalendarOverview,
  type CalDateWindow,
  type CalSort,
  type CalTab,
  type CalType,
} from "@/lib/calendar-constants";
import { CalendarCard, GenreTile } from "./calendar-card";
import { CalendarHero } from "./calendar-hero";
import { NotifyButton, useAlerts } from "./alerts-context";

type UITab = CalTab | "my_alerts";

const TABS: { key: UITab; label: string; icon: typeof Tv }[] = [
  { key: "coming_soon", label: "Coming Soon", icon: CalendarDays },
  { key: "new_episodes", label: "New Episodes", icon: Tv },
  { key: "new_seasons", label: "New Seasons", icon: Layers },
  { key: "movies", label: "Movies", icon: Film },
  { key: "trailers", label: "Trailers", icon: PlayCircle },
  { key: "my_alerts", label: "My Alerts", icon: Bell },
];

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-9 rounded-lg border border-border bg-bg-elevated px-3 text-[13px] font-medium text-foreground focus-visible:border-primary/60 focus-visible:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function CalendarClient({
  overview,
  initial,
}: {
  overview: CalendarOverview;
  initial: { tab?: UITab; genre?: string; platform?: string };
}) {
  const [tab, setTab] = useState<UITab>(initial.tab ?? "coming_soon");
  const [type, setType] = useState<CalType>("all");
  const [genre, setGenre] = useState<string>(initial.genre ?? "");
  const [platform, setPlatform] = useState<string>(initial.platform ?? "");
  const [dateWindow, setDateWindow] = useState<string>("");
  const [sort, setSort] = useState<CalSort>("anticipated");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  const [grid, setGrid] = useState<CalendarItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const searching = debounced.length > 0;
  const overviewMode =
    tab === "coming_soon" && type === "all" && !genre && !platform && !dateWindow && !searching;
  const alertsMode = tab === "my_alerts" && !searching;
  const gridMode = !overviewMode && !alertsMode;

  const fetchPage = useCallback(
    (p: number) => {
      if (searching) return searchCalendarAction(debounced, p).then((items) => ({ items, totalPages: 5 }));
      return loadCalendarPage({
        tab: (tab === "my_alerts" ? "coming_soon" : tab) as CalTab,
        type,
        genre: genre || null,
        platform: platform || null,
        dateWindow: (dateWindow || null) as CalDateWindow | null,
        sort,
        page: p,
      });
    },
    [searching, debounced, tab, type, genre, platform, dateWindow, sort],
  );

  // Reset + load when the query source changes (grid mode only).
  useEffect(() => {
    if (!gridMode) return;
    const id = ++reqId.current;
    setLoading(true);
    setDone(false);
    fetchPage(1)
      .then(({ items, totalPages }) => {
        if (id !== reqId.current) return;
        setGrid(items);
        setPage(1);
        setDone(items.length === 0 || totalPages <= 1);
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [gridMode, fetchPage]);

  const loadMore = async () => {
    if (loading || done) return;
    const id = reqId.current;
    setLoading(true);
    try {
      const next = page + 1;
      const { items, totalPages } = await fetchPage(next);
      if (id !== reqId.current) return;
      const seen = new Set(grid.map((g) => g.id));
      setGrid((prev) => [...prev, ...items.filter((i) => !seen.has(i.id))]);
      setPage(next);
      if (items.length === 0 || next >= totalPages) setDone(true);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  };

  return (
    <div className="min-w-0 flex-1">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Watch Calendar</h1>
        <p className="mt-1 text-[13px] text-muted-2">Discover what&apos;s coming soon and never miss a release.</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search upcoming shows, movies, seasons, or episodes…"
          className="h-11 w-full rounded-xl border border-border bg-white/5 pl-10 pr-3 text-sm placeholder:text-muted-2 focus-visible:border-primary/60 focus-visible:outline-none"
        />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
              tab === t.key ? "bg-primary text-white" : "border border-border text-muted hover:text-foreground",
            )}
          >
            <t.icon className="size-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Select
          value={type}
          onChange={setType}
          options={[
            { value: "all", label: "All Types" },
            { value: "tv", label: "TV Shows" },
            { value: "movie", label: "Movies" },
          ]}
        />
        <Select
          value={genre}
          onChange={setGenre}
          options={[{ value: "", label: "All Genres" }, ...CAL_GENRES.map((g) => ({ value: g.name, label: g.name }))]}
        />
        <Select
          value={platform}
          onChange={setPlatform}
          options={[
            { value: "", label: "All Platforms" },
            ...CAL_PLATFORMS.map((p) => ({ value: p.name, label: p.name })),
          ]}
        />
        <Select
          value={dateWindow}
          onChange={setDateWindow}
          options={[
            { value: "", label: "Any Date" },
            ...CAL_DATE_WINDOWS.map((w) => ({ value: w, label: DATE_LABELS[w as CalDateWindow] })),
          ]}
        />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[12px] text-muted-2">Sort by</span>
          <Select
            value={sort}
            onChange={setSort}
            options={[
              { value: "anticipated", label: "Most Anticipated" },
              { value: "soonest", label: "Coming Soonest" },
              { value: "rating", label: "Top Rated" },
            ]}
          />
        </div>
      </div>

      {/* Body */}
      {alertsMode ? (
        <MyAlertsView />
      ) : overviewMode ? (
        <Overview overview={overview} />
      ) : (
        <>
          {grid.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {grid.map((item) => (
                <CalendarCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            !loading && (
              <div className="glass rounded-2xl p-10 text-center">
                <p className="font-semibold">Nothing here yet</p>
                <p className="mt-1 text-sm text-muted-2">
                  {searching ? `No upcoming titles match “${debounced}”.` : "Try a different filter."}
                </p>
              </div>
            )
          )}
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-2" />
            </div>
          )}
          {!loading && !done && grid.length > 0 && (
            <div className="flex justify-center py-6">
              <button
                onClick={loadMore}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/5 px-5 py-2.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-white/10"
              >
                Load more <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- overview */

function Row({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.85, 320), behavior: "smooth" });
  };

  // Poster is w-44 (176px) at a 2/3 ratio → ~264px tall; center arrows on it.
  const arrowBtn =
    "absolute top-[132px] z-20 grid size-14 -translate-y-1/2 place-items-center rounded-full " +
    "bg-black/75 text-white ring-1 ring-white/20 shadow-xl backdrop-blur transition " +
    "hover:bg-primary hover:ring-primary/60 active:scale-95";

  return (
    <div className="relative">
      <div ref={ref} className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth pb-1">
        {children}
      </div>
      {canLeft && (
        <button type="button" aria-label="Scroll left" onClick={() => nudge(-1)} className={cn(arrowBtn, "left-1")}>
          <ChevronLeft className="size-7" />
        </button>
      )}
      {canRight && (
        <button type="button" aria-label="Scroll right" onClick={() => nudge(1)} className={cn(arrowBtn, "right-1")}>
          <ChevronRight className="size-7" />
        </button>
      )}
    </div>
  );
}

function Overview({ overview }: { overview: CalendarOverview }) {
  return (
    <div className="space-y-8">
      <CalendarHero items={overview.featured} />

      {overview.byGenre.length > 0 && (
        <Section title="Coming Soon by Genre">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {overview.byGenre.map((g) => (
              <GenreTile key={g.name} name={g.name} count={g.count} />
            ))}
          </div>
        </Section>
      )}

      {overview.thisWeek.length > 0 && (
        <Section title="Upcoming This Week">
          <Row>
            {overview.thisWeek.map((item) => (
              <div key={item.id} className="w-44 shrink-0">
                <CalendarCard item={item} />
              </div>
            ))}
          </Row>
        </Section>
      )}

      {overview.mostAnticipated.length > 0 && (
        <Section title="Most Anticipated">
          <Row>
            {overview.mostAnticipated.map((item, i) => (
              <div key={item.id} className="w-44 shrink-0">
                <CalendarCard item={item} rank={i + 1} />
              </div>
            ))}
          </Row>
        </Section>
      )}

      {overview.recentlyAdded.length > 0 && (
        <Section title="Recently Added">
          <Row>
            {overview.recentlyAdded.map((item) => (
              <div key={item.id} className="w-44 shrink-0">
                <CalendarCard item={item} />
              </div>
            ))}
          </Row>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------- my alerts */

function MyAlertsView() {
  const { alerts } = useAlerts();
  const list = [...alerts.values()];
  if (list.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <Bell className="mx-auto size-10 text-muted-2/50" />
        <p className="mt-3 font-semibold">No alerts yet</p>
        <p className="mt-1 text-sm text-muted-2">
          Tap <span className="font-semibold text-primary">Notify Me</span> on any upcoming title to track it here.
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {list.map((a) => (
        <div key={`${a.mediaType}_${a.tmdbId}`} className="glass overflow-hidden rounded-2xl border border-border-soft">
          <a href={`/title/${routeId(a.mediaType, a.tmdbId, a.title)}`} className="block">
            {a.poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.poster} alt={a.title} className="aspect-[2/3] w-full object-cover" />
            ) : (
              <div className="aspect-[2/3] w-full bg-white/5" />
            )}
          </a>
          <div className="space-y-2 p-3">
            <p className="truncate text-[14px] font-bold">{a.title}</p>
            <p className="text-[12px] text-muted-2">{a.releaseDate ?? "TBA"}</p>
            <NotifyButton entry={a} className="w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
