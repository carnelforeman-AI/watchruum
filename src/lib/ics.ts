/**
 * Calendar-export helpers (client-safe). Turns a scheduled watch into a
 * downloadable .ics file and a "Add to Google Calendar" URL, so the watch
 * lands in the person's real calendar app and fires a native phone reminder —
 * no push infrastructure required.
 */

export interface CalendarEvent {
  title: string;
  description?: string;
  start: Date;
  durationMinutes?: number; // default 120
  url?: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** UTC timestamp in the compact form calendars expect: 20260712T200000Z */
function toICSDate(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeICS(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildICS(ev: CalendarEvent): string {
  const end = new Date(ev.start.getTime() + (ev.durationMinutes ?? 120) * 60_000);
  const uid = `${toICSDate(ev.start)}-${Math.abs(hash(ev.title))}@watchruum`;
  const desc = [ev.description, ev.url].filter(Boolean).join("\\n\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Watchruum//Watch Schedule//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toICSDate(ev.start)}`,
    `DTSTART:${toICSDate(ev.start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${escapeICS(ev.title)}`,
    desc ? `DESCRIPTION:${escapeICS(desc)}` : "",
    ev.url ? `URL:${escapeICS(ev.url)}` : "",
    // A reminder 30 minutes before, so the phone pings ahead of time.
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeICS(ev.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

/** One VCALENDAR containing many events — used to export a whole schedule. */
export function buildICSMulti(events: CalendarEvent[]): string {
  const head = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Watchruum//Watch Schedule//EN", "CALSCALE:GREGORIAN"];
  const body = events.flatMap((ev) => {
    const end = new Date(ev.start.getTime() + (ev.durationMinutes ?? 120) * 60_000);
    const uid = `${toICSDate(ev.start)}-${Math.abs(hash(ev.title))}@watchruum`;
    const desc = [ev.description, ev.url].filter(Boolean).join("\\n\\n");
    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${toICSDate(ev.start)}`,
      `DTSTART:${toICSDate(ev.start)}`,
      `DTEND:${toICSDate(end)}`,
      `SUMMARY:${escapeICS(ev.title)}`,
      desc ? `DESCRIPTION:${escapeICS(desc)}` : "",
      ev.url ? `URL:${escapeICS(ev.url)}` : "",
      "BEGIN:VALARM",
      "TRIGGER:-PT30M",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeICS(ev.title)}`,
      "END:VALARM",
      "END:VEVENT",
    ].filter(Boolean);
  });
  return [...head, ...body, "END:VCALENDAR"].filter(Boolean).join("\r\n");
}

/** Download a single .ics file containing all provided events. */
export function downloadICSMulti(events: CalendarEvent[], filename = "watchruum-schedule.ics"): void {
  const blob = new Blob([buildICSMulti(events)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function googleCalendarUrl(ev: CalendarEvent): string {
  const end = new Date(ev.start.getTime() + (ev.durationMinutes ?? 120) * 60_000);
  const dates = `${toICSDate(ev.start)}/${toICSDate(end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates,
    details: [ev.description, ev.url].filter(Boolean).join("\n\n"),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Trigger a browser download of the .ics for an event. */
export function downloadICS(ev: CalendarEvent, filename = "watchruum-event.ics"): void {
  const blob = new Blob([buildICS(ev)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
