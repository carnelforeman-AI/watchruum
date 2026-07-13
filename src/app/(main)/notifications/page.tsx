import { getInbox } from "@/lib/queries";
import { NotificationsView, type NotifPrefs } from "@/components/inbox/notifications-view";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Notifications · Watchruum" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { notifications } = await getInbox();

  // Which notification types are enabled — read straight from the backend prefs
  // (profiles.notify_*), so the page reflects the live on/off state managed in
  // Settings. null = signed out (we hide the summary rather than guess).
  let prefs: NotifPrefs | null = null;
  const supabase = await createClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("notify_messages, notify_replies, notify_likes, notify_releases, notify_reminders, notify_unlocks, notify_trending")
        .eq("id", user.id)
        .maybeSingle();
      const p = data as Record<string, boolean | null> | null;
      prefs = {
        messages: p?.notify_messages ?? true,
        replies: p?.notify_replies ?? true,
        likes: p?.notify_likes ?? true,
        releases: p?.notify_releases ?? true,
        reminders: p?.notify_reminders ?? true,
        unlocks: p?.notify_unlocks ?? true,
        trending: p?.notify_trending ?? false,
      };
    }
  }

  return <NotificationsView items={notifications} prefs={prefs} />;
}
