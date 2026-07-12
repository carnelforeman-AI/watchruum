"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GENRES } from "@/lib/genres";
import { setFavoriteGenres } from "@/app/actions";

/**
 * Inline editor for the profile's favorite genres. Shows the saved chips with
 * an edit affordance; editing reveals the full genre set as toggles and saves
 * to the profile. Optimistic — the chips update immediately, revert on failure.
 */
export function GenreEditor({ initialGenres }: { initialGenres: string[] }) {
  const [genres, setGenres] = useState<string[]>(initialGenres);
  const [draft, setDraft] = useState<string[]>(initialGenres);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function open() {
    setDraft(genres);
    setSaved(false);
    setEditing(true);
  }

  function toggle(g: string) {
    setDraft((d) => (d.includes(g) ? d.filter((x) => x !== g) : [...d, g]));
  }

  function save() {
    const next = draft;
    const prev = genres;
    setGenres(next);
    setEditing(false);
    start(async () => {
      const res = await setFavoriteGenres(next);
      if (res.ok) setSaved(true);
      else setGenres(prev); // revert on failure
    });
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {genres.length > 0 ? (
          genres.map((g) => (
            <span key={g} className="inline-flex items-center rounded-full bg-white/[0.06] px-3 py-1 text-[13px] font-medium text-foreground/90">
              {g}
            </span>
          ))
        ) : (
          <span className="text-[13px] text-muted-2">No favorite genres yet.</span>
        )}
        <button
          onClick={open}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[12px] font-semibold text-muted-2 transition-colors hover:text-foreground"
        >
          {genres.length > 0 ? <Pencil className="size-3" /> : <Plus className="size-3.5" />}
          {genres.length > 0 ? "Edit" : "Add genres"}
        </button>
        {saved && !pending && (
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-safe">
            <Check className="size-3.5" /> Saved
          </span>
        )}
        {pending && <Loader2 className="size-3.5 animate-spin text-muted-2" />}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white/[0.02] p-4">
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-2">Pick your favorite genres</p>
      <div className="flex flex-wrap gap-2">
        {GENRES.map((g) => {
          const on = draft.includes(g);
          return (
            <button
              key={g}
              type="button"
              onClick={() => toggle(g)}
              aria-pressed={on}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors",
                on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-2 hover:text-foreground",
              )}
            >
              {on && <Check className="size-3.5" />}
              {g}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={save}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2 text-[13px] font-semibold text-white hover:brightness-110"
        >
          <Check className="size-4" /> Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-muted hover:text-foreground"
        >
          <X className="size-4" /> Cancel
        </button>
      </div>
    </div>
  );
}
