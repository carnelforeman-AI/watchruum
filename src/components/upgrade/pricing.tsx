"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import {
  Check,
  X,
  Sparkles,
  Crown,
  Shield,
  Users,
  Star,
  Lock,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createCheckout, chooseFreePlan } from "@/app/(main)/upgrade/actions";

type Billing = "monthly" | "annual";
type PlanKey = "plus" | "founder";
type Mode = "wall" | "upgrade";

type Feature = { label: string; included: boolean; highlight?: boolean };

const FREE_FEATURES: Feature[] = [
  { label: "Unlimited spoiler-safe rooms", included: true },
  { label: "Full spoiler protection & progress tracking", included: true },
  { label: "Post, rate, review & react", included: true },
  { label: "Friend activity & notifications", included: true },
  { label: "Watchlist (up to 50 titles)", included: true },
  { label: "Ad-supported", included: true },
  { label: "No private rooms or watch parties", included: false },
  { label: "No profile customization or badges", included: false },
];

const PLUS_FEATURES: Feature[] = [
  { label: "Ad-free everywhere", included: true },
  { label: "Unlimited watchlist & full tracking history", included: true },
  { label: "Granular per-show spoiler controls", included: true },
  { label: "Priority early access to new episode rooms", included: true },
  { label: "Profile customization — themes, avatars, cinematic card", included: true },
  { label: "Verified “Superfan” badge", included: true },
  { label: "Watchruum Wrapped + deeper personal stats", included: true },
  { label: "Private rooms & invite-only watch parties", included: true },
  { label: "Custom reactions & richer, longer reviews", included: true },
];

const FOUNDER_FEATURES: Feature[] = [
  { label: "Everything in Plus", included: true, highlight: true },
  { label: "Exclusive early-adopter Founder badge", included: true },
  { label: "Direct line to the team", included: true },
  { label: "A vote on the product roadmap", included: true },
  { label: "Locked-in launch supporter pricing", included: true },
];

const HERO_POINTS = [
  {
    icon: <Lock className="size-5" />,
    title: "Spoiler protection that actually works",
    body: "Granular controls, progress tracking, and room-level spoiler safety so everyone stays in the moment.",
  },
  {
    icon: <Users className="size-5" />,
    title: "A community for every kind of fan",
    body: "Join rooms, share reactions, rate and review, and connect over every episode.",
  },
  {
    icon: <Star className="size-5" />,
    title: "Track it all. Never miss a moment.",
    body: "Calendars, reminders, and deep stats help you keep up with everything you love.",
  },
];

const TRUST = [
  { icon: <Shield className="size-5" />, title: "Spoiler-safe by design", body: "Enjoy every moment, without the spoilers." },
  { icon: <Lock className="size-5" />, title: "Your data, your control", body: "We protect your privacy and your experience." },
  { icon: <Users className="size-5" />, title: "Built for fans, by fans", body: "A community that celebrates every kind of fan." },
  { icon: <RefreshCw className="size-5" />, title: "Upgrade or downgrade", body: "Change plans anytime. We’ve got you." },
];

