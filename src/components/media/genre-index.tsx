import Link from "next/link";
import {
  Swords,
  Clapperboard,
  Laugh,
  Siren,
  FileText,
  Drama,
  Users,
  Landmark,
  Skull,
  Search,
  Tv,
  Heart,
  Rocket,
  Crosshair,
  Flag,
  Mountain,
  ChevronRight,
} from "lucide-react";
import { posterGradient, compact } from "@/lib/utils";
import type { GenrePreview } from "@/lib/tmdb";

interface GenreMeta {
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  color: string; // accent for the icon + count
}

/** Icon, one-liner and accent colour for each browse genre. */
const META: Record<string, GenreMeta> = {
  "Action / Adventure": { icon: Swords, desc: "High-energy stories packed with thrills.", color: "#8b5cf6" },
  Animation: { icon: Clapperboard, desc: "Animated worlds, endless imagination.", color: "#f59e0b" },
  Comedy: { icon: Laugh, desc: "Laugh out loud with the best on screen.", color: "#fb923c" },
  Crime: { icon: Siren, desc: "Mysteries, investigations and crime stories.", color: "#22c55e" },
  Documentary: { icon: FileText, desc: "Real stories. Real people. Real impact.", color: "#38bdf8" },
  Drama: { icon: Drama, desc: "Emotional stories that hit home.", color: "#10b981" },
  Family: { icon: Users, desc: "Fun and heartwarming for all ages.", color: "#ec4899" },
  History: { icon: Landmark, desc: "Explore the past that shaped our world.", color: "#a78bfa" },
  Horror: { icon: Skull, desc: "Spine-chilling stories that haunt you.", color: "#2dd4bf" },
  Mystery: { icon: Search, desc: "Unsolved secrets and suspenseful twists.", color: "#818cf8" },
  Reality: { icon: Tv, desc: "Unscripted drama and real competition.", color: "#fb7185" },
  Romance: { icon: Heart, desc: "Love stories that steal your heart.", color: "#ef4444" },
  "Sci-Fi / Fantasy": { icon: Rocket, desc: "Futuristic worlds and magical adventures.", color: "#d946ef" },
  Thriller: { icon: Crosshair, desc: "Edge-of-your-seat suspense.", color: "#84cc16" },
  "War / Politics": { icon: Flag, desc: "Power, politics and high-stakes conflicts.", color: "#3b82f6" },
  Western: { icon: Mountain, desc: "Classic tales of the frontier.", color: "#f97316" },
};

const FALLBACK: GenreMeta = { icon: Clapperboard, desc: "Explore titles in this genre.", color: "#8b5cf6" };

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
        const meta = META[g.name] ?? FALLBACK;
        const Icon = meta.icon;
        const preview = previews[g.name];
        const backdrop = preview?.backdrop ?? null;
        const count = preview?.count ?? 0;

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

            {/* Icon badge */}
            <span
              className="absolute left-4 top-4 grid size-9 place-items-center rounded-xl ring-1 ring-white/15 backdrop-blur-sm"
              style={{ backgroundColor: `${meta.color}33`, color: meta.color }}
            >
              <Icon className="size-[18px]" />
            </span>

            {/* Chevron */}
            <ChevronRight className="absolute bottom-5 right-4 size-5 text-white/70 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />

            {/* Text */}
            <div className="relative z-10 p-4 pr-10">
              <h3 className="text-[17px] font-extrabold leading-tight drop-shadow">{g.name}</h3>
              <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-white/70">{meta.desc}</p>
              {count > 0 && (
                <p className="mt-2 text-[12.5px] font-bold" style={{ color: meta.color }}>
                  {compact(count)} titles
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
