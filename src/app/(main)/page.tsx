import { Hero } from "@/components/feed/hero";
import { SectionHeader } from "@/components/feed/section-header";
import { RoomCard } from "@/components/feed/room-card";
import { DiscussionCard } from "@/components/feed/discussion-card";
import { ReviewCard } from "@/components/feed/review-card";
import { RightRail } from "@/components/layout/right-rail";
import { getUserLibrary, getTrendingRooms, getSampleContent, getPopularReviews } from "@/lib/queries";

export default async function HomePage() {
  const [lib, rooms, sample, popular] = await Promise.all([
    getUserLibrary(),
    getTrendingRooms(6),
    getSampleContent(),
    getPopularReviews(2),
  ]);
  const signedIn = !!lib;
  const reviews = popular.length ? popular : sample.reviews;

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-8 px-4 py-6 md:px-6">
        <Hero />

        <section>
          <SectionHeader title="Trending Watch Rooms" href="/trending" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="Top Episode Discussions" href="/rooms" />
          <div className="grid gap-3 md:grid-cols-2">
            {sample.discussions.map((d) => (
              <DiscussionCard key={d.id} d={d} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="Popular Reviews" href="/explore" />
          <div className="grid gap-3 md:grid-cols-2">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        </section>
      </div>

      <RightRail
        progress={signedIn ? lib!.continueWatching : sample.progress}
        friendActivity={sample.friendActivity}
        safeUpTo={signedIn ? (lib!.furthest ? `${lib!.furthest.media.title} ${lib!.furthest.label.replace(" · ", " ")}` : null) : sample.safeUpTo}
        signedIn={signedIn}
      />
    </div>
  );
}
