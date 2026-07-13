import "server-only";
import type { GifResult } from "./lobby-types";

/**
 * KLIPY GIF API — dormant until KLIPY_API_KEY is set (grab a free key at
 * https://klipy.com/developers). While unset, the Lobby's GIF button shows a
 * "not set up yet" state instead of erroring, exactly like the Stripe pattern.
 *
 *   Search:   GET https://api.klipy.com/api/v1/{KEY}/gifs/search?q=..&page=1&per_page=24
 *   Trending: GET https://api.klipy.com/api/v1/{KEY}/gifs/trending?page=1&per_page=24
 *   Response: { result, data: { data: [ item... ], has_next, current_page } }
 *
 * Each item's media lives under `file` with size buckets (sm/md/hd) and format
 * buckets (gif/webp/mp4). We normalize defensively so a small shape difference
 * doesn't break the picker; tweak `normalize` if the first live call looks off.
 */

const KEY = process.env.KLIPY_API_KEY ?? "";
const BASE = "https://api.klipy.com/api/v1";

export function klipyConfigured(): boolean {
  return KEY.length > 0;
}

type AnyObj = Record<string, unknown>;

function urlFrom(fmtBucket: unknown): { url?: string; width?: number; height?: number } {
  const b = fmtBucket as AnyObj | undefined;
  if (!b) return {};
  const fmt = (b.gif ?? b.webp ?? b.mp4) as AnyObj | undefined;
  if (!fmt) return {};
  return {
    url: typeof fmt.url === "string" ? fmt.url : undefined,
    width: typeof fmt.width === "number" ? fmt.width : undefined,
    height: typeof fmt.height === "number" ? fmt.height : undefined,
  };
}

function normalize(item: AnyObj): GifResult | null {
  const file = (item.file ?? item.files ?? {}) as AnyObj;
  const sm = urlFrom(file.sm);
  const md = urlFrom(file.md);
  const hd = urlFrom(file.hd);

  const preview = sm.url ?? md.url ?? (typeof item.preview === "string" ? item.preview : undefined);
  const full = md.url ?? hd.url ?? sm.url ?? (typeof item.url === "string" ? item.url : undefined);
  if (!preview || !full) return null;

  const dims = md.url ? md : sm.url ? sm : hd;
  const id = String(item.id ?? item.slug ?? full);
  return {
    id,
    previewUrl: preview,
    url: full,
    width: dims.width ?? 0,
    height: dims.height ?? 0,
    title: typeof item.title === "string" ? item.title : "GIF",
  };
}

async function call(path: string): Promise<GifResult[]> {
  if (!klipyConfigured()) return [];
  try {
    const res = await fetch(`${BASE}/${KEY}/${path}`, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const json = (await res.json()) as AnyObj;
    const data = json.data as AnyObj | undefined;
    const items = (data?.data ?? []) as AnyObj[];
    return items.map(normalize).filter((g): g is GifResult => g !== null);
  } catch {
    return [];
  }
}

export async function searchGifs(query: string, page = 1): Promise<GifResult[]> {
  const q = query.trim();
  if (!q) return trendingGifs(page);
  const qs = new URLSearchParams({ q, page: String(page), per_page: "24", rating: "pg-13" });
  return call(`gifs/search?${qs.toString()}`);
}

export async function trendingGifs(page = 1): Promise<GifResult[]> {
  const qs = new URLSearchParams({ page: String(page), per_page: "24", rating: "pg-13" });
  return call(`gifs/trending?${qs.toString()}`);
}
