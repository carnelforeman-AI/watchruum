"use client";

import { useRef, useState, useTransition } from "react";
import { Image as ImageIcon, Film, Loader2, Shield, ShieldAlert, X, Globe, Search, Smile, ListPlus, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Poster } from "@/components/media/poster";
import { cn } from "@/lib/utils";
import { createLobbyPost, searchTitles } from "@/app/(main)/lobby/actions";
import { GifPicker } from "./gif-picker";
import type { LobbyAuthor, LobbyPost, TitleHit } from "@/lib/lobby-types";

const MAX = 1000;

async function downscale(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("bad image"));
      i.src = url;
    });
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function LobbyComposer({
  me,
  demo,
  onPosted,
  compact = false,
  replyTo = null,
  placeholder = "What are you watching, hyped for, or thinking about?",
}: {
  me: LobbyAuthor | null;
  demo: boolean;
  onPosted: (p: LobbyPost) => void;
  compact?: boolean;
  replyTo?: string | null;
  placeholder?: string;
}) {
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [media, setMedia] = useState<TitleHit | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // Title tagging
  const [tagOpen, setTagOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<TitleHit[]>([]);
  const [searching, startSearch] = useTransition();

  const canPost = (body.trim().length > 0 || !!image) && !pending;

  const runSearch = (value: string) => {
    setQ(value);
    if (value.trim().length < 2) {
      setHits([]);
      return;
    }
    startSearch(async () => setHits(await searchTitles(value)));
  };

  const submit = () => {
    if (!canPost) return;
    setErr(null);
    if (demo || !me) {
      // Pre-launch: optimistic local post so it feels live, but nothing persists.
      onPosted({
        id: `local-${body.slice(0, 6)}-${body.length}`,
        author: me ?? { username: "you", display_name: "You", avatar_url: null },
        body: body.trim() || null,
        spoiler,
        media: media ? { id: media.id, title: media.title, type: media.type } : null,
        image_url: image,
        created_at: "now",
        replyTo,
        likeCount: 0,
        repostCount: 0,
        replyCount: 0,
        liked: false,
        reposted: false,
        bookmarked: false,
        demo: true,
      });
      reset();
      return;
    }
    start(async () => {
      const res = await createLobbyPost({
        body,
        spoiler,
        mediaId: media?.id ?? null,
        mediaTitle: media?.title ?? null,
        mediaType: media?.type ?? null,
        imageUrl: image,
        replyTo,
      });
      if (res.ok) {
        onPosted(res.post);
        reset();
      } else {
        setErr(res.error);
      }
    });
  };

  const reset = () => {
    setBody("");
    setSpoiler(false);
    setMedia(null);
    setImage(null);
    setGifOpen(false);
    setTagOpen(false);
    setQ("");
    setHits([]);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    try {
      setImage(await downscale(f));
    } catch {
      setErr("Couldn't add that image.");
    }
  };

  return (
    <div className={cn("glass rounded-2xl p-4", compact && "rounded-xl p-3")}>
      <div className="flex gap-3">
        <Avatar name={me?.display_name ?? "You"} src={me?.avatar_url ?? null} className="size-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX))}
            placeholder={placeholder}
            rows={compact ? 2 : 2}
            className="w-full resize-none bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-2"
          />

          {/* Attached media chip */}
          {media && (
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-white/[0.03] p-1.5 pr-2 text-[12px]">
              <Poster title={media.title} src={media.poster} genres={[]} showTitle={false} rounded="rounded-md" className="h-9 w-7" />
              <span className="font-semibold">{media.title}</span>
              <span className="text-muted-2">{media.type === "movie" ? "Movie" : "Show"}</span>
              <button onClick={() => setMedia(null)} className="ml-auto text-muted-2 hover:text-danger" aria-label="Remove title">
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {/* Attached image */}
          {image && (
            <div className="relative mt-2 w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="attachment" className="max-h-64 rounded-xl border border-border" />
              <button
                onClick={() => setImage(null)}
                className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label="Remove image"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {/* Title search */}
          {tagOpen && (
            <div className="mt-2 rounded-xl border border-border bg-white/[0.03] p-2">
              <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-1.5">
                <Search className="size-4 text-muted-2" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => runSearch(e.target.value)}
                  placeholder="Search a show or movie…"
                  className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted-2"
                />
                {searching && <Loader2 className="size-4 animate-spin text-muted-2" />}
              </div>
              {hits.length > 0 && (
                <div className="mt-1.5 max-h-56 space-y-0.5 overflow-y-auto">
                  {hits.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => {
                        setMedia(h);
                        setTagOpen(false);
                        setQ("");
                        setHits([]);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left hover:bg-white/5"
                    >
                      <Poster title={h.title} src={h.poster} genres={[]} showTitle={false} rounded="rounded-md" className="h-10 w-7" />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold">{h.title}</span>
                        <span className="text-[11px] text-muted-2">
                          {h.type === "movie" ? "Movie" : "Show"}
                          {h.year ? ` · ${h.year}` : ""}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* GIF picker */}
          {gifOpen && (
            <GifPicker
              onSelect={(url) => {
                setImage(url);
                setGifOpen(false);
              }}
              onClose={() => setGifOpen(false)}
            />
          )}

          {err && <p className="mt-2 text-[12px] font-medium text-danger">{err}</p>}

          {/* Toolbar */}
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border-soft pt-2.5">
            <div className="flex items-center gap-0.5 text-primary">
              <ToolBtn label="Add image" onClick={() => fileRef.current?.click()}>
                <ImageIcon className="size-[18px]" />
              </ToolBtn>
              <ToolBtn label="Add a GIF" active={gifOpen} onClick={() => setGifOpen((v) => !v)}>
                <span className="text-[11px] font-extrabold leading-none tracking-tight">GIF</span>
              </ToolBtn>
              <ToolBtn label="Tag a show or movie" active={tagOpen || !!media} onClick={() => setTagOpen((v) => !v)}>
                <Film className="size-[18px]" />
              </ToolBtn>
              <ToolBtn label="Poll (coming soon)" disabled>
                <ListPlus className="size-[18px]" />
              </ToolBtn>
              <ToolBtn label="Emoji (coming soon)" disabled>
                <Smile className="size-[18px]" />
              </ToolBtn>
              <ToolBtn label={spoiler ? "Spoiler on" : "Mark as spoiler"} active={spoiler} onClick={() => setSpoiler((v) => !v)}>
                {spoiler ? <ShieldAlert className="size-[18px]" /> : <Shield className="size-[18px]" />}
              </ToolBtn>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
            </div>

            <div className="flex items-center gap-2">
              {!compact && (
                <span className="hidden items-center gap-1 rounded-lg border border-border px-2 py-1 text-[12px] font-semibold text-muted sm:inline-flex">
                  <Globe className="size-3.5" /> Everyone
                </span>
              )}
              <span className={cn("text-[11px]", body.length > MAX - 60 ? "text-warn" : "text-muted-2")}>
                {MAX - body.length}
              </span>
              <button
                onClick={submit}
                disabled={!canPost}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-1.5 text-[13px] font-bold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {replyTo ? "Reply" : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({
  children,
  label,
  onClick,
  active,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "grid size-9 place-items-center rounded-full transition-colors",
        disabled ? "text-muted-2/40" : "hover:bg-primary/10",
        active && "bg-primary/15 text-primary",
      )}
    >
      {children}
    </button>
  );
}
