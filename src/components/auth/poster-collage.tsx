import { Poster } from "@/components/media/poster";
import type { MediaItem } from "@/lib/types";

/**
 * Decorative angled poster wall for the auth split-screen's left panel.
 * Uses real TMDb posters when available, otherwise original key-art.
 * Purely presentational — hidden from assistive tech.
 */
export function PosterCollage({ media }: { media: MediaItem[] }) {
  // Pad to a stable grid so the wall always looks full.
  const tiles = media.slice(0, 12);
  while (tiles.length < 12 && media.length) tiles.push(media[tiles.length % media.length]);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* Angled poster grid */}
      <div className="absolute -inset-[15%] rotate-[-8deg]">
        <div className="grid grid-cols-4 gap-3">
          {tiles.map((m, i) => (
            <Poster
              key={`${m.id}-${i}`}
              title={m.title}
              src={m.poster_url}
              genres={m.genres}
              showTitle={false}
              rounded="rounded-lg"
              className="aspect-[2/3] w-full ring-1 ring-white/10"
            />
          ))}
        </div>
      </div>
      {/* Cinematic wash so text stays legible over the posters */}
      <div className="absolute inset-0 bg-gradient-to-br from-bg/85 via-bg/70 to-primary/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-bg/40" />
    </div>
  );
}
