import { AnnouncementsView, type Announcement } from "@/components/admin/announcements-view";

export const metadata = { title: "Admin · Announcements · Watchruum" };
export const dynamic = "force-dynamic";

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "welcome",
    title: "Welcome to Watchruum!",
    summary: "A quick welcome to all our new members.",
    priority: "High",
    audience: "All Users",
    publishedDate: "May 20, 2025",
    publishedTime: "10:00 AM",
    views: 12842,
    status: "Published",
    body: "Welcome to Watchruum — the spoiler-safe home for talking about the shows and movies you love.\n\nSet the episode you're on, join a room, and chat with fans who are exactly where you are. Spoilers beyond your progress stay hidden until you're ready.\n\nWe're thrilled to have you. Jump in and find your people.",
  },
  {
    id: "features",
    title: "New Watchroom Features",
    summary: "Check out the latest updates and features.",
    priority: "Medium",
    audience: "All Users",
    publishedDate: "May 18, 2025",
    publishedTime: "02:30 PM",
    views: 8421,
    status: "Published",
    body: "We've shipped a batch of upgrades:\n\n• A redesigned Watch Rooms page with live engagement stats\n• In-app trailers that play without leaving the site\n• A Watch Calendar for upcoming releases and new episodes\n• Wider, easier-to-grab scrollbars and scroll arrows\n\nMore on the way — thanks for the feedback that shapes it.",
  },
  {
    id: "guidelines",
    title: "Community Guidelines Update",
    summary: "We've updated our community guidelines.",
    priority: "High",
    audience: "All Users",
    publishedDate: "May 16, 2025",
    publishedTime: "11:15 AM",
    views: 15230,
    status: "Published",
    body: "We've refreshed our community guidelines to keep every room welcoming and spoiler-safe.\n\nThe big points: tag your spoilers, respect where others are in a show, and keep discussions kind. Repeated violations may lead to limits or removal.\n\nPlease take a moment to review the full guidelines.",
  },
  {
    id: "maintenance",
    title: "Server Maintenance Notice",
    summary: "Scheduled maintenance this weekend.",
    priority: "Low",
    audience: "All Users",
    publishedDate: "May 14, 2025",
    publishedTime: "09:00 AM",
    views: 5642,
    status: "Published",
    body: "Watchruum will undergo scheduled maintenance this weekend.\n\nExpect a brief window of downtime on Saturday between 2:00 AM and 4:00 AM ET while we roll out performance improvements. Your progress, rooms, and messages are safe.\n\nThanks for your patience.",
  },
];

export default function AdminAnnouncementsPage() {
  return <AnnouncementsView announcements={ANNOUNCEMENTS} />;
}
