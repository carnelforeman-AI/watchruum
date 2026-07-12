import { ShieldCheck, Star, MessageCircle, Users, Award } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { GenreEditor } from "@/components/profile/genre-editor";
import { Badge } from "@/components/ui/badge";
import { ReviewCard } from "@/components/feed/review-card";
import { MediaCard } from "@/components/media/media-card";
import { getUserLibrary, getSampleContent, getProfileOverview } from "@/lib/queries";
import { CURRENT_USER } from "@/lib/mock-data";

export const metadata = { title: "Profile · Watchruum" };
export const dynamic = "force-dynamic";

const STAT_ICONS = { Rooms: Users, Reviews: MessageCircle, Ratings: Star, Badges: Award } as const;

export default async function ProfilePage() {
  const [lib, sample, overview] = await Promise.all([getUserLibrary(), getSampleContent(), getProfileOverview()]);
  const signedIn = !!lib;
  const real = overview?.profile ? overview : null;

  const name = lib?.profile?.display_name ?? CURRENT_USER.display_name;
  const username = lib?.profile?.username ?? CURRENT_USER.username;
  const bio = real?.profile?.bio ?? (signedIn ? "" : CURRENT_USER.bio);
  const genres: string[] = real?.profile ? real.profile.favorite_genres : signedIn ? [] : CURRENT_USER.favorite_genres;
  const watching = signedIn && lib!.continueWatching.length ? lib!.continueWatching : sample.continueWatching;

  // Real counts when signed in; sample numbers only for the logged-out preview.
  const stats: { label: keyof typeof STAT_ICONS; value: number }[] = real
    ? [
        { label: "Rooms", value: real.stats.rooms },
        { label: "Reviews", value: real.stats.reviews },
        { label: "Ratings", value: real.stats.ratings },
        { label: "Badges", value: real.stats.badges },
      ]
    : [
        { label: "Rooms", value: 0 },
        { label: "Reviews", value: 0 },
        { label: "Ratings", value: 0 },
        { label: "Badges", value: 0 },
      ];

  const badges = real ? real.badges : [];
  const myReviews = real ? real.reviews : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <div className="panel relative overflow-hidden rounded-2xl">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/30 via-accent/20 to-transparent" />
        <div className="relative p-6 pt-10">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
            {signedIn && lib?.profile ? (
              <AvatarUploader userId={lib.profile.id} name={name} src={lib.profile.avatar_url ?? null} />
            ) : (
              <Avatar name={name} src={lib?.profile?.avatar_url} size="lg" className="size-20 text-2xl ring-4 ring-bg" />
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-extrabold tracking-tight">{name}</h1>
              <p className="text-sm text-muted">@{username}</p>
              {bio ? <p className="mt-1 text-[13px] text-foreground/80">{bio}</p> : null}
            </div>
            <Badge variant="safe">
              <ShieldCheck className="size-3" /> Spoiler-safe
            </Badge>
          </div>

          {real ? (
            <div className="mt-5">
              <GenreEditor initialGenres={genres} />
            </div>
          ) : genres.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {genres.map((g) => (
                <Badge key={g} variant="neutral">{g}</Badge>
              ))}
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => {
              const Icon = STAT_ICONS[s.label];
              return (
                <div key={s.label} className="rounded-xl border border-border-soft bg-bg-elevated p-3">
                  <Icon className="size-4 text-primary" />
                  <p className="mt-1.5 text-xl font-extrabold">{s.value}</p>
                  <p className="text-[12px] text-muted-2">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Badges</h2>
        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[13px] font-semibold text-primary">
                <Award className="size-3.5" /> {b}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted-2">
            {signedIn
              ? "No badges yet — rate episodes, write reviews, and join rooms to start earning them."
              : "Sign in to track your badges."}
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Currently watching</h2>
        {watching.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {watching.map((c) => (
              <MediaCard key={c.media.id} media={c.media} />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted-2">Nothing in progress. Mark an episode watched to see it here.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Recent reviews</h2>
        {signedIn ? (
          myReviews.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {myReviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-muted-2">You haven&apos;t written any reviews yet. Rate a show or movie to get started.</p>
          )
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {sample.reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
