import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { getCurrentProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) redirect("/");

  const p = { display_name: profile.display_name, avatar_url: profile.avatar_url };

  return (
    <div className="flex min-h-screen bg-bg">
      <AdminSidebar profile={p} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar profile={p} />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