export function Pricing({ mode = "upgrade", signedIn }: { mode?: Mode; signedIn: boolean }) {
  const [plusBilling, setPlusBilling] = useState<Billing>("annual");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState<null | "free" | PlanKey>(null);
  const [, startTransition] = useTransition();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  };

  const startPaid = (plan: PlanKey, label: string) => {
    if (!signedIn) return;
    const billing: Billing = plan === "founder" ? "annual" : plusBilling;
    setPending(plan);
    startTransition(async () => {
      const res = await createCheckout(plan, billing);
      if (res.ok) {
        window.location.href = res.url;
        return;
      }
      setPending(null);
      if (res.reason === "unconfigured") {
        showToast(`You're on the list for ${label}. Checkout opens at launch — we'll let you know the moment it's ready.`);
      } else if (res.reason === "auth") {
        window.location.href = "/signup?next=/upgrade";
      } else {
        showToast(res.message ?? "Something went wrong starting checkout. Please try again.");
      }
    });
  };

  const startFree = () => {
    setPending("free");
    startTransition(async () => {
      const res = await chooseFreePlan();
      if (res.ok) {
        window.location.href = "/"; // full reload so the wall gate re-evaluates
        return;
      }
      setPending(null);
      showToast(res.error ?? "Could not set up your free plan. Please try again.");
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      {/* Hero */}
      <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
            Built by fans. For fans.
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl">
            Your shows.
            <br />
            Your experience.
            <br />
            <span className="brand-gradient">Your community.</span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
            Spoiler-safe rooms, smarter tracking, and a community that gets it.{" "}
            {mode === "wall" ? "Pick a plan to jump in." : "Upgrade anytime."}
          </p>
        </div>
        <div className="space-y-4">
          {HERO_POINTS.map((p) => (
            <div key={p.title} className="flex gap-3.5">
              <span className="grid size-11 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                {p.icon}
              </span>
              <div>
                <p className="text-[15px] font-bold">{p.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div className="mt-12 grid items-start gap-5 lg:grid-cols-3">
        {/* FREE */}
        <PlanCard tone="neutral" name="Free" priceNode={<Price amount="$0" unit="free forever" />} blurb="Everything you need to enjoy the community.">
          <div className="mb-5">
            {mode === "wall" ? (
              <button
                onClick={startFree}
                disabled={pending === "free"}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/50 bg-primary/10 px-4 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/20 disabled:opacity-70"
              >
                {pending === "free" && <Loader2 className="size-4 animate-spin" />}
                {pending === "free" ? "Setting up…" : "Continue with Free"}
              </button>
            ) : signedIn ? (
              <button disabled className="w-full cursor-default rounded-xl border border-border bg-white/[0.03] px-4 py-3 text-sm font-bold text-muted">
                Your current plan
              </button>
            ) : (
              <Link href="/signup" className="block w-full rounded-xl border border-primary/50 bg-primary/10 px-4 py-3 text-center text-sm font-bold text-primary transition-colors hover:bg-primary/20">
                Get started free
              </Link>
            )}
          </div>
          <FeatureList features={FREE_FEATURES} />
          <p className="mt-5 text-center text-[12px] text-muted-2">No credit card required</p>
        </PlanCard>

        {/* PLUS — featured, with its own monthly/annual toggle */}
        <PlanCard
          tone="primary"
          featured
          name="Plus"
          priceNode={
            <div>
              <Price
                amount={plusBilling === "annual" ? "$39.99" : "$4.99"}
                unit={plusBilling === "annual" ? "/yr" : "/mo"}
              />
              {/* Monthly / Annual toggle — selects which Stripe price goes to Checkout */}
              <div className="mt-3 inline-flex rounded-xl border border-border bg-white/[0.03] p-0.5">
                {(["monthly", "annual"] as Billing[]).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setPlusBilling(b)}
                    className={cn(
                      "rounded-lg px-3 py-1 text-[12px] font-bold capitalize transition-colors",
                      plusBilling === b ? "bg-gradient-to-r from-primary to-primary-strong text-white" : "text-muted hover:text-foreground",
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[12px] font-semibold text-safe">
                {plusBilling === "annual" ? "Save 33% · just $3.33/mo — 2 months free" : "Switch to annual to save 33%"}
              </p>
            </div>
          }
          blurb="Everything in Free, plus so much more."
        >
          <div className="mb-5">
            {signedIn ? (
              <button
                onClick={() => startPaid("plus", "Watchruum Plus")}
                disabled={pending === "plus"}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-3 text-sm font-bold text-white shadow-[0_8px_24px_-10px_rgba(124,58,237,0.9)] transition hover:brightness-110 disabled:opacity-70"
              >
                {pending === "plus" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {pending === "plus" ? "Starting checkout…" : "Start Plus"}
              </button>
            ) : (
              <Link href="/signup?next=/upgrade" className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-3 text-sm font-bold text-white transition hover:brightness-110">
                <Sparkles className="size-4" /> Start Plus
              </Link>
            )}
          </div>
          <FeatureList features={PLUS_FEATURES} />
          <p className="mt-5 text-center text-[12px] text-muted-2">Cancel anytime</p>
        </PlanCard>

        {/* FOUNDER */}
        <PlanCard tone="founder" name="Founder" crest priceNode={<Price amount="$89" unit="/yr" sub="annual only" />} blurb="Everything in Plus, plus exclusive Founder perks.">
          <div className="mb-4">
            {signedIn ? (
              <button
                onClick={() => startPaid("founder", "Founder")}
                disabled={pending === "founder"}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-3 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-70"
              >
                {pending === "founder" ? <Loader2 className="size-4 animate-spin" /> : <Crown className="size-4" />}
                {pending === "founder" ? "Starting checkout…" : "Become a Founder"}
              </button>
            ) : (
              <Link href="/signup?next=/upgrade" className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-3 text-sm font-bold text-black transition hover:brightness-110">
                <Crown className="size-4" /> Become a Founder
              </Link>
            )}
          </div>
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3">
            <Sparkles className="size-5 shrink-0 text-amber-400" />
            <div>
              <p className="text-[13px] font-bold text-amber-300">Limited to launch supporters</p>
              <p className="text-[12px] text-muted">Help shape the future of Watchruum.</p>
            </div>
          </div>
          <FeatureList features={FOUNDER_FEATURES} />
          <p className="mt-5 text-center text-[12px] text-muted-2">Annual only · Limited availability</p>
        </PlanCard>
      </div>

      {/* Trust strip */}
      <div className="mt-8 grid gap-6 rounded-3xl border border-border-soft bg-white/[0.02] p-6 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST.map((t) => (
          <div key={t.title} className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary">
              {t.icon}
            </span>
            <div>
              <p className="text-[13.5px] font-bold">{t.title}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{t.body}</p>
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[92%] rounded-2xl border border-primary/40 bg-panel-2 px-4 py-3 text-[13px] font-medium text-foreground shadow-[0_20px_50px_-24px_rgba(124,58,237,0.7)]">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> {toast}
          </span>
        </div>
      )}
    </div>
  );
}

function Price({ amount, unit, sub }: { amount: string; unit: string; sub?: string }) {
  return (
    <div>
      <div className="flex items-end gap-1.5">
        <span className="text-4xl font-extrabold tracking-tight text-primary">{amount}</span>
        {unit && <span className="pb-1 text-sm font-medium text-muted-2">{unit}</span>}
      </div>
      {sub && <p className="mt-0.5 text-[12px] text-muted-2">{sub}</p>}
    </div>
  );
}

function FeatureList({ features }: { features: Feature[] }) {
  return (
    <ul className="space-y-2.5">
      {features.map((f) => (
        <li key={f.label} className="flex items-start gap-2.5 text-[13px]">
          <span
            className={cn(
              "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
              f.included ? "bg-safe/15 text-safe" : "bg-white/5 text-muted-2",
            )}
          >
            {f.included ? <Check className="size-3" /> : <X className="size-3" />}
          </span>
          <span className={cn(f.included ? "text-foreground/90" : "text-muted-2", f.highlight && "font-semibold text-foreground")}>
            {f.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PlanCard({
  tone,
  name,
  priceNode,
  blurb,
  children,
  featured = false,
  crest = false,
}: {
  tone: "neutral" | "primary" | "founder";
  name: string;
  priceNode: React.ReactNode;
  blurb: string;
  children: React.ReactNode;
  featured?: boolean;
  crest?: boolean;
}) {
  const ring =
    tone === "primary" ? "ring-1 ring-primary/50" : tone === "founder" ? "ring-1 ring-amber-500/40" : "ring-1 ring-white/10";
  const blurbTone = tone === "founder" ? "text-amber-300" : "text-muted";

  return (
    <div className={cn("glass glass-hover relative flex h-full flex-col rounded-3xl p-6", ring, featured && "lg:-mt-4 lg:pb-8")}>
      {featured && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-primary to-primary-strong px-4 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-[0_8px_24px_-10px_rgba(124,58,237,0.9)]">
          Most popular
        </span>
      )}
      {crest && (
        <span className="absolute right-5 top-5 grid size-12 place-items-center rounded-full border border-amber-500/40 bg-gradient-to-br from-amber-400/25 to-amber-700/20 text-amber-300">
          <Crown className="size-6" />
        </span>
      )}

      <h3 className="text-xl font-extrabold tracking-tight">{name}</h3>
      <div className="mt-3">{priceNode}</div>
      <p className={cn("mt-4 text-[13px] font-semibold", blurbTone)}>{blurb}</p>

      <div className="mt-5 flex flex-1 flex-col">{children}</div>
    </div>
  );
}
