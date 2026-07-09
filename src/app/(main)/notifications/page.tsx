import { Heart, MessageCircle, UserPlus, ShieldCheck, Tv, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getSampleContent } from "@/lib/queries";

export const metadata = { title: "Notifications · Watchruum" };

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  like: Heart,
  reply: MessageCircle,
  follow: UserPlus,
  unlock: ShieldCheck,
  episode: Tv,
  trending: TrendingUp,
};

export default async function NotificationsPage() {
  const { notifications } = await getSampleContent();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">Notifications</h1>
      <Card className="divide-y divide-border-soft p-0">
        {notifications.map((n, i) => {
          const Icon = ICONS[n.type] ?? MessageCircle;
          return (
            <div key={i} className={cn("flex items-center gap-3 p-4", n.unread && "bg-primary/[0.06]")}>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 text-primary">
                <Icon className="size-4" />
              </span>
              <p className="flex-1 text-[13px] leading-snug">{n.text}</p>
              <span className="shrink-0 text-[11px] text-muted-2">{n.time}</span>
              {n.unread && <span className="size-2 shrink-0 rounded-full bg-primary" />}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
