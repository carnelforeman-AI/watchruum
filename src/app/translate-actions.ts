"use server";

import { translateContent, type TranslateInput, type TranslateResult } from "@/lib/translate";
import { isSupportedLang } from "@/lib/lang";

/**
 * Server fallback translate (Google + cache). Returns `unavailable` when no
 * translation engine is configured yet, so the client can quietly show the
 * original.
 */
export async function translatePost(input: TranslateInput): Promise<TranslateResult> {
  const text = (input.text ?? "").slice(0, 5000);
  if (!text.trim()) return { ok: false, unavailable: true };
  if (!isSupportedLang(input.target)) return { ok: false, unavailable: true };
  return translateContent({ ...input, text });
}
