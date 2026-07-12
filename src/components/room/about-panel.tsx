"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Users, Info, ScrollText, ExternalLink, Flag, Check, Clapperboard } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { compact } from "@/lib/utils";

const RULES = [
  "No spoilers beyond this room's episode. Tag anything ahead.",
  "No illegal streaming links or pirated clips.",
  "Be respectful — debate the show, not each other.",
  "Use the spoiler toggle when in doubt.",
];

export function AboutPanel({
  titleId,
  title,
  isMovie,
  releaseYear,
  safeLabel,
  spoilerLine,
  memberCount,
  onlineCount,
  createdBy,
}: {
  titleId: string;
  title: string;
  isMovie: boolean;
  releaseYear: number | null;
  safeLabel: string;
  spoilerLine: string;
  memberCount: number;
  onlineCount: number;
  createdBy: { username: string; display_name: string } | null;
}) {
  const [reported, setReported] = useState(false);
  const justWatch = `https://www.justwatch.com/us/search?q=${encodeURIComponent(title)}`;
  const roomName = `${title}${isMovie ? "" : ` ${safeLabel}`} Room`;

  return (
    <div className="space-y-4">
      {/* Identity */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-snug">{roomName}</h2>
            <p className="mt-0.5 text-[13px] text-muted-2">
              {[isMovie ? "Movie" : "TV Show", releaseYear].filter(Boolean).join(" · ")}
              {!isMovie && safeLabel ? ` · ${safeLabel}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Members" value={compact(memberCount)} />
          <Stat label="Online now" value={compact(onlineCount)} accent />
          <Stat label="Spoiler level" value={isMovie ? "Film" : safeLabel || "Episode"} />
          <Stat label="Type" value={isMovie ? "Movie room" : "Episode room"} />
        </div>
      </div>

      {/* Spoiler level */}
      <div className="glass rounded-2xl p-5">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="size-4 text-safe" />
          <h3 className="text-[15px] font-bold">Spoiler level</h3>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-safe/25 bg-safe/10 px-4 py-3">
          <p className="text-[13.5px] font-medium text-foreground">{spoilerLine}</p>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-safe/20 px-2 py-1 text-[11px] font-bold text-safe">
            <ShieldCheck className="size-3" /> Safe
          </span>
        </div>
      </div>

      {/* Rules */}
      <div className="glass rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <ScrollText className="size-4 text-primary" />
          <h3 className="text-[15px] font-bold">Room rules</h3>
        </div>
        <ol className="space-y-2">
          {RULES.map((r, i) => (
            <li key={i} className="flex gap-2.5 text-[13.5px] text-muted">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[11px] font-bold text-muted-2">
                {i + 1}
              </span>
              <span>{r}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Moderation + meta */}
      <div className="glass rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <h3 className="text-[15px] font-bold">Moderators &amp; members</h3>
        </div>
        {createdBy ? (
          <Link href={`/u/${createdBy.username}`} className="flex items-center gap-2.5 rounded-xl p-1 hover:bg-white/[0.04]">
            <Avatar name={createdBy.display_name} size="sm" />
            <div>
              <p className="text-[13.5px] font-semibold">{createdBy.display_name}</p>
              <p className="text-[11.5px] text-muted-2">Room creator · community-moderated</p>
            </div>
          </Link>
        ) : (
          <p className="text-[13px] text-muted-2">This room is community-moderated. Report anything that breaks the rules.</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/title/${titleId}#rooms`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-4 py-2.5 text-[13px] font-semibold hover:bg-white/[0.07]"
        >
          <Clapperboard className="size-4" /> Related rooms
        </Link>
        <a
          href={justWatch}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-4 py-2.5 text-[13px] font-semibold hover:bg-white/[0.07]"
        >
          <ExternalLink className="size-4" /> Where to watch
        </a>
        <button
          onClick={() => setReported(true)}
          disabled={reported}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-4 py-2.5 text-[13px] font-semibold text-muted hover:text-danger disabled:opacity-60"
        >
          {reported ? <Check className="size-4 text-safe" /> : <Flag className="size-4" />}
          {reported ? "Reported — thanks" : "Report room"}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-white/[0.02] px-3 py-2.5">
      <p className={accent ? "text-[15px] font-bold text-safe" : "text-[15px] font-bold"}>{value}</p>
      <p className="text-[11px] text-muted-2">{label}</p>
    </div>
  );
}
