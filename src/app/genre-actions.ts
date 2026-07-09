"use server";

import { discoverByGenre } from "@/lib/tmdb";
import type { MediaItem } from "@/lib/types";

/** Load one more page of a genre's titles (used by the infinite scroll). */
export async function loadGenre(name: string, page: number): Promise<MediaItem[]> {
  const { items } = await discoverByGenre(name, page);
  return items;
}
