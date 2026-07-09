import Link from "next/link";
import { Bookmark, PlayCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Poster } from "@/components/media/poster";
import { MediaCard } from "@/components/media/media-card";
import { getUserLibrary, getSampleContent } from "@/lib/queries";

export const metadata = { title: "Watchlist · Watchruum" };

export default async function WatchlistPage() {
  const lib = await getUserLibrary();
  const signedIn = !!lib;
  const sample = signedIn ? null : await getSampleContent();

  const continueWatching = signedIn ? lib!.continueWatching : sample!.continueWatching;
  const watchlist = signedIn ? lib!.watchlist : sample!.watchlist;
  const progress = signedIn ? lib!.continueWatching : sample!.progress;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Your Library</h1>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <PlayCircle className="size-5 text-primary" /> Continue Watching
        </h2>
        {continueWatching.length === 0 ? (
          <Empty text="Mark an episode watched and it'll show up here." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {continueWatching.map((c) => (
              <Link key={c.media.id} href={`/title/${c.media.id}`} className="glass glass-hover flex items-center gap-3 rounded-2xl p-3">
                <Poster title={c.media.title} src={c.media.poster_url} genres={c.media.genres} showTitle={false} rounded="rounded-lg" className="h-16 w-12 shrink-0 ring-1 ring-white/10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.media.title}</p>
                  <p className="truncate text-[12px] text-muted-2">{c.label}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={c.percent} />
                    <span className="text-[11px] font-semibold text-muted">{c.percent}%</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <Bookmark className="size-5 text-primary" /> Watchlist
        </h2>
        {watchlist.length === 0 ? (
          <Empty text="Add shows and movies from Discover to build your watchlist." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {watchlist.map((m) => (
              <MediaCard key={m.id} media={m} />
            ))}
          </div>
        )}
      </section>

      {progress.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Progress</h2>
          <Card className="divide-y divide-border-soft p-0">
            {progress.map((p) => (
              <div key={p.media.id} className="flex items-center gap-4 p-4">
                <Poster title={p.media.title} src={p.media.poster_url} genres={p.media.genres} showTitle={false} rounded="rounded-lg" className="h-14 w-10 shrink-0 ring-1 ring-white/10" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.media.title}</p>
                  <p className="text-[12px] text-muted-2">{p.label}</p>
                </div>
                <div className="flex w-40 items-center gap-2">
                  <Progress value={p.percent} />
                  <span className="text-[12px] font-semibold text-muted">{p.percent}%</span>
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Card className="p-8 text-center">
      <p className="text-sm text-muted-2">{text}</p>
    </Card>
  );
}
