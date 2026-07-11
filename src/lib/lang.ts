/**
 * Shared language data (client-safe — no detection deps here).
 * Codes are ISO 639-1 (2-letter), what the browser Translator API and Google
 * Cloud Translation both use.
 */

export interface Language {
  code: string; // ISO 639-1
  name: string; // English name
  native: string; // endonym
}

/** Languages users can pick as their preferred language. */
export const LANGUAGES: Language[] = [
  { code: "en", name: "English", native: "English" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "da", name: "Danish", native: "Dansk" },
  { code: "fi", name: "Finnish", native: "Suomi" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "hu", name: "Hungarian", native: "Magyar" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "he", name: "Hebrew", native: "עברית" },
  { code: "fa", name: "Persian", native: "فارسی" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu" },
  { code: "tl", name: "Filipino", native: "Filipino" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "zh", name: "Chinese", native: "中文" },
];

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));

/** English name for a language code, or the code itself if unknown. */
export function langName(code: string | null | undefined): string {
  if (!code) return "";
  return BY_CODE.get(code)?.name ?? code.toUpperCase();
}

/** Endonym (native name) for a code, falling back to English name / code. */
export function langNative(code: string | null | undefined): string {
  if (!code) return "";
  const l = BY_CODE.get(code);
  return l ? l.native : code.toUpperCase();
}

export function isSupportedLang(code: string | null | undefined): code is string {
  return !!code && BY_CODE.has(code);
}

/**
 * Normalize a BCP-47 / navigator.language tag ("en-US", "pt-BR") to a bare
 * ISO 639-1 code we support ("en", "pt"), or null.
 */
export function normalizeLang(tag: string | null | undefined): string | null {
  if (!tag) return null;
  const base = tag.toLowerCase().split(/[-_]/)[0];
  return BY_CODE.has(base) ? base : null;
}

/** franc (ISO 639-3) → ISO 639-1, for the languages we care about. */
export const FRANC_TO_ISO1: Record<string, string> = {
  eng: "en",
  spa: "es",
  por: "pt",
  fra: "fr",
  deu: "de",
  ita: "it",
  nld: "nl",
  rus: "ru",
  ukr: "uk",
  pol: "pl",
  ron: "ro",
  ces: "cs",
  ell: "el",
  swe: "sv",
  dan: "da",
  fin: "fi",
  nob: "no",
  nno: "no",
  nor: "no",
  hun: "hu",
  tur: "tr",
  arb: "ar",
  ara: "ar",
  heb: "he",
  pes: "fa",
  fas: "fa",
  hin: "hi",
  ben: "bn",
  pan: "pa",
  urd: "ur",
  ind: "id",
  zsm: "ms",
  msa: "ms",
  tgl: "tl",
  vie: "vi",
  tha: "th",
  jpn: "ja",
  kor: "ko",
  cmn: "zh",
  zho: "zh",
};
