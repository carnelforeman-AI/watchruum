"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Sparkles, Crown, Shield, ChevronRight, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { createBillingPortal } from "@/app/(main)/upgrade/actions";

export type Tier = "free" | "plus" | "founder";

const META: Record<Tier, { label: string; icon: React.ReactNode; tone: string; blurb: string }> = {
  free: {
    label: "Free",
    icon: <Shield className="size-5" />,
    tone: "bg-white/5 text-muted",
    blurb: "Spoiler-safe rooms, tracking, and the community — free forever.",
  },
  plus: {
    label: "Watchruum Plus",
    icon: <Sparkles className="size-5" />,
    tone: "bg-primary/15 text-primary",
    blurb: "Ad-free, personalized profiles, private watch parties, and more.",
  },
  founder: {
    label: "Founder",
    icon: <Crown className="size-5" />,
    tone: "bg-amber-500/15 text-amber-400",
    blurb: "Everything in Plus, plus your exclusive Founder badge and perks.",
  },
};

export function MembershipCard({
  tier,
  status,
  billing,
  hasCustomer,
  isPreview = false,
}: {
  tier: Tier;
  status?: string | null;
  billing?: string | null;
  hasCustomer: boolean;
  isPreview?: boolean;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meta = META[tier];
  const paid = tier !== "free";

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };

  const manage = () => {
    startTransition(async () => {
      const res = await createBillingPortal();
      if (res.ok) {
        window.location.href = res.url;
        return;
      }
      if (res.reason === "unconfigured") showToast("Billing management opens once Stripe is connected.");
      else if (res.reason === "none") showToast("No active subscription to manage yet.");
      else showToast(res.message ?? "Couldn’t open billing. Please try again.");
    });
  };

  const statusLabel =
    paid && status && status !== "active"
      ? status.replace(/_/g, " ")
      : billing
        ? `Billed ${billing}`
        : null;

  return (
    <div className="glass mb-5 rounded-2xl p-5 ring-1 ring-primary/25">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-[13px] font-bold uppercase tracking-widest text-muted-2">Membership</h2>
        {isPreview && (
          <span className="rounded-full bg-warn/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-warn">
            Preview
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-xl", meta.tone)}>{meta.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
            {meta.label}
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-2">
              Current plan
            </span>
            {statusLabel && (
              <span className="text-[11px] font-semibold capitalize text-muted-2">· {statusLabel}</span>
            )}
          </p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{meta.blurb}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        {tier === "free" ? (
          <Link
            href="/upgrade"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_24px_-12px_rgba(124,58,237,0.9)] transition hover:brightness-110"
          >
            <Sparkles className="size-4" /> Upgrade
          </Link>
        ) : (
          <button
            onClick={manage}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/[0.04] px-4 py-2.5 text-[13px] font-bold text-foreground transition-colors hover:bg-white/[0.08] disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
            {pending ? "Opening…" : "Manage billing"}
          </button>
        )}

        <Link
          href="/upgrade"
          className="inline-flex items-center gap-1 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-muted transition-colors hover:text-foreground"
        >
          {tier === "free" ? "Compare plans" : "See all plans"} <ChevronRight className="size-4" />
        </Link>
      </div>

      {paid && !hasCustomer && (
        <p className="mt-3 text-[11.5px] text-muted-2">
          Billing management becomes available once your subscription syncs.
        </p>
      )}

      {toast && (
        <p className="mt-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-[12px] font-medium text-primary">
          {toast}
        </p>
      )}
    </div>
  );
}
