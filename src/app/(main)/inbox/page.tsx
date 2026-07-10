import { getInbox } from "@/lib/queries";
import { InboxView } from "@/components/inbox/inbox-view";

export const metadata = { title: "Inbox · Watchruum" };
export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const { messages } = await getInbox();
  return <InboxView items={messages} />;
}
