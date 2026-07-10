"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, PlayCircle } from "lucide-react";
import { getTrailer } from "@/app/calendar-actions";

interface TrailerState {
  open: boolean;
  loading: boolean;
  title: string;
  videoKey: string | null;
  fallbackQuery: string | null;
}

interface TrailerCtx {
  play: (tmdbId: number, mediaType: "movie" | "tv", title: string) => void;
}

const Ctx = createContext<TrailerCtx | null>(null);

export function TrailerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TrailerState>({
    open: false,
    loading: false,
    title: "",
    videoKey: null,
    fallbackQuery: null,
  });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  const play = useCallback(async (tmdbId: number, mediaType: "movie" | "tv", title: string) => {
    setState({ open: true, loading: true, title, videoKey: null, fallbackQuery: null });
    const key = await getTrailer(tmdbId, mediaType).catch(() => null);
    setState({
      open: true,
      loading: false,
      title,
      videoKey: key,
      fallbackQuery: key ? null : `${title} trailer`,
    });
  }, []);

  // Close on Escape.
  useEffect(() => {
    if (!state.open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state.open, close]);

  return (
    <Ctx.Provider value={{ play }}>
      {children}
      {mounted &&
        state.open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
            onClick={close}
          >
            <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="truncate text-[15px] font-bold text-white">{state.title}</p>
                <button
                  onClick={close}
                  aria-label="Close trailer"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
                {state.loading ? (
                  <div className="absolute inset-0 grid place-items-center">
                    <Loader2 className="size-8 animate-spin text-white/60" />
                  </div>
                ) : state.videoKey ? (
                  <iframe
                    key={state.videoKey}
                    src={`https://www.youtube-nocookie.com/embed/${state.videoKey}?autoplay=1&rel=0&modestbranding=1`}
                    title={`${state.title} trailer`}
                    className="absolute inset-0 h-full w-full"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center p-6 text-center">
                    <div>
                      <PlayCircle className="mx-auto size-10 text-white/40" />
                      <p className="mt-3 font-semibold text-white">No trailer available yet</p>
                      <p className="mt-1 text-sm text-white/60">This title doesn&apos;t have a trailer on TMDb yet.</p>
                      {state.fallbackQuery && (
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(state.fallbackQuery)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-white/20"
                        >
                          <PlayCircle className="size-4" /> Search YouTube
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </Ctx.Provider>
  );
}

export function useTrailer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTrailer must be used within TrailerProvider");
  return ctx;
}
