import { SectionHeader } from "@/components/feed/section-header";
import { RoomCard } from "@/components/feed/room-card";
import { DiscussionCard } from "@/components/feed/discussion-card";
import { getTrendingRooms, getSampleContent } from "@/lib/queries";

export const metadata = { title: "Watch Rooms · Watchruum" };

export default async function RoomsPage() {
  const [rooms, sample] = await Promise.all([getTrendingRooms(6), getSampleContent()]);
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Watch Rooms</h1>
        <p className="mt-1 text-sm text-muted">
          Jump into a room for the exact episode you&apos;re on. Everything stays spoiler-safe.
        </p>
      </div>

      <section>
        <SectionHeader title="Active rooms" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {rooms.map((r) => (
            <RoomCard key={r.id} room={r} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Latest episode discussions" />
        <div className="grid gap-3 md:grid-cols-2">
          {sample.discussions.map((d) => (
            <DiscussionCard key={d.id} d={d} />
          ))}
        </div>
      </section>
    </div>
  );
}
