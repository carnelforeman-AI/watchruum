import Link from "next/link";
import { FriendsDirectory, type Person } from "@/components/friends/friends-directory";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Find Friends · Watchruum" };
export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const supabase = await createClient();

  if (!supabase) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Find Friends</h1>
        <p className="mt-2 text-[13px] text-muted-2">Friends are available once you&apos;re signed in.</p>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Find Friends</h1>
        <p className="mt-2 text-[13px] text-muted">
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>{" "}
          to follow other fans and see their activity.
        </p>
      </div>
    );
  }

  // Members to show + who I already follow.
  const [{ data: rows }, { data: myFollows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, favorite_genres")
      .neq("id", user.id)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase.from("follows").select("following_id").eq("follower_id", user.id),
  ]);

  const followed = new Set(((myFollows as { following_id: string }[] | null) ?? []).map((f) => f.following_id));

  const people: Person[] = (
    (rows as {
      id: string;
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
      bio: string | null;
      favorite_genres: string[] | null;
    }[] | null) ?? []
  )
    .filter((p) => p.username)
    .map((p) => ({
      id: p.id,
      username: p.username as string,
      display_name: p.display_name ?? "Member",
      avatar_url: p.avatar_url ?? null,
      bio: p.bio ?? null,
      genres: p.favorite_genres ?? [],
      followed: followed.has(p.id),
    }));

  return <FriendsDirectory people={people} signedIn />;
}
