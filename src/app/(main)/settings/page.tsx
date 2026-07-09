import { SettingsPanel } from "@/components/settings/settings-panel";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Settings · Watchruum" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let isPrivate = false;
  const supabase = await createClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("is_private").eq("id", user.id).maybeSingle();
      isPrivate = !!(data as { is_private?: boolean } | null)?.is_private;
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">Settings</h1>
      <SettingsPanel initialPrivate={isPrivate} />
    </div>
  );
}
