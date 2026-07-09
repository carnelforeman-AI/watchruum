import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { getSampleContent } from "@/lib/queries";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Activity · Watchruum" };

export default async function ActivityPage() {
  const { friendActivity } = await getSampleContent();
  const feed = [...friendActivity, ...friendActivity.map((a) => ({ ...a, id: a.id + "_b" }))];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">Activity</h1>
      <Card className="divide-y divide-border-soft p-0">
        {feed.map((a) => (
          <div key={a.id} className="flex items-start gap-3 p-4">
            <Avatar name={a.actor.display_name} />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-tight">
                <span className="font-semibold">{a.actor.display_name}</span>{" "}
                <span className="text-muted">{a.verb}</span>
                {a.score ? <span className="ml-1 font-semibold text-warn">★ {a.score}/10</span> : null}
              </p>
              <p className="truncate text-[13px] text-muted-2">{a.target}</p>
            </div>
            <span className="shrink-0 text-[11px] text-muted-2">{timeAgo(a.created_at)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
