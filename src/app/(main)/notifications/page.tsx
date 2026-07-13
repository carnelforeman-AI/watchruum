import { getInbox } from "@/lib/queries";
import { NotificationsView, type NotifPrefs } from "@/components/inbox/notifications-view";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Notifications · Watchruum" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { notifications } = await getInbox();

  // Real notification preferences (the same toggles as Settings → Notifications),
  // so the Notification Types cards reflect and control the live backend state.
  let prefs: NotifPrefs = { messages: true, replies: true, likes: true, releases: true, reminders: true, unlocks: true, trending: false };
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
      if (p) {
        prefs = {
          messages: p.notify_messages ?? true,
          replies: p.notify_replies ?? true,
          likes: p.notify_likes ?? true,
          releases: p.notify_releases ?? true,
          reminders: p.notify_reminders ?? true,
          unlocks: p.notify_unlocks ?? true,
          trending: p.notify_trending ?? false,
        };
      }
    }
  }

  return <NotificationsView items={notifications} initialPrefs={prefs} />;
}
