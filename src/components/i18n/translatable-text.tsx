"use client";

import { useEffect, useRef, useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { langName, normalizeLang } from "@/lib/lang";
import { translatePost } from "@/app/translate-actions";
import type { TranslateContentType } from "@/lib/translate";

type Status = "idle" | "loading" | "done" | "unavailable";

/** Free on-device translation via the browser's Translator API (Chrome/Edge). */
async function browserTranslate(
  text: string,
  source: string,
  target: string,
): Promise<string | null> {
  try {
    const g = globalThis as unknown as {
      Translator?: {
        availability?: (o: { sourceLanguage: string; targetLanguage: string }) => Promise<string>;
        create: (o: { sourceLanguage: string; targetLanguage: string }) => Promise<{
          translate: (t: string) => Promise<string>;
          destroy?: () => void;
        }>;
      };
      translation?: {
        canTranslate?: (o: { sourceLanguage: string; targetLanguage: string }) => Promise<string>;
        createTranslator: (o: { sourceLanguage: string; targetLanguage: string }) => Promise<{
          translate: (t: string) => Promise<string>;
        }>;
      };
    };

    if (g.Translator?.create) {
      const avail = await g.Translator.availability?.({ sourceLanguage: source, targetLanguage: target });
      if (avail === "unavailable") return null;
      const t = await g.Translator.create({ sourceLanguage: source, targetLanguage: target });
      const out = await t.translate(text);
      t.destroy?.();
      return out || null;
    }
    if (g.translation?.createTranslator) {
      const can = await g.translation.canTranslate?.({ sourceLanguage: source, targetLanguage: target });
      if (can === "no") return null;
      const t = await g.translation.createTranslator({ sourceLanguage: source, targetLanguage: target });
      const out = await t.translate(text);
      return out || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Renders body text and, when it's in a different language than the reader's,
 * auto-translates it — browser engine first (free), server (Google) as a
 * fallback — with a "Show original" toggle. Degrades silently to the original
 * when no engine is available.
 */
export function TranslatableText({
  text,
  sourceLang,
  targetLang,
  contentType,
  contentId,
  className,
  auto = true,
}: {
  text: string;
  sourceLang?: string | null;
  targetLang?: string | null;
  contentType: TranslateContentType;
  contentId: string;
  className?: string;
  auto?: boolean;
}) {
  const [target, setTarget] = useState<string | null>(targetLang ?? null);
  const [translated, setTranslated] = useState<string | null>(null);
  const [detected, setDetected] = useState<string | null>(sourceLang ?? null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const tried = useRef(false);

  // Resolve reader language from the browser (a client-only value) after mount,
  // so the first render still matches the server (no hydration mismatch).
  useEffect(() => {
    if (!targetLang && typeof navigator !== "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTarget(normalizeLang(navigator.language));
    }
  }, [targetLang]);

  const src = sourceLang ?? null;
  const trimmed = text.trim();
  // Translate when we have a reader language and the source is known-different
  // (or unknown — let the engine auto-detect).
  const needs = !!target && trimmed.length > 1 && (src ? src !== target : true);

  async function run() {
    if (!target) return;
    setStatus("loading");
    if (src) {
      const out = await browserTranslate(text, src, target);
      if (out != null && out !== text) {
        setTranslated(out);
        setDetected(src);
        setStatus("done");
        return;
      }
    }
    const res = await translatePost({ contentType, contentId, text, source: src, target });
    if (res.ok && res.text && res.text !== text) {
      setTranslated(res.text);
      setDetected(res.source ?? src);
      setStatus("done");
      return;
    }
    setStatus("unavailable");
  }

  useEffect(() => {
    if (auto && needs && !tried.current) {
      tried.current = true;
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, needs, target]);

  if (!needs) return <p className={className}>{text}</p>;

  const showingTranslated = status === "done" && !!translated && !showOriginal;

  return (
    <div>
      <p className={className}>{showingTranslated ? translated : text}</p>
      <div className="mt-1 flex items-center gap-2 text-[11.5px] text-muted-2">
        {status === "loading" && (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" /> Translating…
          </span>
        )}

        {status === "done" && (
          <>
            <span className="inline-flex items-center gap-1">
              <Languages className="size-3" />
              {showOriginal
                ? `Original${detected ? ` · ${langName(detected)}` : ""}`
                : `Translated${detected ? ` from ${langName(detected)}` : ""}`}
            </span>
            <button
              type="button"
              onClick={() => setShowOriginal((v) => !v)}
              className="font-semibold text-primary hover:underline"
            >
              {showOriginal ? "Show translation" : "Show original"}
            </button>
          </>
        )}

        {(status === "idle" || status === "unavailable") && (
          <button
            type="button"
            onClick={() => void run()}
            disabled={status === "unavailable"}
            className={cn(
              "inline-flex items-center gap-1 font-semibold",
              status === "unavailable"
                ? "cursor-default text-muted-2"
                : "text-primary hover:underline",
            )}
          >
            <Languages className="size-3" />
            {status === "unavailable" ? "Translation unavailable here" : "Translate"}
          </button>
        )}
      </div>
    </div>
  );
}
