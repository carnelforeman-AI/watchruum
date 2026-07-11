import { getFriendsHub } from "@/lib/friends";
import { FriendsHub } from "@/components/friends/friends-hub";
import type { Person } from "@/components/friends/friends-directory";

export const metadata = { title: "Friends · Watchruum" };
export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const data = await getFriendsHub();

  // Seed the Find Friends tab's initial list with the same suggestions.
  const suggestionsForFind: Person[] = data.suggestions.map((p) => ({
    id: p.id,
    username: p.username,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    bio: null,
    genres: p.genres,
    followed: p.followed,
  }));

  return <FriendsHub data={data} suggestionsForFind={suggestionsForFind} />;
}
