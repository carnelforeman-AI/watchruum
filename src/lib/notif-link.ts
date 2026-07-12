import type { NotificationItem } from "@/lib/queries";

/**
 * Where a notification should take you when clicked.
 *
 * Content notifications (a reply, like, mention, follow, invite, …) route
 * straight to *where it happened* — the review, the room, the profile — via the
 * deep link baked into `href`. System notices (a reviewed report, a moderator
 * warning, a spoiler-hidden note) are informational, so they open the detail
 * view which shows the full message and any onward link.
 *
 * Kept in its own module (only a type import from `queries`, which is erased at
 * build time) so client components can call it without dragging the server-only
 * `queries.ts` — and its `next/headers` dependency — into the client bundle.
 */
export function notificationHref(n: NotificationItem): string {
  if (n.type === "report" || n.type === "warning" || n.type === "hidden") {
    return `/notifications/${n.id}`;
  }
  return n.href && n.href !== "/notifications" ? n.href : `/notifications/${n.id}`;
}
