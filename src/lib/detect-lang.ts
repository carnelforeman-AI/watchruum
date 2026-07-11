import "server-only";
import { franc } from "franc-min";
import { FRANC_TO_ISO1 } from "./lang";

/**
 * Detect the language of a piece of text, free and on-device (no API, no key).
 * Returns an ISO 639-1 code ("en", "es", "ja") or null when it can't tell
 * (text too short, or a language we don't map). Never throws.
 */
export function detectLang(text: string | null | undefined): string | null {
  const t = (text ?? "").trim();
  // franc needs a reasonable amount of text to be confident.
  if (t.length < 12) return null;
  try {
    const iso3 = franc(t, { minLength: 12 });
    if (!iso3 || iso3 === "und") return null;
    return FRANC_TO_ISO1[iso3] ?? null;
  } catch {
    return null;
  }
}
