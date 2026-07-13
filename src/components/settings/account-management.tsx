"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2, ShieldCheck, FileText, Cookie, Loader2, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { exportMyData, deleteMyAccount } from "@/app/(main)/settings/privacy-actions";

export function AccountManagement() {
  const router = useRouter();
  const supabase = createClient();

  const [exporting, startExport] = useTransition();
  const [exportErr, setExportErr] = useState<string | null>(null);

  const [confirm, setConfirm] = useState("");
  const [deleting, startDelete] = useTransition();
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);

  const runExport = () => {
    setExportErr(null);
    startExport(async () => {
      const res = await exportMyData();
      if (!res.ok) {
        setExportErr(res.error);
        return;
      }
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `watchruum-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  };

  const runDelete = () => {
    setDeleteErr(null);
    startDelete(async () => {
      const res = await deleteMyAccount(confirm);
      if (!res.ok) {
        setDeleteErr(res.error ?? "Something went wrong.");
        return;
      }
      if (supabase) await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <>
      {/* Data & privacy */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <h2 className="font-semibold">Your data &amp; privacy</h2>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Download your data</p>
            <p className="text-[12px] text-muted-2">
              Get a JSON copy of your profile, reviews, ratings, watch history and messages you&apos;ve sent.
            </p>
          </div>
          <button
            onClick={runExport}
            disabled={exporting}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-white/[0.04] px-3.5 py-2 text-[13px] font-bold text-foreground transition-colors hover:bg-white/[0.08] disabled:opacity-60"
          >
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {exporting ? "Preparing…" : "Download"}
          </button>
        </div>
        {exportErr && <p className="mt-2 text-[12px] font-medium text-danger">{exportErr}</p>}

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-4 text-[12.5px]">
          <Link href="/privacy" className="inline-flex items-center gap-1.5 font-semibold text-muted transition-colors hover:text-foreground">
            <ShieldCheck className="size-3.5" /> Privacy Policy
          </Link>
          <Link href="/terms" className="inline-flex items-center gap-1.5 font-semibold text-muted transition-colors hover:text-foreground">
            <FileText className="size-3.5" /> Terms of Service
          </Link>
          <Link href="/cookies" className="inline-flex items-center gap-1.5 font-semibold text-muted transition-colors hover:text-foreground">
            <Cookie className="size-3.5" /> Cookie Policy
          </Link>
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="border-danger/30 p-5">
        <div className="mb-1 flex items-center gap-2">
          <AlertTriangle className="size-4 text-danger" />
          <h2 className="font-semibold text-danger">Delete account</h2>
        </div>
        <p className="mb-4 text-[13px] text-muted">
          Permanently delete your account and all associated data — profile, reviews, ratings, watch history and
          messages. This cannot be undone, and any active membership is cancelled.
        </p>

        {!armed ? (
          <button
            onClick={() => setArmed(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 text-[13px] font-bold text-danger transition-colors hover:bg-danger/20"
          >
            <Trash2 className="size-4" /> Delete my account
          </button>
        ) : (
          <div className="rounded-xl border border-danger/30 bg-danger/[0.06] p-4">
            <label htmlFor="delconfirm" className="text-[13px] font-semibold">
              Type <span className="font-mono text-danger">DELETE</span> to confirm
            </label>
            <input
              id="delconfirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              className="mt-2 w-full rounded-lg border border-border bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-danger/60"
              placeholder="DELETE"
            />
            {deleteErr && <p className="mt-2 text-[12px] font-medium text-danger">{deleteErr}</p>}
            <div className="mt-3 flex gap-2">
              <button
                onClick={runDelete}
                disabled={deleting || confirm.trim().toUpperCase() !== "DELETE"}
                className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-3.5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-danger/90 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                {deleting ? "Deleting…" : "Permanently delete"}
              </button>
              <button
                onClick={() => {
                  setArmed(false);
                  setConfirm("");
                  setDeleteErr(null);
                }}
                disabled={deleting}
                className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-semibold text-muted transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
