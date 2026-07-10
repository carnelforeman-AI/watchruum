import { getWatchRooms } from "@/lib/rooms";
import { WatchRooms } from "@/components/rooms/watch-rooms";

export const metadata = { title: "Watch Rooms · Watchruum" };
export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const data = await getWatchRooms(12);
  return <WatchRooms data={data} />;
}
