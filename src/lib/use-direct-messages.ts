"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { notifyDirectMessage } from "@/app/dm-actions";

/** A row of the `direct_messages` table. */
export interface DMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string | null;
  image_url: string | null;
  sticker: string | null;
  created_at: string;
  read_at: string | null;
}

export interface DMPayload {
  body?: string;
  image_url?: string;
  sticker?: string;
}

export interface UseDirectMessages {
  /** True only when a real backend is available, the user is signed in,
   *  and we have a recipient — i.e. live mode. False => caller uses demo. */
  ready: boolean;
  loading: boolean;
  meId: string | null;
  messages: DMessage[];
  error: string | null;
  send: (payload: DMPayload) => Promise<boolean>;
}

/**
 * Live 1:1 direct messages backed by Supabase + Realtime.
 *
 * - Loads the conversation history between the signed-in user and `recipientId`.
 * - Subscribes to Realtime: new INSERTs addressed to me (incoming), and UPDATEs
 *   on my sent messages (read receipts — read_at flipping).
 * - Marks the other person's messages read as soon as the thread is open, which
 *   is the UPDATE the sender hears to turn their checkmarks "read".
 *
 * When there's no recipient, no browser client (unconfigured), or no signed-in
 * user, `ready` stays false and the window falls back to its demo behaviour.
 */
export function useDirectMessages(recipientId: string | null | undefined): UseDirectMessages {
  const [meId, setMeId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(!!recipientId);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One stable browser client for the lifetime of the hook (null = unconfigured).
  const [supabase] = useState(() => createClient());

  const upsert = useCallback((row: DMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === row.id)) {
        return prev.map((m) => (m.id === row.id ? row : m));
      }
      const next = [...prev, row];
      next.sort((a, b) => a.created_at.localeCompare(b.created_at));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!recipientId || !supabase) {
      // No live target — stay in demo mode. Reset in case a previous
      // conversation left this hook live.
      /* eslint-disable react-hooks/set-state-in-effect */
      setReady(false);
      setLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    let cancelled = false;
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user) {
        // Not signed in — no live DMs, fall back to demo.
        setReady(false);
        setLoading(false);
        return;
      }
      const me = user.id;
      setMeId(me);

      // 1) History (both directions).
      const { data, error: histErr } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${me},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${me})`,
        )
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (histErr) {
        setError(histErr.message);
        setReady(false);
        setLoading(false);
        return;
      }

      setMessages((data as DMessage[]) ?? []);
      setReady(true);
      setLoading(false);

      // 2) Mark anything they sent me as read (fires the sender's receipt).
      await supabase.rpc("mark_conversation_read", { other: recipientId });

      // 3) Realtime: incoming messages to me + read receipts on my messages.
      channel = supabase
        .channel(`dm:${me < recipientId ? me + "_" + recipientId : recipientId + "_" + me}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${me}` },
          (payload) => {
            const row = payload.new as DMessage;
            if (row.sender_id !== recipientId) return; // a different conversation
            upsert(row);
            // Thread is open — mark it read right away.
            void supabase.rpc("mark_conversation_read", { other: recipientId });
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "direct_messages", filter: `sender_id=eq.${me}` },
          (payload) => {
            const row = payload.new as DMessage;
            if (row.recipient_id !== recipientId) return;
            upsert(row); // read_at just changed => checkmarks flip
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [recipientId, supabase, upsert]);

  const send = useCallback(
    async (payload: DMPayload): Promise<boolean> => {
      if (!supabase || !meId || !recipientId) return false;
      const row = {
        sender_id: meId,
        recipient_id: recipientId,
        body: payload.body ?? null,
        image_url: payload.image_url ?? null,
        sticker: payload.sticker ?? null,
      };
      const { data, error: sendErr } = await supabase
        .from("direct_messages")
        .insert(row)
        .select("*")
        .single();
      if (sendErr) {
        setError(sendErr.message);
        return false;
      }
      if (data) upsert(data as DMessage); // my own insert doesn't echo back via Realtime
      // Fan out to the recipient (in-app notification + phone push). Best-effort.
      const preview = payload.body?.trim() || (payload.sticker ? payload.sticker : payload.image_url ? "📷 Photo" : "New message");
      void notifyDirectMessage(recipientId, preview);
      return true;
    },
    [supabase, meId, recipientId, upsert],
  );

  return { ready, loading, meId, messages, error, send };
}
