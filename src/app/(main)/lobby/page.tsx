import { LobbyView } from "@/components/lobby/lobby-view";
import { getLobbyData } from "@/lib/lobby";

export const metadata = {
  title: "The Lobby · Watchruum",
  description: "Hang out and talk shows, movies, and everything in between with fans across Watchruum.",
};
export const dynamic = "force-dynamic";

export default async function LobbyPage() {
  const data = await getLobbyData();
  return <LobbyView data={data} />;
}
