import Link from "next/link";
import { Bookmark, PlayCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MediaCard } from "@/components/media/media-card";
import { CONTINUE_WATCHING, WATCHLIST, YOUR_PROGRESS } from "@/lib/mock-data";
import { posterGradient } from "@/lib/utils";

export const metadata = { title: "Watchlist · Watchruum" };

export default function WatchlistPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Your Library</h1>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <PlayCircle className="size-5 text-primary" /> Continue Watching
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CONTINUE_WATCHING.map((c) => (
            <Link key={c.media.id} href={`/title/${c.media.id}`} className="glass glass-hover flex items-center gap-3 rounded-2xl p-3">
              <div className="h-16 w-12 shrink-0 rounded-lg ring-1 ring-white/10" style={{ background: posterGradient(c.media.title) }} />
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
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <Bookmark className="size-5 text-primary" /> Watchlist
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {WATCHLIST.map((w) => (
            <MediaCard key={w.media.id} media={w.media} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Progress</h2>
        <Card className="divide-y divide-border-soft p-0">
          {YOUR_PROGRESS.map((p) => (
            <div key={p.media.id} className="flex items-center gap-4 p-4">
              <div className="h-14 w-10 shrink-0 rounded-lg ring-1 ring-white/10" style={{ background: posterGradient(p.media.title) }} />
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
    </div>
  );
}
