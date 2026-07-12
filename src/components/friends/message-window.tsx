"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { X, Plus, Smile, Send, CheckCheck, ChevronRight, ChevronUp, Minus, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useDirectMessages, type DMessage } from "@/lib/use-direct-messages";

/** Normalized shape both the live backend and the demo seed render through. */
interface UIMsg {
  id: string;
  mine: boolean;
  text?: string;
  image?: string; // data URL
  sticker?: string; // big emoji
  time: string;
  read?: boolean;
  reaction?: string;
}

const EMOJIS = "😀 😂 🥹 😍 😎 😭 😅 😊 🙌 🔥 ❤️ 👏 🎉 😮 😢 👍 🙏 💯 ✨ 🤯 😱 🥳 😴 🍿 🎬 📺 ⭐ 🤔 💜 😬".split(" ");
const STICKERS = "🎉 🔥 😂 ❤️ 👏 😱 🍿 🙌 💜 🤯 😍 😭".split(" ");

/* ---------------------------------------------------------------- helpers */

function fmtTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function dayLabel(d: Date): string {
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Group an ordered list of day-tagged messages into divider sections. */
function groupByDay(items: (UIMsg & { day: string })[]): { day: string; msgs: UIMsg[] }[] {
  const out: { day: string; msgs: UIMsg[] }[] = [];
  for (const it of items) {
    const last = out[out.length - 1];
    if (last && last.day === it.day) last.msgs.push(it);
    else out.push({ day: it.day, msgs: [it] });
  }
  return out;
}

function liveToGroups(messages: DMessage[], meId: string | null) {
  const flat = messages.map((m) => {
    const d = new Date(m.created_at);
    return {
      id: m.id,
      mine: m.sender_id === meId,
      text: m.body ?? undefined,
      image: m.image_url ?? undefined,
      sticker: m.sticker ?? undefined,
      time: fmtTime(d),
      read: !!m.read_at,
      day: dayLabel(d),
    } satisfies UIMsg & { day: string };
  });
  return groupByDay(flat);
}

/** Seeded starter conversation for demo mode (no recipient / signed-out). */
function seedGroups(name: string): { day: string; msgs: UIMsg[] }[] {
  const first = name.split(" ")[0];
  return [
    {
      day: "Earlier",
      msgs: [
        { id: "1", mine: false, text: "Hey! I saw your Quick Take about The Odyssey. Great breakdown.", time: "1:32 AM" },
        { id: "2", mine: true, text: "Thanks! I appreciate it 🙌", time: "1:33 AM", read: true },
        { id: "3", mine: false, text: "Do you think they're setting up a Season 2 already?", time: "1:34 AM" },
        { id: "4", mine: true, text: "I think so. There were too many hints in episode 4.", time: "1:35 AM", read: true },
        { id: "5", mine: false, text: "Agreed. That ending was crazy.", time: "1:35 AM", reaction: "❤️" },
        { id: "6", mine: true, text: "Can't wait to see what happens next!", time: "1:36 AM", read: true },
      ],
    },
    {
      day: "Today",
      msgs: [
        { id: "7", mine: false, text: "Hey! Watching anything good right now?", time: "10:36 AM" },
        { id: "8", mine: true, text: `Just jumped into a spoiler-safe room, ${first} — come through!`, time: "10:37 AM", read: true },
      ],
    },
  ];
}

/** Downscale a picked image so Realtime payloads stay small. Photos only. */
async function downscale(file: File, max = 1024, quality = 0.82): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  try {
    const img = document.createElement("img");
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = dataUrl;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    if (scale >= 1) return dataUrl;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return dataUrl;
  }
}

/**
 * Direct-message window.
 *
 * LIVE mode (a real `recipientId`, signed in, Supabase configured): messages
 * persist to `direct_messages`, arrive over Realtime, and read receipts flip
 * the moment the recipient opens the thread.
 *
 * DEMO mode (no recipient / signed-out): a seeded local conversation so the UI
 * is explorable without a backend. Messages live in the session only.
 */
