import { SettingsPanel } from "@/components/settings/settings-panel";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Settings · Watchruum" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let isPrivate = false;
  let showActivity = true;
  let language: string | null = null;
  let safety = "strict";
  let notifs = { replies: true, likes: true, unlocks: true, trending: false };
  const supabase = await createClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("is_private, show_activity, preferred_language, spoiler_safety, notify_replies, notify_likes, notify_unlocks, notify_trending")
        .eq("id", user.id)
        .maybeSingle();
      const p = data as
        | {
            is_private?: boolean;
            show_activity?: boolean | null;
            preferred_language?: string | null;
            spoiler_safety?: string | null;
            notify_replies?: boolean | null;
            notify_likes?: boolean | null;
            notify_unlocks?: boolean | null;
            notify_trending?: boolean | null;
          }
        | null;
      isPrivate = !!p?.is_private;
      showActivity = p?.show_activity ?? true; // default on (also handles pre-migration null)
      language = p?.preferred_language ?? null;
      safety = p?.spoiler_safety ?? "strict";
      notifs = {
        replies: p?.notify_replies ?? true,
        likes: p?.notify_likes ?? true,
        unlocks: p?.notify_unlocks ?? true,
        trending: p?.notify_trending ?? false,
      };
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">Settings</h1>
      <SettingsPanel
        initialPrivate={isPrivate}
        initialShowActivity={showActivity}
        initialLanguage={language}
        initialSafety={safety}
        initialNotifs={notifs}
      />
    </div>
  );
}
