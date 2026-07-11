import { redirect } from "next/navigation";
import { ModSidebar } from "@/components/mod/mod-sidebar";
import { ModTopbar } from "@/components/mod/mod-topbar";
import { getCurrentProfile } from "@/lib/supabase/server";
import { getModDashboard } from "@/lib/moderator";

export const dynamic = "force-dynamic";

export default async function ModLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin && !profile?.is_moderator) redirect("/");

  const dash = await getModDashboard();
  const reportsBadge = Number(dash.stats.find((s) => s.key === "new")?.value.replace(/[^\d]/g, "")) || 0;
  const queueBadge = Number(dash.stats.find((s) => s.key === "open")?.value.replace(/[^\d]/g, "")) || 0;

  const p = {
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    role: profile.is_admin ? "Admin" : "Moderator",
  };

  return (
    <div className="flex min-h-screen bg-bg">
      <ModSidebar profile={p} badges={{ reports: reportsBadge, queue: queueBadge }} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ModTopbar profile={{ display_name: profile.display_name, avatar_url: profile.avatar_url }} />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
