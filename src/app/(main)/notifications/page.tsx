import { Heart, MessageCircle, UserPlus, ShieldCheck, Tv, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifications · Watchruum" };

const ICONS = { like: Heart, reply: MessageCircle, follow: UserPlus, unlock: ShieldCheck, episode: Tv, trending: TrendingUp };

const NOTIFS: { type: keyof typeof ICONS; text: string; time: string; unread: boolean }[] = [
  { type: "reply", text: "Sarah Kim replied to your post in Frontier Blood S2 E4", time: "2m ago", unread: true },
  { type: "like", text: "Mike Boone liked your review of The Last Signal S1 E5", time: "18m ago", unread: true },
  { type: "unlock", text: "Spoiler-safe discussion unlocked for Crown City S2 E1", time: "1h ago", unread: true },
  { type: "follow", text: "Jess Rivera started following you", time: "3h ago", unread: false },
  { type: "episode", text: "New episode room active: Echo Station S1 E9", time: "5h ago", unread: false },
  { type: "trending", text: "Iron District S1 E5 is trending — 611 fans discussing", time: "8h ago", unread: false },
];

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">Notifications</h1>
      <Card className="divide-y divide-border-soft p-0">
        {NOTIFS.map((n, i) => {
          const Icon = ICONS[n.type];
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
