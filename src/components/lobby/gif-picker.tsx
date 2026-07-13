"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, Loader2, X } from "lucide-react";
import { lobbyGifs } from "@/app/(main)/lobby/actions";
import type { GifResult } from "@/lib/lobby-types";

export function GifPicker({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = (query: string) => {
    start(async () => {
      const res = await lobbyGifs(query);
      setConfigured(res.configured);
      setGifs(res.gifs);
    });
  };

  // Load trending on open.
  useEffect(() => {
    run("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (value: string) => {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => run(value), 350);
  };

  // Split into two columns for a tidy masonry look.
  const cols: GifResult[][] = [[], []];
  gifs.forEach((g, i) => cols[i % 2].push(g));

  return (
    <div className="mt-2 rounded-xl border border-border bg-white/[0.03] p-2">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-1.5">
          <Search className="size-4 text-muted-2" />
          <input
            autoFocus
            value={q}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search GIFs…"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted-2"
          />
          {loading && <Loader2 className="size-4 animate-spin text-muted-2" />}
        </div>
        <button onClick={onClose} aria-label="Close GIF picker" className="grid size-8 place-items-center rounded-lg text-muted-2 hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      {!configured ? (
        <div className="rounded-lg border border-border bg-white/[0.02] p-5 text-center text-[12.5px] text-muted">
          GIF search isn&apos;t set up yet. Add a free KLIPY API key (KLIPY_API_KEY) to turn it on.
        </div>
      ) : gifs.length === 0 && !loading ? (
        <div className="p-5 text-center text-[12.5px] text-muted-2">No GIFs found. Try another search.</div>
      ) : (
        <div className="grid max-h-72 grid-cols-2 gap-1.5 overflow-y-auto">
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1.5">
              {col.map((g) => (
                <button
                  key={g.id}
                  onClick={() => onSelect(g.url)}
                  className="overflow-hidden rounded-lg border border-border transition hover:border-primary/60"
                  title={g.title}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.previewUrl} alt={g.title} loading="lazy" className="w-full" />
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <p className="mt-1.5 text-center text-[10px] text-muted-2">Powered by KLIPY</p>
    </div>
  );
}