export function MessageWindow({
  name,
  username,
  avatar,
  status = "online",
  recipientId,
  onClose,
}: {
  name: string;
  username?: string | null;
  avatar: string | null;
  status?: "online" | "away";
  recipientId?: string | null;
  onClose: () => void;
}) {
  const dm = useDirectMessages(recipientId);
  const live = dm.ready;

  // Demo-mode local conversation (ignored in live mode).
  const [demoGroups, setDemoGroups] = useState(() => seedGroups(name));
  const [text, setText] = useState("");
  const [picker, setPicker] = useState<"emoji" | "gif" | null>(null);
  const [sending, setSending] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const groups = useMemo(
    () => (live ? liveToGroups(dm.messages, dm.meId) : demoGroups),
    [live, dm.messages, dm.meId, demoGroups],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (picker ? setPicker(null) : onClose());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, picker]);

  useEffect(() => {
    if (!collapsed) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [groups, collapsed]);

  /** Demo-mode: append one of my messages to the "Today" section. */
  function pushDemo(msg: Partial<UIMsg>) {
    setDemoGroups((g) => {
      const next = g.map((grp) => ({ ...grp, msgs: [...grp.msgs] }));
      const today = next.find((grp) => grp.day === "Today");
      const full: UIMsg = { id: `m${Date.now()}`, mine: true, time: fmtTime(new Date()), read: false, ...msg };
      if (today) today.msgs.push(full);
      else next.push({ day: "Today", msgs: [full] });
      return next;
    });
  }

  async function sendText(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    setPicker(null);
    if (live) await dm.send({ body });
    else pushDemo({ text: body });
  }

  async function sendSticker(emoji: string) {
    setPicker(null);
    if (live) await dm.send({ sticker: emoji });
    else pushDemo({ sticker: emoji });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // Photos only — no PDFs or other document types.
    if (!file.type.startsWith("image/")) return;
    setSending(true);
    try {
      const url = await downscale(file);
      if (live) await dm.send({ image_url: url });
      else pushDemo({ image: url });
    } finally {
      setSending(false);
    }
  }

  const Header = (
    <>
      <Avatar name={name} src={avatar} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-[15px] font-bold">
          {name}
          {username && <ChevronRight className="size-4 shrink-0 text-muted-2 opacity-0 transition-opacity group-hover:opacity-100" />}
        </p>
        <p className="flex items-center gap-1.5 text-[12px]">
          <span className={cn("size-1.5 rounded-full", status === "online" ? "bg-safe" : "bg-warn")} />
          <span className={status === "online" ? "text-safe" : "text-warn"}>{status === "online" ? "Online" : "Away"}</span>
        </p>
      </div>
    </>
  );

  const emptyLive = live && !dm.loading && groups.length === 0;

  return (
    // Docked bottom-right chat widget — non-modal, no backdrop, so the rest of
    // the app stays clear and fully usable behind it.
    <div className="fixed inset-x-0 bottom-0 z-[70] sm:inset-x-auto sm:bottom-4 sm:right-4" role="dialog" aria-label={`Chat with ${name}`}>
      <div
        className={cn(
          "panel flex w-full flex-col overflow-hidden border border-border shadow-2xl sm:w-[380px] sm:rounded-2xl",
          collapsed ? "h-auto" : "h-[68vh] sm:h-[560px]",
        )}
      >
        {/* Header — profile link (or collapse toggle) + minimize + close */}
        <div className="flex items-center gap-1.5 border-b border-border px-3 py-2.5">
          {username ? (
            <Link href={`/u/${username}`} onClick={onClose} className="group -mx-1 flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-0.5 hover:bg-white/5" title={`View ${name}'s profile`}>
              {Header}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="-mx-1 flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-0.5 text-left hover:bg-white/5"
              title={collapsed ? "Expand" : "Collapse"}
            >
              {Header}
            </button>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand chat" : "Collapse chat"}
            title={collapsed ? "Expand" : "Collapse"}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-2 hover:bg-white/5 hover:text-foreground"
          >
            {collapsed ? <ChevronUp className="size-5" /> : <Minus className="size-5" />}
          </button>
          <button onClick={onClose} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-2 hover:bg-white/5 hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        {!collapsed && (
          <>

        {/* Messages */}
        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4 no-scrollbar">
          {live && dm.loading ? (
            <div className="grid h-full place-items-center text-muted-2">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : emptyLive ? (
            <div className="grid h-full place-items-center px-6 text-center">
              <div>
                <p className="text-[14px] font-semibold">No messages yet</p>
                <p className="mt-1 text-[12.5px] text-muted-2">Say hi to {name.split(" ")[0]} — this thread is spoiler-safe.</p>
              </div>
            </div>
          ) : (
            groups.map((grp) => (
              <div key={grp.day} className="space-y-2">
                <div className="my-2 flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[11px] font-medium text-muted-2">{grp.day}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                {grp.msgs.map((m) => (
                  <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
                    <div className="max-w-[78%]">
                      {m.sticker ? (
                        <div className={cn("text-5xl leading-none", m.mine ? "text-right" : "text-left")}>{m.sticker}</div>
                      ) : m.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.image} alt="Shared" className="max-h-56 rounded-2xl ring-1 ring-white/10" />
                      ) : (
                        <div
                          className={cn(
                            "rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug",
                            m.mine ? "rounded-br-md bg-primary text-white" : "rounded-bl-md bg-white/[0.06] text-foreground",
                          )}
                        >
                          {m.text}
                        </div>
                      )}
                      <div className={cn("mt-1 flex items-center gap-1 px-1 text-[11px] text-muted-2", m.mine ? "justify-end" : "justify-start")}>
                        <span>{m.time}</span>
                        {m.mine && <CheckCheck className={cn("size-3.5", m.read ? "text-accent" : "text-muted-2")} />}
                      </div>
                      {m.reaction && (
                        <div className={cn("mt-0.5 flex", m.mine ? "justify-end" : "justify-start")}>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-1.5 py-0.5 text-[11px]">{m.reaction} 1</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <form onSubmit={sendText} className="relative flex items-center gap-2 border-t border-border px-3 py-3">
          {/* Emoji / GIF picker popovers */}
          {picker && (
            <div className="absolute bottom-full right-2 mb-2 w-64 rounded-2xl border border-border bg-bg-elevated p-2 shadow-2xl">
              <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                {picker === "emoji" ? "Emoji" : "Stickers"}
              </p>
              <div className="grid grid-cols-6 gap-1">
                {(picker === "emoji" ? EMOJIS : STICKERS).map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      if (picker === "emoji") setText((t) => t + e);
                      else void sendSticker(e);
                    }}
                    className="grid size-8 place-items-center rounded-lg text-xl hover:bg-white/10"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="button" aria-label="Attach photo" title="Attach photo" onClick={() => fileRef.current?.click()} disabled={sending} className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-strong text-white disabled:opacity-50">
            {sending ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />

          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="h-10 min-w-0 flex-1 rounded-full border border-border bg-white/[0.03] px-4 text-sm placeholder:text-muted-2 focus:border-primary/60 focus:outline-none"
          />

          <button type="button" aria-label="Emoji" onClick={() => setPicker((p) => (p === "emoji" ? null : "emoji"))} className={cn("grid size-8 shrink-0 place-items-center rounded-lg hover:text-foreground", picker === "emoji" ? "text-primary" : "text-muted-2")}>
            <Smile className="size-5" />
          </button>
          <button type="button" aria-label="Stickers" onClick={() => setPicker((p) => (p === "gif" ? null : "gif"))} className={cn("hidden shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold sm:inline", picker === "gif" ? "border-primary text-primary" : "border-border text-muted-2 hover:text-foreground")}>
            GIF
          </button>
          <button type="submit" disabled={!text.trim()} aria-label="Send" className="grid size-9 shrink-0 place-items-center rounded-full text-primary transition-colors hover:bg-primary/15 disabled:opacity-40">
            <Send className="size-5" />
          </button>
        </form>
          </>
        )}
      </div>
    </div>
  );
}
