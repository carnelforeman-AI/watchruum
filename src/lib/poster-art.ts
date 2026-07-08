/** Genre → visual motif + color palette mapping for procedural posters. */

export type Motif = "mountains" | "space" | "city" | "fantasy" | "spotlight" | "abstract";

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100000;
}

interface Palette {
  motif: Motif;
  top: string;
  mid: string;
  bottom: string;
  accent: string;
}

/** Palettes keyed by motif, with hue jitter from the seed for variety. */
const BASE: Record<Motif, Palette> = {
  mountains: { motif: "mountains", top: "#3a2a1e", mid: "#241a17", bottom: "#0d0a0a", accent: "#e8a04b" },
  space:     { motif: "space",     top: "#101a3a", mid: "#0a0f24", bottom: "#050510", accent: "#4f8bff" },
  city:      { motif: "city",      top: "#1c2340", mid: "#12131f", bottom: "#08080e", accent: "#22d3ee" },
  fantasy:   { motif: "fantasy",   top: "#2a1640", mid: "#1a0f2a", bottom: "#0a0714", accent: "#a855f7" },
  spotlight: { motif: "spotlight", top: "#2a1030", mid: "#180a1e", bottom: "#0a0510", accent: "#f472b6" },
  abstract:  { motif: "abstract",  top: "#1a1440", mid: "#100d24", bottom: "#070610", accent: "#8b5cf6" },
};

const GENRE_MOTIF: Record<string, Motif> = {
  Western: "mountains",
  Drama: "mountains",
  History: "mountains",
  "Sci-Fi": "space",
  Mystery: "space",
  Fantasy: "fantasy",
  Adventure: "fantasy",
  Crime: "city",
  Thriller: "city",
  Horror: "city",
  Action: "city",
  Reality: "spotlight",
  Competition: "spotlight",
  Comedy: "spotlight",
  Music: "spotlight",
};

export function pickPalette(genres: string[], seed: number): Palette {
  let motif: Motif = "abstract";
  for (const g of genres) {
    if (GENRE_MOTIF[g]) {
      motif = GENRE_MOTIF[g];
      break;
    }
  }
  const base = BASE[motif];
  // Rotate accent hue slightly per-title for variety.
  const shift = (seed % 40) - 20;
  return { ...base, accent: rotate(base.accent, shift) };
}

/** Shift a hex color's hue by degrees. */
function rotate(hex: string, deg: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex((h + deg + 360) % 360, s, l);
}

function hexToHsl(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
