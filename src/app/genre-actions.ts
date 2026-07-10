"use server";

import { discoverByGenre, searchInGenre, type GenreType } from "@/lib/tmdb";
import type { MediaItem } from "@/lib/types";

export interface GenrePage {
  items: MediaItem[];
  totalPages: number;
}

/** One page of a genre's titles, scoped to a media type (used by infinite scroll). */
export async function loadGenre(name: string, page: number, type: GenreType = "all"): Promise<GenrePage> {
  return discoverByGenre(name, page, type);
}

/** One page of a text search within a genre + media type. */
export async function searchGenre(
  name: string,
  query: string,
  page: number,
  type: GenreType = "all",
): Promise<GenrePage> {
  return searchInGenre(name, query, page, type);
}
