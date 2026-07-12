"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FriendOnline } from "@/lib/queries";

/** The shared room-presence channel. Broadcasters track their location here;
 *  observers read it and filter down to the people they follow. */
export const PRESENCE_CHANNEL = "presence:rooms";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Observe live room presence and return the followed friends who are currently
 * in a room. Empty when the viewer follows no one or nobody's around — the
 * caller falls back to its seeded list in that case.
 *
 * Privacy: a user only appears here if *their* client is broadcasting, which it
 * only does when their "Show my current room" setting is on. Visibility is then
 * scoped to people the viewer follows.
 */
export function useFriendsPresence(followingIds: string[]): FriendOnline[] {
  const [supabase] = useState(() => createClient());
  const [present, setPresent] = useState<FriendOnline[]>([]);
  const idsKey = followingIds.join(",");

  useEffect(() => {
    if (!supabase || !idsKey) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setPresent([]);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    const allow = new Set(idsKey.split(","));
    const channel = supabase.channel(PRESENCE_CHANNEL);

    const sync = () => {
      const state = channel.presenceState() as Record<string, any[]>;
      const seen = new Map<string, FriendOnline>();
      for (const key of Object.keys(state)) {
        for (const entry of state[key]) {
          const uid = entry.userId as string | undefined;
          if (!uid || !allow.has(uid) || seen.has(uid)) continue;
          seen.set(uid, {
            name: entry.displayName ?? "Friend",
            username: entry.username ?? null,
            userId: uid,
            avatar: entry.avatar ?? null,
            room: entry.room ?? "a room",
            roomHref: entry.roomHref ?? null,
            status: entry.status === "away" ? "away" : "online",
          });
        }
      }
      setPresent([...seen.values()]);
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, idsKey]);

  return present;
}
