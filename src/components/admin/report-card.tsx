"use client";

import { useState, useTransition } from "react";
import { Flag, Trash2, Check, X, MessageSquare, Star, Clock, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";
import { scopeLabel } from "@/lib/spoiler";
import { setReportStatus, removeReportedContent, markContentSpoiler } from "@/app/admin-actions";
import type { ModReport } from "@/lib/admin";

const STATUS_VARIANT: Record<string, "warn" | "safe" | "neutral"> = {
  open: "warn",
  reviewing: "warn",
  resolved: "safe",
  dismissed: "neutral",
};

export function ReportCard({ report }: { report: ModReport }) {
  const [status, setStatus] = useState(report.status);
  const [removed, setRemoved] = useState(false);
  const [scopeShown, setScopeShown] = useState(report.content?.spoiler_scope ?? "none");
  const [pending, start] = useTransition();

  function act(fn: () => Promise<unknown>, nextStatus?: typeof status) {
    if (nextStatus) setStatus(nextStatus);
    start(() => {
      fn();
    });
  }

  const Icon = report.target_type === "comment" ? MessageSquare : Star;
  const settled = status === "resolved" || status === "dismissed";

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[13px]">
          <Icon className="size-4 text-primary" />
          <span className="font-semibold capitalize">{report.target_type} reported</span>
          <span className="text-muted-2">by {report.reporter_name}</span>
          <span className="flex items-center gap-1 text-muted-2">
            <Clock className="size-3" /> {timeAgo(report.created_at)}
          </span>
        </div>
        <Badge variant={STATUS_VARIANT[status]} className="capitalize">
          {status}
        </Badge>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Badge variant="danger">
          <Flag className="size-3" /> {report.reason}
        </Badge>
      </div>

      {/* The reported content */}
      {removed ? (
        <p className="mt-3 rounded-xl border border-border bg-white/[0.02] p-3 text-[13px] text-muted-2">
          Content removed.
        </p>
      ) : report.content ? (
        <div className="mt-3 rounded-xl border border-border bg-white/[0.02] p-3">
          <div className="mb-1.5 flex items-center gap-2 text-[12px] text-muted-2">
            <span className="font-semibold text-muted">{report.content.author_name}</span>
            {report.content.media_title && <span>· {report.content.media_title}</span>}
            <Badge variant="neutral">
              {scopeLabel(report.content.season_number, report.content.episode_number)}
            </Badge>
            <Badge variant={scopeShown === "none" ? "neutral" : "warn"} className="capitalize">
              {scopeShown} spoiler
            </Badge>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{report.content.body}</p>
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-border bg-white/[0.02] p-3 text-[13px] text-muted-2">
          The reported content no longer exists.
        </p>
      )}

      {/* Actions */}
      {!settled && !removed && (
        <div className="mt-3 flex flex-wrap gap-2">
          {report.content && (
            <Button
              size="sm"
              variant="danger"
              disabled={pending}
              onClick={() => {
                setRemoved(true);
                setStatus("resolved");
                start(() => {
                  removeReportedContent(report.id, report.target_type, report.target_id);
                });
              }}
            >
              <Trash2 className="size-3.5" /> Remove content
            </Button>
          )}
          {report.content && scopeShown === "none" && (
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setScopeShown("series");
                setStatus("resolved");
                start(() => {
                  markContentSpoiler(report.id, report.target_type, report.target_id, "series");
                });
              }}
            >
              <EyeOff className="size-3.5" /> Mark as spoiler
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => act(() => setReportStatus(report.id, "resolved"), "resolved")}
          >
            <Check className="size-3.5" /> Mark resolved
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => act(() => setReportStatus(report.id, "dismissed"), "dismissed")}
          >
            <X className="size-3.5" /> Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
