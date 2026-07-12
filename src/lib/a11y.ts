// Client-only accessibility preferences. Stored in localStorage so they apply
// instantly, for signed-in and signed-out visitors alike, and survive reloads.
// Applied to <html> as classes / data-attributes that globals.css keys off of.
// A matching inline script in the root layout applies these BEFORE first paint
// to avoid a flash — keep the two in sync (same storage key + attribute names).

export type TextSize = "default" | "large" | "xlarge";

export interface A11yPrefs {
  textSize: TextSize;
  reduceMotion: boolean;
  highContrast: boolean;
  focusRings: boolean; // always show focus outlines (not just for keyboard users)
}

export const A11Y_DEFAULTS: A11yPrefs = {
  textSize: "default",
  reduceMotion: false,
  highContrast: false,
  focusRings: false,
};

export const A11Y_KEY = "wr-a11y";

export function readA11y(): A11yPrefs {
  if (typeof localStorage === "undefined") return { ...A11Y_DEFAULTS };
  try {
    const raw = localStorage.getItem(A11Y_KEY);
    if (!raw) return { ...A11Y_DEFAULTS };
    const p = JSON.parse(raw) as Partial<A11yPrefs>;
    return {
      textSize: p.textSize === "large" || p.textSize === "xlarge" ? p.textSize : "default",
      reduceMotion: !!p.reduceMotion,
      highContrast: !!p.highContrast,
      focusRings: !!p.focusRings,
    };
  } catch {
    return { ...A11Y_DEFAULTS };
  }
}

export function writeA11y(prefs: A11yPrefs): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(A11Y_KEY, JSON.stringify(prefs));
  } catch {
    /* storage may be unavailable (private mode) — prefs still apply this session */
  }
}

/** Reflect the preferences onto <html> so the global CSS rules take effect. */
export function applyA11y(prefs: A11yPrefs): void {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.setAttribute("data-wr-text", prefs.textSize);
  el.classList.toggle("wr-reduce-motion", prefs.reduceMotion);
  el.classList.toggle("wr-high-contrast", prefs.highContrast);
  el.classList.toggle("wr-focus-rings", prefs.focusRings);
}
