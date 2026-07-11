import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { posterGradient } from "@/lib/utils";
import type { GenrePreview } from "@/lib/tmdb";

/** One-line description for each browse genre. */
const DESC: Record<string, string> = {
  "Action / Adventure": "High-energy stories packed with thrills.",
  Animation: "Animated worlds, endless imagination.",
  Comedy: "Laugh out loud with the best on screen.",
  Crime: "Mysteries, investigations and crime stories.",
  Documentary: "Real stories. Real people. Real impact.",
  Drama: "Emotional stories that hit home.",
  Family: "Fun and heartwarming for all ages.",
  History: "Explore the past that shaped our world.",
  Horror: "Spine-chilling stories that haunt you.",
  Mystery: "Unsolved secrets and suspenseful twists.",
  Reality: "Unscripted drama and real competition.",
  Romance: "Love stories that steal your heart.",
  "Sci-Fi / Fantasy": "Futuristic worlds and magical adventures.",
  Thriller: "Edge-of-your-seat suspense.",
  "War / Politics": "Power, politics and high-stakes conflicts.",
  Western: "Classic tales of the frontier.",
};

export function GenreIndex({
  genres,
  previews,
}: {
  genres: { name: string }[];
  previews: Record<string, GenrePreview>;
}) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {genres.map((g) => {
        const backdrop = previews[g.name]?.backdrop ?? null;
        return (
          <Link
            key={g.name}
            href={`/genres?g=${encodeURIComponent(g.name)}`}
            className="group relative flex h-44 flex-col justify-end overflow-hidden rounded-2xl ring-1 ring-white/10 transition-transform hover:-translate-y-0.5 hover:ring-white/25"
          >
            {/* Genre artwork (TMDb) or gradient fallback */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={
                backdrop
                  ? { backgroundImage: `url(${backdrop})` }
                  : { background: posterGradient(g.name) }
              }
            />
            {/* Legibility overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/25" />

            {/* Chevron */}
            <ChevronRight className="absolute bottom-5 right-4 size-5 text-white/70 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />

            {/* Text */}
            <div className="relative z-10 p-4 pr-10">
              <h3 className="text-[17px] font-extrabold leading-tight drop-shadow">{g.name}</h3>
              <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-white/70">
                {DESC[g.name] ?? "Explore titles in this genre."}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
