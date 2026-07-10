import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  Megaphone,
  Lock,
  DoorOpen,
  Users,
  LifeBuoy,
  Flag,
  Sparkles,
  Mail,
} from "lucide-react";
import { getInbox, type MessageItem } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata = { title: "Inbox · Watchruum" };
export const dynamic = "force-dynamic";

const ICONS: Record<MessageItem["kind"], React.ComponentType<{ className?: string }>> = {
  admin: Shield,
  moderator: ShieldAlert,
  warning: AlertTriangle,
  announcement: Megaphone,
  security: Lock,
  invite: DoorOpen,
  room: Users,
  support: LifeBuoy,
  report: Flag,
  feature: Sparkles,
};

export default async function InboxPage() {
  const { messages, unreadMessages } = await getInbox();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Inbox</h1>
        {unreadMessages > 0 && (
          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[12px] font-semibold text-primary">
            {unreadMessages} unread
          </span>
        )}
      </div>

      <div className="panel divide-y divide-border-soft overflow-hidden rounded-2xl">
        {messages.map((m, i) => {
          const Icon = ICONS[m.kind] ?? Mail;
          return (
            <div key={i} className={cn("flex items-start gap-3 p-4", m.unread && "bg-primary/[0.06]")}>
              <span
                className={cn(
                  "mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl",
                  m.official ? "bg-primary/15 text-primary" : "bg-white/5 text-foreground",
                )}
              >
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[14px] font-semibold">{m.from}</p>
                  {m.official && (
                    <span className="rounded bg-white/10 px-1.5 py-px text-[10px] font-medium text-muted-2">
                      Official
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-[11px] text-muted-2">{m.time}</span>
                </div>
                <p className="mt-0.5 text-[13px] font-medium text-foreground/90">{m.subject}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{m.preview}</p>
              </div>
              {m.unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
