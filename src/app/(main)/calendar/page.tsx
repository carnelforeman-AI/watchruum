import { getCalendarOverview } from "@/lib/calendar";
import { getMyAlerts, getInterestMap } from "@/app/calendar-actions";
import { AlertsProvider, type AlertEntry } from "@/components/calendar/alerts-context";
import { TrailerProvider } from "@/components/calendar/trailer-modal";
import { CalendarClient } from "@/components/calendar/calendar-client";
import { CalendarRail } from "@/components/calendar/calendar-rail";
import type { CalKind } from "@/lib/calendar-constants";

export const metadata = { title: "Watch Calendar · Watchruum" };
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

  const marks: { date: string; kind: CalKind }[] = [
    ...overview.featured,
    ...overview.thisWeek,
    ...overview.mostAnticipated,
    ...overview.recentlyAdded,
    ...overview.theaters,
  ]
    .filter((i) => i.releaseDate)
    .map((i) => ({ date: i.releaseDate as string, kind: i.kind }));

  const initialTab = sp.tab && VALID_TABS.has(sp.tab) ? (sp.tab as never) : undefined;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      <AlertsProvider initialAlerts={initialAlerts} interest={interest}>
        <TrailerProvider>
          <div className="flex gap-6">
            <CalendarClient overview={overview} initial={{ tab: initialTab, genre: sp.genre, platform: sp.platform }} />
            <CalendarRail byGenre={overview.byGenre} theaters={overview.theaters} marks={marks} />
          </div>
        </TrailerProvider>
      </AlertsProvider>
    </div>
  );
}
