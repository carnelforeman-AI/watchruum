import { getInbox } from "@/lib/queries";
import { InboxClient } from "@/components/inbox/inbox-client";

export const metadata = { title: "Inbox · Watchruum" };
export const dynamic = "force-dynamic";

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const { messages } = await getInbox();
  return <InboxClient items={messages} initialId={m} />;
}
