import { SectionHeader } from "@/components/feed/section-header";
import { RoomCard } from "@/components/feed/room-card";
import { MediaGrid } from "@/components/media/media-card";
import { trending } from "@/lib/tmdb";
import { getTrendingRooms } from "@/lib/queries";

export const metadata = { title: "Trending · Watchruum" };

export default async function TrendingPage() {
  const [rooms, media] = await Promise.all([getTrendingRooms(6), trending()]);
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Trending</h1>

      <section>
        <SectionHeader title="Hottest rooms right now" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {rooms.map((r) => (
            <RoomCard key={r.id} room={r} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Trending titles this week" />
        <MediaGrid items={media} />
      </section>
    </div>
  );
}
