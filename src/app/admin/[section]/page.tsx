import { Construction } from "lucide-react";

export const dynamic = "force-dynamic";

const META: Record<string, { title: string; desc: string }> = {
  users: { title: "Users", desc: "Search, filter, and manage member accounts." },
  rooms: { title: "Watch Rooms", desc: "Browse and manage watch rooms across titles." },
  content: { title: "Content", desc: "Manage titles, artwork, and metadata." },
  episodes: { title: "Episodes", desc: "Manage seasons and episode data." },
  reviews: { title: "Reviews", desc: "Browse and moderate member reviews." },
  groups: { title: "Groups", desc: "Manage member groups and cohorts." },
  invites: { title: "Invites", desc: "Send and track member invitations." },
  announcements: { title: "Announcements", desc: "Broadcast messages to your community." },
  messages: { title: "Messages", desc: "Direct messages and inbox management." },
  "email-templates": { title: "Email Templates", desc: "Design transactional and marketing emails." },
  push: { title: "Push Notifications", desc: "Compose and schedule push notifications." },
  "spoiler-protection": { title: "Spoiler Protection", desc: "Tune global spoiler rules and thresholds." },
  banned: { title: "Banned Users", desc: "Review and manage banned accounts." },
  approvals: { title: "Content Approvals", desc: "Approve or reject submitted content." },
  settings: { title: "Settings", desc: "Configure platform-wide settings." },
  roles: { title: "Roles & Permissions", desc: "Define admin roles and access levels." },
  integrations: { title: "API & Integrations", desc: "Manage API keys and third-party integrations." },
  logs: { title: "Logs", desc: "Inspect system and application logs." },
  audit: { title: "Audit Trail", desc: "Full history of administrative actions." },
};

function titleize(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const meta = META[section] ?? { title: titleize(section), desc: "This section is coming soon." };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">{meta.title}</h1>
        <p className="text-[13px] text-muted-2">{meta.desc}</p>
      </div>

      <div className="glass rounded-2xl p-12 text-center">
        <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <Construction className="size-6" />
        </span>
        <p className="text-lg font-bold">In progress</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-2">
          The {meta.title} panel is scaffolded and coming soon. The navigation and layout are ready — we&apos;ll wire
          up the data and controls next.
        </p>
      </div>
    </div>
  );
}
