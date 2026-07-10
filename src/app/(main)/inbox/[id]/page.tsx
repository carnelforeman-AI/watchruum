import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
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
import { getMessage, type MessageKind } from "@/lib/queries";
import { DetailDeleteButton } from "@/components/inbox/detail-delete-button";

export const dynamic = "force-dynamic";

const ICONS: Record<MessageKind, React.ComponentType<{ className?: string }>> = {
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

function cta(kind: MessageKind): { label: string; href: string } | null {
  switch (kind) {
    case "invite":
    case "room":
      return { label: "Browse rooms", href: "/rooms" };
    case "security":
      return { label: "Go to Settings", href: "/settings" };
    case "announcement":
    case "feature":
      return { label: "Explore Watchruum", href: "/explore" };
    default:
      return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await getMessage(id);
  return { title: m ? `${m.subject} · Watchruum` : "Message · Watchruum" };
}

export default async function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await getMessage(id);
  if (!m) notFound();

  const Icon = ICONS[m.kind] ?? Mail;
  const action = cta(m.kind);
  const paragraphs = m.body.split(/\n{2,}/);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <Link
        href="/inbox"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to inbox
      </Link>

      <div className="panel overflow-hidden rounded-2xl">
        <div className="flex items-start gap-4 border-b border-border p-6">
          <span
            className={`grid size-12 shrink-0 place-items-center rounded-2xl ${
              m.official ? "bg-primary/15 text-primary ring-1 ring-primary/25" : "bg-white/5 text-foreground"
            }`}
          >
            <Icon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14px] font-semibold">{m.from}</p>
              {m.official && (
                <span className="rounded bg-white/10 px-1.5 py-px text-[10px] font-medium text-muted-2">Official</span>
              )}
              <span className="ml-auto text-[11px] text-muted-2">{m.time}</span>
            </div>
            <h1 className="mt-1 text-xl font-extrabold tracking-tight">{m.subject}</h1>
          </div>
        </div>

        <div className="space-y-4 p-6">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-[14px] leading-relaxed text-foreground/90">
              {p}
            </p>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-border p-4">
          {action && (
            <Link
              href={action.href}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-primary-strong"
            >
              {action.label} <ArrowUpRight className="size-4" />
            </Link>
          )}
          <DetailDeleteButton id={m.id} kind="messages" backHref="/inbox" />
        </div>
      </div>
    </div>
  );
}
