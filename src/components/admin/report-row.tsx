"use client";

import { useRouter } from "next/navigation";
import { Flag, CheckCircle2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";
import type { RecentReportRow } from "@/lib/admin";

/** A clickable Recent Reports row — opens that report on the Reports page. */
export function ReportRow({ report: r }: { report: RecentReportRow }) {
  const router = useRouter();
  const href = `/admin/reports#report-${r.id}`;
  const go = () => router.push(href);

  return (
    <tr
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={`View report on ${r.content}`}
      className="cursor-pointer border-b border-border/60 outline-none transition-colors last:border-0 hover:bg-white/[0.03] focus-visible:bg-white/[0.05]"
    >
      <td className="py-2.5 pr-4">
        <span className="inline-flex items-center gap-1.5 text-muted">
          <Flag className="size-3.5 text-danger" /> {r.type === "review" ? "Review" : "Post"}
        </span>
      </td>
      <td className="max-w-[200px] truncate py-2.5 pr-4 font-medium">{r.content}</td>
      <td className="py-2.5 pr-4 text-muted">{r.reporter}</td>
      <td className="max-w-[180px] truncate py-2.5 pr-4 text-muted">{r.reason}</td>
      <td className="whitespace-nowrap py-2.5 pr-4 text-muted-2">{timeAgo(r.created_at)}</td>
      <td className="py-2.5">
        <StatusBadge status={r.status} />
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "resolved")
    return (
      <Badge variant="safe">
        <CheckCircle2 className="size-3" /> Resolved
      </Badge>
    );
  if (status === "dismissed") return <Badge variant="neutral">Dismissed</Badge>;
  if (status === "reviewing") return <Badge variant="warn">Reviewing</Badge>;
  return (
    <Badge variant="danger">
      <ShieldAlert className="size-3" /> New
    </Badge>
  );
}
