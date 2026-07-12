import { Hero } from "@/components/feed/hero";
import { SectionHeader } from "@/components/feed/section-header";
import { RoomCard } from "@/components/feed/room-card";
import { CardRow } from "@/components/feed/card-row";
import { DiscussionCard } from "@/components/feed/discussion-card";
import { ReviewCard } from "@/components/feed/review-card";
import { RightRail } from "@/components/layout/right-rail";
import { getUserLibrary, getTrendingRooms, getSampleContent, getPopularReviews, getTopDiscussions } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
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
  const [lib, rooms, sample, popular, topDiscussions] = await Promise.all([
    getUserLibrary(),
    getTrendingRooms(18),
    getSampleContent(),
    getPopularReviews(2),
    getTopDiscussions(),
  ]);
  const signedIn = !!lib;
  const reviews = popular.length ? popular : sample.reviews;

  // Keep the seeded "Top Episode Discussions" until enough REAL threads exist,
  // so the section is never sparse early on. Once the threshold is crossed it
  // switches to the real most-replied threads. Tune MIN_REAL_DISCUSSIONS to taste.
  const MIN_REAL_DISCUSSIONS = 4;
  const discussions = topDiscussions.length >= MIN_REAL_DISCUSSIONS ? topDiscussions.slice(0, 4) : sample.discussions;

  // Who the viewer follows — used to scope live room presence to their friends.
  let followingIds: string[] = [];
  if (signedIn && lib?.profile) {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase.from("follows").select("following_id").eq("follower_id", lib.profile.id);
      followingIds = ((data as { following_id: string }[] | null) ?? []).map((r) => r.following_id);
    }
  }

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
            {discussions.map((d) => (
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
        followingIds={followingIds}
        safeUpTo={signedIn ? (lib!.furthest ? `${lib!.furthest.media.title} ${lib!.furthest.label.replace(" · ", " ")}` : null) : sample.safeUpTo}
        signedIn={signedIn}
      />
    </div>
  );
}
