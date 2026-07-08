import { cn } from "@/lib/utils";
import { CinematicPoster } from "./cinematic-poster";

/**
 * Copyright-safe poster: uses a real TMDb image if provided, otherwise
 * generates original cinematic key-art with <CinematicPoster>.
 */
export function Poster({
  title,
  src,
  genres,
  className,
  rounded = "rounded-xl",
  showTitle = true,
}: {
  title: string;
  src?: string | null;
  genres?: string[];
  className?: string;
  rounded?: string;
  showTitle?: boolean;
}) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden", rounded, className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={title} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden", rounded, className)}>
      <CinematicPoster title={title} genres={genres} showTitle={showTitle} className="absolute inset-0" />
    </div>
  );
}
