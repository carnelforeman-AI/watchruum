import { ShieldCheck, Star, MessageCircle, Users, Award } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ReviewCard } from "@/components/feed/review-card";
import { MediaCard } from "@/components/media/media-card";
import { getCurrentProfile } from "@/lib/supabase/server";
import { CURRENT_USER, CONTINUE_WATCHING, POPULAR_REVIEWS } from "@/lib/mock-data";

export const metadata = { title: "Profile · Watchruum" };

const STATS = [
  { label: "Rooms", value: 24, icon: Users },
  { label: "Reviews", value: 61, icon: MessageCircle },
  { label: "Ratings", value: 318, icon: Star },
  { label: "Badges", value: 7, icon: Award },
];

const BADGES = ["Spoiler Guardian", "Finale Survivor", "Binge Master", "Early Watcher"];

export default async function ProfilePage() {
  const profile = (await getCurrentProfile()) ?? CURRENT_USER;
  const name = profile.display_name ?? CURRENT_USER.display_name;
  const username = profile.username ?? CURRENT_USER.username;
  const genres: string[] = profile.favorite_genres?.length
    ? profile.favorite_genres
    : CURRENT_USER.favorite_genres;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/30 via-accent/20 to-transparent" />
        <div className="relative p-6 pt-10">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
            <Avatar name={name} size="lg" className="size-20 text-2xl ring-4 ring-bg" />
            <div className="flex-1">
              <h1 className="text-2xl font-extrabold tracking-tight">{name}</h1>
              <p className="text-sm text-muted">@{username}</p>
              <p className="mt-1 text-[13px] text-foreground/80">{CURRENT_USER.bio}</p>
            </div>
            <Badge variant="safe">
              <ShieldCheck className="size-3" /> Spoiler-safe: strict
            </Badge>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {genres.map((g) => (
              <Badge key={g} variant="neutral">{g}</Badge>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl border border-border-soft bg-white/[0.03] p-3">
                <s.icon className="size-4 text-primary" />
                <p className="mt-1.5 text-xl font-extrabold">{s.value}</p>
                <p className="text-[12px] text-muted-2">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Badges</h2>
        <div className="flex flex-wrap gap-2">
          {BADGES.map((b) => (
            <span key={b} className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[13px] font-semibold text-primary">
              <Award className="size-3.5" /> {b}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Currently watching</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {CONTINUE_WATCHING.map((c) => (
            <MediaCard key={c.media.id} media={c.media} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Recent reviews</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {POPULAR_REVIEWS.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      </section>
    </div>
  );
}
