import { getCalendarOverview } from "@/lib/calendar";
import { getMyAlerts, getInterestMap } from "@/app/calendar-actions";
import { AlertsProvider, type AlertEntry } from "@/components/calendar/alerts-context";
import { CalendarClient } from "@/components/calendar/calendar-client";
import { CalendarRail } from "@/components/calendar/calendar-rail";
import type { CalendarItem } from "@/lib/calendar-constants";

export const metadata = {
  title: "Release Calendar · Watchruum",
  description:
    "Track upcoming movies, new episodes, and season premieres. Get notified so you never miss a release — spoiler-safe on Watchruum.",
};
export const dynamic = "force-dynamic";

const VALID_TABS = new Set(["coming_soon", "new_episodes", "new_seasons", "movies", "trailers", "my_alerts"]);

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; genre?: string; platform?: string }>;
}) {
  const sp = await searchParams;
  const [overview, myAlerts, interest] = await Promise.all([getCalendarOverview(), getMyAlerts(), getInterestMap()]);

  const initialAlerts: AlertEntry[] = myAlerts.map((a) => ({
    tmdbId: a.tmdb_id,
    mediaType: a.media_type,
    title: a.title,
    poster: a.poster_url,
    releaseDate: a.release_date,
  }));

  // Dedupe the dated releases by id; the calendar groups them per day.
  const events: CalendarItem[] = Array.from(
    new Map(
      [
        ...overview.featured,
        ...overview.thisWeek,
        ...overview.mostAnticipated,
        ...overview.recentlyAdded,
        ...overview.theaters,
      ]
        .filter((i) => i.releaseDate)
        .map((i) => [i.id, i] as const),
    ).values(),
  );

  const initialTab = sp.tab && VALID_TABS.has(sp.tab) ? (sp.tab as never) : undefined;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      <AlertsProvider initialAlerts={initialAlerts} interest={interest}>
        <div className="flex gap-6">
          <CalendarClient overview={overview} initial={{ tab: initialTab, genre: sp.genre, platform: sp.platform }} />
          <CalendarRail byGenre={overview.byGenre} theaters={overview.theaters} events={events} />
        </div>
      </AlertsProvider>
    </div>
  );
}
