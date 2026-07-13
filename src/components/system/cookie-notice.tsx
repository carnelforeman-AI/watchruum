"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";

const KEY = "watchruum:cookie-notice-dismissed";

/**
 * Minimal essential-cookies notice. We only use strictly-necessary cookies and
 * on-device preferences (no tracking), so this is an acknowledgement, not a
 * consent gate. Dismissal is remembered on the device.
 */
export function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      // storage blocked — just don't show it
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
    setShow(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl rounded-2xl border border-border bg-panel-2/95 p-4 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl md:inset-x-auto md:right-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Cookie className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-relaxed text-muted">
            We use only essential cookies to keep you signed in — no ad or tracking cookies. See our{" "}
            <Link href="/cookies" className="font-semibold text-primary hover:underline">Cookie Policy</Link> and{" "}
            <Link href="/privacy" className="font-semibold text-primary hover:underline">Privacy Policy</Link>.
          </p>
          <button
            onClick={dismiss}
            className="mt-3 rounded-lg bg-gradient-to-r from-primary to-primary-strong px-3.5 py-1.5 text-[12.5px] font-bold text-white transition hover:brightness-110"
          >
            Got it
          </button>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-2 transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
