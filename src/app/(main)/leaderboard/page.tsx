import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { getLiveMode } from "@/lib/settings";
import { getLeaderboard } from "@/lib/leaderboard";

export const metadata = { title: "Quality Leadership Board" };
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const live = await getLiveMode();
  if (!live) return <LeaderboardView />;

  const { members, stats } = await getLeaderboard();
  return <LeaderboardView live members={members} stats={stats} />;
}
