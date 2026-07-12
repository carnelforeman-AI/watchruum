"use client";

import { useEffect, useState } from "react";
import { BellRing, Loader2, Check } from "lucide-react";
import { enablePush, pushAvailable } from "@/lib/push";

/**
 * "Enable notifications on this device" — subscribes the browser to Web Push so
 * watch reminders arrive as real phone/desktop notifications. Hidden until Web
 * Push is available (service worker support + `NEXT_PUBLIC_VAPID_PUBLIC_KEY`),
 * so it stays invisible until the keys are configured.
 */
export function DeviceNotifications() {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"enabled" | "denied" | "error" | null>(null);

  useEffect(() => {
    // Check after mount to avoid an SSR/client hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAvailable(pushAvailable());
  }, []);

  if (!available) return null;

  async function turnOn() {
    setBusy(true);
    setStatus(null);
    const res = await enablePush();
    setBusy(false);
    setStatus(res === "unsupported" ? "error" : res);
  }

  return (
    <div className="mt-4 flex items-start justify-between gap-4 border-t border-border pt-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold">Notifications on this device</p>
        <p className="text-[12px] text-muted-2">
          Get watch reminders and alerts as push notifications on this phone or computer.
        </p>
        {status === "enabled" && (
          <p className="mt-1.5 flex items-center gap-1 text-[12px] font-medium text-safe"><Check className="size-3.5" /> Enabled on this device</p>
        )}
        {status === "denied" && (
          <p className="mt-1.5 text-[12px] font-medium text-warn">Permission blocked — enable notifications for this site in your browser settings.</p>
        )}
        {status === "error" && (
          <p className="mt-1.5 text-[12px] font-medium text-danger">Couldn&apos;t enable push on this device.</p>
        )}
      </div>
      <button
        onClick={turnOn}
        disabled={busy || status === "enabled"}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-3.5 py-2 text-[13px] font-semibold hover:bg-white/[0.07] disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
        {status === "enabled" ? "Enabled" : "Enable"}
      </button>
    </div>
  );
}
