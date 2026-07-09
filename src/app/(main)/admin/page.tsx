import { redirect } from "next/navigation";
import { ShieldAlert, Flag, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ReportCard } from "@/components/admin/report-card";
import { getAdminSnapshot } from "@/lib/admin";

export const metadata = { title: "Moderation · Watchruum" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const snap = await getAdminSnapshot();

  // Non-admins (and logged-out) never see the queue.
  if (!snap.isAdmin) redirect("/");

  const open = snap.reports.filter((r) => r.status === "open" || r.status === "reviewing");
  const settled = snap.reports.filter((r) => r.status === "resolved" || r.status === "dismissed");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-danger/15 text-danger ring-1 ring-danger/30">
          <ShieldAlert className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Moderation</h1>
          <p className="text-[13px] text-muted-2">Review reported spoilers and unsafe content.</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat icon={Flag} label="Open" value={snap.counts.open} tone="text-warn" />
        <Stat icon={CheckCircle2} label="Resolved" value={snap.counts.resolved} tone="text-safe" />
        <Stat icon={XCircle} label="Dismissed" value={snap.counts.dismissed} tone="text-muted" />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold">Open queue</h2>
        {open.length === 0 ? (
          <Card className="p-8 text-center">
            <ShieldAlert className="mx-auto mb-2 size-6 text-safe" />
            <p className="font-semibold">All clear</p>
            <p className="mt-1 text-sm text-muted-2">
              No open reports. When someone taps &quot;Report spoiler&quot; on a post, it shows up here.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {open.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        )}
      </section>

      {settled.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-muted">Recently handled</h2>
          <div className="space-y-3 opacity-70">
            {settled.slice(0, 10).map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <Card className="p-4">
      <Icon className={`size-4 ${tone}`} />
      <p className="mt-1.5 text-2xl font-extrabold">{value}</p>
      <p className="text-[12px] text-muted-2">{label}</p>
    </Card>
  );
}
