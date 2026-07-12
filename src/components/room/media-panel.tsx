"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ImagePlus, Plus, X, Loader2, ExternalLink, Film, Eye, ShieldAlert, Link2, Upload } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn, timeAgo } from "@/lib/utils";
import type { MediaItem } from "@/lib/types";
import type { RoomMediaItem } from "@/lib/room-tabs";
import { addRoomMedia } from "@/app/room-actions";

interface Ctx {
  media: MediaItem;
  season: number | null;
  episode: number | null;
  viewerId: string | null;
  viewerName: string | null;
}

const KINDS = [
  { value: "trailer", label: "Trailer" },
  { value: "clip", label: "Official clip" },
  { value: "image", label: "Image / meme" },
  { value: "link", label: "Link" },
] as const;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

function youtubeThumb(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

/** Downscale a picked image to keep payloads small (photos only). */
async function downscale(file: File, max = 1024, quality = 0.82): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  try {
    const img = document.createElement("img");
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
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

export function MediaPanel({ ctx, initialMedia }: { ctx: Ctx; initialMedia: RoomMediaItem[] }) {
  const [items, setItems] = useState<RoomMediaItem[]>(initialMedia);
  const [composing, setComposing] = useState(false);
  const signedIn = !!ctx.viewerId;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ImagePlus className="size-5 text-primary" /> Media
          </h2>
          <p className="text-[12.5px] text-muted-2">Official trailers, clips, posters, fan art and memes — kept spoiler-safe.</p>
        </div>
        {signedIn && !composing && (
          <button
            onClick={() => setComposing(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-3.5 py-2 text-[13px] font-semibold text-white hover:brightness-110"
          >
            <Plus className="size-4" /> Add media
          </button>
        )}
      </div>

      {/* Copyright rules */}
      <div className="rounded-xl border border-warn/20 bg-warn/[0.06] px-4 py-3">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-warn">
          <ShieldAlert className="size-4" /> Keep it legal
        </p>
        <p className="mt-1 text-[12px] text-muted-2">
          Official trailers, clips, posters, and your own art/memes only. No pirated clips, full episodes, screen recordings, or leaked footage.
        </p>
      </div>

      {composing && (
        <MediaComposer ctx={ctx} onAdded={(m) => { setItems((p) => [m, ...p]); setComposing(false); }} onCancel={() => setComposing(false)} />
      )}

      {items.length === 0 && !composing ? (
        <EmptyState signedIn={signedIn} onCompose={() => setComposing(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((m) => (
            <MediaCard key={m.id} item={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function MediaCard({ item }: { item: RoomMediaItem }) {
  const [revealed, setRevealed] = useState(!item.spoiler);
  const isImage = item.kind === "image" || item.url.startsWith("data:image/");
  const yt = youtubeThumb(item.url);
  const thumb = isImage ? item.url : yt;

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="relative aspect-video w-full bg-white/[0.03]">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={item.caption ?? "Room media"} className={cn("size-full object-cover transition", !revealed && "blur-xl")} />
        ) : (
          <div className="grid size-full place-items-center text-muted-2">
            <Film className="size-8" />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/90 backdrop-blur">
          {item.kind}
        </span>
        {!revealed && (
          <button onClick={() => setRevealed(true)} className="absolute inset-0 grid place-items-center bg-black/40 text-[12.5px] font-semibold text-white">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/50 px-3 py-1.5">
              <Eye className="size-4" /> Contains spoilers — reveal
            </span>
          </button>
        )}
        {revealed && !isImage && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 transition hover:opacity-100">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-[12.5px] font-semibold text-white">
              <ExternalLink className="size-4" /> Open
            </span>
          </a>
        )}
      </div>
      <div className="p-3">
        {item.caption && <p className="text-[13px] leading-snug">{item.caption}</p>}
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11.5px] text-muted-2">
          <span className="flex items-center gap-1.5">
            <Avatar name={item.author.display_name} src={item.author.avatar_url} size="sm" className="size-5" />
            <Link href={`/u/${item.author.username}`} className="font-medium hover:underline">{item.author.display_name}</Link>
            · {timeAgo(item.created_at)}
          </span>
          {!isImage && <span className="truncate">{hostOf(item.url)}</span>}
        </div>
      </div>
    </div>
  );
}

function MediaComposer({ ctx, onAdded, onCancel }: { ctx: Ctx; onAdded: (m: RoomMediaItem) => void; onCancel: () => void }) {
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("trailer");
  const [url, setUrl] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const isUpload = kind === "image";

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    try {
      setImageData(await downscale(file));
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    setError(null);
    if (!ack) return setError("Confirm you have the rights to share this.");
    const finalUrl = isUpload ? imageData ?? "" : url.trim();
    if (!finalUrl) return setError(isUpload ? "Upload an image." : "Paste a link.");
    if (!isUpload && !/^https?:\/\//i.test(finalUrl)) return setError("Links must start with http(s)://");
    start(async () => {
      const res = await addRoomMedia(ctx.media, ctx.season, ctx.episode, kind, finalUrl, caption.trim() || null, spoiler);
      if (!res.ok && !res.demo) return setError(res.error ?? "Couldn't add that.");
      onAdded({
        id: res.id ?? `local-${Date.now()}`,
        kind,
        url: finalUrl,
        caption: caption.trim() || null,
        spoiler,
        created_at: new Date().toISOString(),
        author: { id: ctx.viewerId ?? "", username: "you", display_name: ctx.viewerName ?? "You", avatar_url: null },
      });
    });
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-bold">Add media</h3>
        <button onClick={onCancel} aria-label="Cancel" className="grid size-7 place-items-center rounded-lg text-muted-2 hover:bg-white/5 hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k.value}
            onClick={() => setKind(k.value)}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors",
              kind === k.value ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-2 hover:text-foreground",
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      {isUpload ? (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-white/[0.02] px-3 py-6 text-[13px] font-semibold text-muted-2 hover:border-primary/50 hover:text-foreground">
          {busy ? <Loader2 className="size-4 animate-spin" /> : imageData ? <Upload className="size-4 text-safe" /> : <Upload className="size-4" />}
          {imageData ? "Image ready — choose another" : "Upload an image (your own art/meme)"}
          <input type="file" accept="image/*" onChange={onFile} className="hidden" />
        </label>
      ) : (
        <div className="relative">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste an official YouTube / trailer / link URL"
            aria-label="Trailer or clip URL"
            className="w-full rounded-xl border border-border bg-white/[0.03] py-2.5 pl-9 pr-3 text-[13.5px] outline-none focus:border-primary/60"
          />
        </div>
      )}

      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption (optional)"
        aria-label="Caption"
        className="mt-2 w-full rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 text-[13.5px] outline-none focus:border-primary/60"
      />

      <div className="mt-3 space-y-2">
        <label className="flex items-center gap-2 text-[12.5px] text-muted">
          <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} className="size-4 accent-[var(--color-primary,#7c5cff)]" />
          Contains spoilers — blur until revealed
        </label>
        <label className="flex items-start gap-2 text-[12.5px] text-muted">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-primary,#7c5cff)]" />
          This is official or my own content — not pirated, leaked, or a full episode.
        </label>
      </div>

      {error && <p className="mt-2 text-[12.5px] font-medium text-danger">{error}</p>}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={pending || busy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2 text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} Share
        </button>
        <button onClick={onCancel} className="rounded-xl px-3 py-2 text-[13px] font-semibold text-muted hover:text-foreground">
          Cancel
        </button>
      </div>
    </div>
  );
}

function EmptyState({ signedIn, onCompose }: { signedIn: boolean; onCompose: () => void }) {
  return (
    <div className="glass grid place-items-center rounded-2xl py-14 text-center">
      <ImagePlus className="mb-2 size-8 text-muted-2" />
      <p className="font-semibold">No media yet</p>
      <p className="mt-1 max-w-xs text-[13px] text-muted-2">Share the official trailer, a poster, or your own reaction meme to get the room going.</p>
      {signedIn ? (
        <button onClick={onCompose} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-strong">
          <Plus className="size-4" /> Add the first
        </button>
      ) : (
        <Link href="/login" className="mt-4 text-[13px] font-semibold text-primary hover:underline">
          Sign in to add media
        </Link>
      )}
    </div>
  );
}
