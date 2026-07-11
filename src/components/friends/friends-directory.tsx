"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Search, UserPlus, UserCheck, Users, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toggleFollow, searchMembers } from "@/app/actions";

export interface Person {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  genres: string[];
  followed: boolean;
}

export function FriendsDirectory({
  people,
  signedIn,
  embedded = false,
}: {
  people: Person[];
  signedIn: boolean;
  embedded?: boolean;
}) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<Person[]>(people);
  const [searching, setSearching] = useState(false);
  const [follows, setFollows] = useState<Record<string, boolean>>(
    () => Object.fromEntries(people.map((p) => [p.id, p.followed])),
  );
  const [, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  function onChange(value: string) {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    const mine = ++seq.current;
    setSearching(true);
    timer.current = setTimeout(async () => {
      const res = await searchMembers(value);
      if (mine !== seq.current) return; // a newer keystroke won
      setList(res);
      setFollows((f) => {
        const next = { ...f };
        for (const p of res) if (!(p.id in next)) next[p.id] = p.followed;
        return next;
      });
      setSearching(false);
    }, 220);
  }

  function toggle(p: Person) {
    const next = !follows[p.id];
    setFollows((f) => ({ ...f, [p.id]: next }));
    start(() => {
      void toggleFollow(p.id, next);
    });
  }

  return (
    <div className={embedded ? "" : "mx-auto max-w-4xl px-4 py-6 md:px-6"}>
      {!embedded && (
        <>
          <div className="mb-1 flex items-center gap-2">
            <Users className="size-6 text-primary" />
            <h1 className="text-2xl font-extrabold tracking-tight">Find Friends</h1>
          </div>
          <p className="mb-5 text-[13px] text-muted-2">
            Follow other fans to see their activity and watch alongside people at your episode.
          </p>
        </>
      )}

      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
        <input
          value={q}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search members by name or @username…"
          className="w-full rounded-xl border border-border bg-white/[0.03] py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-primary/60"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-2" />
        )}
      </div>

      {list.length === 0 ? (
        <div className="glass grid place-items-center rounded-2xl py-16 text-center">
          <Users className="mb-2 size-8 text-muted-2" />
          <p className="font-semibold">{q.trim() ? "No members found" : "No members yet"}</p>
          <p className="mt-1 text-[13px] text-muted-2">
            {q.trim() ? "Try a different name or @username." : "Invite some friends to get started!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {list.map((p) => {
            const following = follows[p.id];
            return (
              <div key={p.id} className="glass flex items-center gap-3 rounded-2xl p-4">
                <Link href={`/u/${p.username}`} className="shrink-0">
                  <Avatar name={p.display_name} src={p.avatar_url} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${p.username}`} className="block">
                    <p className="truncate text-sm font-bold hover:underline">{p.display_name}</p>
                    <p className="truncate text-[12px] text-muted-2">@{p.username}</p>
                  </Link>
                  {p.genres.length > 0 && (
                    <p className="mt-1 truncate text-[11.5px] text-muted-2">{p.genres.slice(0, 3).join(" · ")}</p>
                  )}
                </div>
                {signedIn && (
                  <button
                    onClick={() => toggle(p)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold transition-colors",
                      following
                        ? "border border-border bg-white/[0.03] text-muted hover:text-foreground"
                        : "bg-primary text-white hover:bg-primary-strong",
                    )}
                  >
                    {following ? (
                      <>
                        <UserCheck className="size-3.5" /> Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="size-3.5" /> Follow
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
