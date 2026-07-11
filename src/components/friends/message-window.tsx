"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, Plus, Smile, Send, CheckCheck, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Msg {
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

/** Seeded starter conversation so the window feels alive (no DM backend yet). */
function seedMessages(name: string): { day: string; msgs: Msg[] }[] {
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

/**
 * Direct-message window (styled to the mock-up). Working front end — type/send,
 * pick emoji, send a sticker, attach an image — but there's no DM backend yet,
 * so messages live in this session until a direct-messages table + realtime are
 * wired. (Real GIF search would add a Giphy/Tenor key later.)
 */
export function MessageWindow({
  name,
  username,
  avatar,
  status = "online",
  onClose,
}: {
  name: string;
  username?: string | null;
  avatar: string | null;
  status?: "online" | "away";
  onClose: () => void;
}) {
  const [groups, setGroups] = useState(() => seedMessages(name));
  const [text, setText] = useState("");
  const [picker, setPicker] = useState<"emoji" | "gif" | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (picker ? setPicker(null) : onClose());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, picker]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [groups]);

  const now = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  function push(msg: Omit<Msg, "id" | "time" | "mine" | "read">) {
    setGroups((g) => {
      const next = g.map((grp) => ({ ...grp, msgs: [...grp.msgs] }));
      const today = next.find((grp) => grp.day === "Today");
      const full: Msg = { id: `m${Date.now()}`, mine: true, time: now(), read: false, ...msg };
      if (today) today.msgs.push(full);
      else next.push({ day: "Today", msgs: [full] });
      return next;
    });
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    push({ text: body });
    setText("");
    setPicker(null);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Photos only — no PDFs or other document types.
    if (!file.type.startsWith("image/")) {
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") push({ image: reader.result });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
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

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="panel relative z-10 flex h-full w-full flex-col overflow-hidden border border-border shadow-2xl sm:h-[85vh] sm:max-w-md sm:rounded-2xl">
        {/* Header — clickable to profile */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          {username ? (
            <Link href={`/u/${username}`} onClick={onClose} className="group -mx-1 flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-0.5 hover:bg-white/5" title={`View ${name}'s profile`}>
              {Header}
            </Link>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-3">{Header}</div>
          )}
          <button onClick={onClose} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-2 hover:bg-white/5 hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4 no-scrollbar">
          {groups.map((grp) => (
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
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <form onSubmit={send} className="relative flex items-center gap-2 border-t border-border px-3 py-3">
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
                      else {
                        push({ sticker: e });
                        setPicker(null);
                      }
                    }}
                    className="grid size-8 place-items-center rounded-lg text-xl hover:bg-white/10"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="button" aria-label="Attach image" onClick={() => fileRef.current?.click()} className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-strong text-white">
            <Plus className="size-5" />
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
      </div>
    </div>
  );
}
