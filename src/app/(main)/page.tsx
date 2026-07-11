import { Hero } from "@/components/feed/hero";
import { SectionHeader } from "@/components/feed/section-header";
import { RoomCard } from "@/components/feed/room-card";
import { CardRow } from "@/components/feed/card-row";
import { DiscussionCard } from "@/components/feed/discussion-card";
import { ReviewCard } from "@/components/feed/review-card";
import { RightRail } from "@/components/layout/right-rail";
import { getUserLibrary, getTrendingRooms, getSampleContent, getPopularReviews } from "@/lib/queries";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

const siteJsonLd: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", name: SITE_NAME, url: SITE_URL, description: SITE_DESCRIPTION },
    { "@type": "WebSite", name: SITE_NAME, url: SITE_URL, description: SITE_DESCRIPTION },
  ],
};

export default async function HomePage() {
  const [lib, rooms, sample, popular] = await Promise.all([
    getUserLibrary(),
    getTrendingRooms(18),
    getSampleContent(),
    getPopularReviews(2),
  ]);
  const signedIn = !!lib;
  const reviews = popular.length ? popular : sample.reviews;

  return (
    <div className="flex gap-6">
      <JsonLd data={siteJsonLd} />
      <div className="min-w-0 flex-1 space-y-8 px-4 py-6 md:px-6">
        <Hero />

        <section>
          <SectionHeader title="Trending Watch Rooms" href="/trending" />
          <CardRow>
            {rooms.map((room) => (
              <div key={room.id} className="w-44 shrink-0">
                <RoomCard room={room} />
              </div>
            ))}
          </CardRow>
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
        friendsOnline={sample.friendsOnline}
        safeUpTo={signedIn ? (lib!.furthest ? `${lib!.furthest.media.title} ${lib!.furthest.label.replace(" · ", " ")}` : null) : sample.safeUpTo}
        signedIn={signedIn}
      />
    </div>
  );
}
