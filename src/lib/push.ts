"use client";

import { savePushSubscription } from "@/app/schedule-actions";

/**
 * Client helpers to enable Web Push on this device. Fully functional once
 * `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is set and the service worker (`/sw.js`) ships.
 * Until then `pushAvailable()` is false and the UI hides the option.
 */

export function pushAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * Ask permission, register the service worker, subscribe to push, and store the
 * subscription server-side. Returns a status the caller can surface.
 */
export async function enablePush(): Promise<"enabled" | "denied" | "unsupported" | "error"> {
  if (!pushAvailable()) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      }));

    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return "error";
    const res = await savePushSubscription({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
    return res.ok ? "enabled" : "error";
  } catch {
    return "error";
  }
}
