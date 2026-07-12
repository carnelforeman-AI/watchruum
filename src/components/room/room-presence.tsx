"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PRESENCE_CHANNEL } from "@/lib/use-presence";

/**
 * Broadcasts "I'm in this room" over Realtime presence while mounted. Renders
 * nothing. Drop it on a room page.
 *
 * `enabled` must fold in the privacy gate: pass it `true` only when the viewer
 * is signed in AND their "Show my current room" setting is on. When it's false
 * the component never joins the channel, so the user is invisible at the source.
 */
export function RoomPresence({
  enabled,
  userId,
  username,
  displayName,
  avatar,
  room,
  roomHref,
}: {
  enabled: boolean;
  userId: string | null;
  username: string | null;
  displayName: string;
  avatar: string | null;
  room: string;
  roomHref: string;
}) {
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (!enabled || !supabase || !userId) return;

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: userId } },
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void channel.track({ userId, username, displayName, avatar, room, roomHref, status: "online" });
      }
    });

    return () => {
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [enabled, supabase, userId, username, displayName, avatar, room, roomHref]);

  return null;
}
