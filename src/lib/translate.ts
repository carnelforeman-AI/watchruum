import "server-only";
import { createClient } from "./supabase/server";

/**
 * Server-side translation with a database cache. This is the FALLBACK engine
 * (the client tries the free on-device browser translator first). It only does
 * real work when GOOGLE_TRANSLATE_API_KEY is set — until then it reports
 * `unavailable` and the UI simply shows the original. Drop in the key later and
 * it turns on with zero code changes.
 *
 * Each (item → target language) result is cached in `content_translations`, so
 * the first reader of a language pays once and everyone else is free.
 */

const GOOGLE_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TranslateContentType = "comment" | "review" | "person_comment";

export interface TranslateResult {
  ok: boolean;
  text?: string;
  source?: string | null;
  cached?: boolean;
  unavailable?: boolean; // no engine configured / can't translate
  error?: string;
}

export interface TranslateInput {
  contentType: TranslateContentType;
  contentId: string;
  text: string;
  source?: string | null;
  target: string;
}

async function googleTranslate(
  text: string,
  target: string,
  source?: string | null,
): Promise<{ text: string; source: string | null } | null> {
  if (!GOOGLE_KEY) return null;
  try {
    const params = new URLSearchParams({ q: text, target, format: "text", key: GOOGLE_KEY });
    if (source) params.set("source", source);
    const res = await fetch("https://translation.googleapis.com/language/translate/v2", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { translations?: { translatedText?: string; detectedSourceLanguage?: string }[] };
    };
    const tr = json?.data?.translations?.[0];
    if (!tr?.translatedText) return null;
    return { text: tr.translatedText, source: tr.detectedSourceLanguage ?? source ?? null };
  } catch {
    return null;
  }
}

export async function translateContent(input: TranslateInput): Promise<TranslateResult> {
  const { contentType, contentId, text, source, target } = input;
  if (!text.trim() || !target) return { ok: false, unavailable: true };

  const supabase = await createClient();
  const canCache = !!supabase && UUID_RE.test(contentId);

  // 1) Cache hit — free, instant, shared across all readers.
  if (canCache) {
    const { data } = await supabase!
      .from("content_translations")
      .select("translated_text, source_lang")
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .eq("target_lang", target)
      .maybeSingle();
    const row = data as { translated_text: string; source_lang: string | null } | null;
    if (row) return { ok: true, text: row.translated_text, source: row.source_lang, cached: true };
  }

  // 2) Google (only if a key is configured).
  const g = await googleTranslate(text, target, source);
  if (!g) return { ok: false, unavailable: true };

  // 3) Persist for the next reader.
  if (canCache) {
    await supabase!
      .from("content_translations")
      .insert({
        content_type: contentType,
        content_id: contentId,
        target_lang: target,
        source_lang: g.source,
        translated_text: g.text,
      })
      .then(
        () => {},
        () => {},
      );
  }

  return { ok: true, text: g.text, source: g.source };
}
