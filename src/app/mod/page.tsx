import { ModDashboard } from "@/components/mod/mod-dashboard";
import { getModDashboard } from "@/lib/moderator";

export const metadata = { title: "Moderator Dashboard · Watchruum" };
export const dynamic = "force-dynamic";

export default async function ModDashboardPage() {
  const data = await getModDashboard();
  return <ModDashboard data={data} />;
}
