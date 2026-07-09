import { ShieldCheck, Pencil, Layers, Clapperboard, Lock } from "lucide-react";
import { SPOILER_LEVELS, spoilerLevelDetail, spoilerMeta } from "@/lib/spoiler";
import type { SpoilerState } from "@/lib/types";

const ICON = {
  shield: ShieldCheck,
  episode: Pencil,
  season: Layers,
  series: Clapperboard,
  lock: Lock,
} as const;

/**
 * The Spoiler Protection legend — the standard spoiler taxonomy shown on the
 * room right rail and anywhere the scale needs explaining. Single source of
 * truth: colors/labels/order come from spoiler.ts.
 */
const MOVIE_LEVELS: { state: SpoilerState; label: string; detail: string; icon: "shield" | "series" | "lock" }[] = [
  { state: "safe", label: "Safe Zone", detail: "Spoiler-free talk", icon: "shield" },
  { state: "series", label: "Spoilers", detail: "Hidden until you watch", icon: "series" },
  { state: "locked", label: "Locked", detail: "Not watched yet", icon: "lock" },
];

export function SpoilerLegend({
  season,
  episode,
  isMovie = false,
  className = "",
}: {
  season: number | null;
  episode: number | null;
  isMovie?: boolean;
  className?: string;
}) {
  const levels = isMovie
    ? MOVIE_LEVELS.map((l) => ({ state: l.state, label: l.label, color: spoilerMeta(l.state).color, icon: l.icon, detail: l.detail }))
    : SPOILER_LEVELS.map((l) => ({ ...l, detail: spoilerLevelDetail(l.state, season, episode) }));

  return (
    <div className={`glass rounded-2xl p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold">Spoiler Protection</h3>
        <span className="text-[12px] font-semibold text-primary">How it works</span>
      </div>
      <ul className="space-y-3.5">
        {levels.map((lvl) => {
          const Icon = ICON[lvl.icon];
          return (
            <li key={lvl.state} className="flex items-center gap-3">
              <span
                className="grid size-8 shrink-0 place-items-center rounded-lg"
                style={{ background: `${lvl.color}22`, color: lvl.color, boxShadow: `inset 0 0 0 1px ${lvl.color}55` }}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-tight">{lvl.label}</p>
                <p className="text-[12px] text-muted-2">{lvl.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * A small spoiler tag chip for a post/review/comment. Uses the standard color
 * for the given state so tags read consistently everywhere.
 */
export function SpoilerTag({ state, label }: { state: SpoilerState; label: string }) {
  const meta = spoilerMeta(state);
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold"
      style={{ color: meta.color, background: `${meta.color}22`, boxShadow: `inset 0 0 0 1px ${meta.color}55` }}
    >
      {state !== "safe" && <Lock className="size-3" />}
      {label}
    </span>
  );
}

/** The "Safe Zone" pill used in headers. */
export function SafeZonePill({ label = "Safe Zone" }: { label?: string }) {
  const meta = spoilerMeta("safe");
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold"
      style={{ color: meta.color, background: `${meta.color}1f`, boxShadow: `inset 0 0 0 1px ${meta.color}55` }}
    >
      <ShieldCheck className="size-3.5" /> {label}
    </span>
  );
}
