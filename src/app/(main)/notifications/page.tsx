import { getInbox } from "@/lib/queries";
import { NotificationsView } from "@/components/inbox/notifications-view";

export const metadata = { title: "Notifications · Watchruum" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { notifications } = await getInbox();
  return <NotificationsView items={notifications} />;
}
