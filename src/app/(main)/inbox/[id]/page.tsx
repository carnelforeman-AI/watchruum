import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Deep links now open inside the two-pane inbox. */
export default async function MessageDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/inbox?m=${encodeURIComponent(id)}`);
}
