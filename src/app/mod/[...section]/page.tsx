import { ModComingSoon } from "@/components/mod/coming-soon";

export const metadata = { title: "Moderator · Watchruum" };
export const dynamic = "force-dynamic";

const TITLES: Record<string, string> = {
  reports: "Reports",
  "room-activity": "Room Activity",
  queue: "Moderation Queue",
  rooms: "Watch Rooms",
  users: "Users",
  followers: "Followers",
  "spoiler-protection": "Spoiler Protection",
  banned: "Banned Users",
  warnings: "Warnings",
  automod: "Automod Rules",
  "keyword-filters": "Keyword Filters",
  announcements: "Announcements",
  logs: "Mod Logs",
  settings: "Moderator Settings",
  guide: "Moderator Guide",
};

function titleize(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function ModSectionPage({ params }: { params: Promise<{ section: string[] }> }) {
  const { section } = await params;
  const key = section?.[0] ?? "";
  return <ModComingSoon title={TITLES[key] ?? titleize(key) ?? "Moderator Tool"} />;
}
