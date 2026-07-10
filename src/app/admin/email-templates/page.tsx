import { EmailTemplatesView, type EmailTemplate } from "@/components/admin/email-templates-view";

export const metadata = { title: "Admin · Email Templates · Watchruum" };
export const dynamic = "force-dynamic";

const TEMPLATES: EmailTemplate[] = [
  {
    id: "welcome",
    name: "Welcome Email",
    category: "User Onboarding",
    subject: "Welcome to Watchruum! 🎉",
    updated: "May 18, 2025",
    by: "Admin",
    usage: 1245,
    active: true,
    body: "Hey {first_name},\n\nWelcome to Watchruum — the spoiler-safe home for talking about the shows and movies you love.\n\nSet what episode you're on, join a room, and chat with fans who are exactly where you are. No spoilers, ever.\n\nEnter your first Watchruum →\n\n— The Watchruum Team",
  },
  {
    id: "verify",
    name: "Verify Email",
    category: "Account",
    subject: "Verify your email address",
    updated: "May 15, 2025",
    by: "Admin",
    usage: 3782,
    active: true,
    body: "Hi {first_name},\n\nConfirm your email address to finish setting up your Watchruum account.\n\nVerify my email →\n\nThis link expires in 24 hours. If you didn't create an account, you can safely ignore this message.\n\n— The Watchruum Team",
  },
  {
    id: "new-episode",
    name: "New Episode Alert",
    category: "Engagement",
    subject: "{show_title} – New Episode is Live!",
    updated: "May 20, 2025",
    by: "Admin",
    usage: 8642,
    active: true,
    body: "{show_title} just dropped a new episode!\n\n{season_episode} — \"{episode_title}\" is now live. The room is already filling up with reactions from fans at your exact episode.\n\nJoin the discussion →\n\nWatching later? We'll keep your room spoiler-safe until you catch up.\n\n— The Watchruum Team",
  },
  {
    id: "digest",
    name: "Watchroom Digest",
    category: "Digest",
    subject: "Your Weekly Watchroom Digest",
    updated: "May 19, 2025",
    by: "Admin",
    usage: 2918,
    active: true,
    body: "Here's what you missed this week, {first_name}:\n\n• Top reactions from the rooms you follow\n• New episodes now safe to discuss\n• Trending titles your friends just joined\n\nOpen your digest →\n\nEverything below your current progress stays hidden — no spoilers.\n\n— The Watchruum Team",
  },
  {
    id: "password-reset",
    name: "Password Reset",
    category: "Account",
    subject: "Reset your Watchruum password",
    updated: "May 10, 2025",
    by: "Admin",
    usage: 1103,
    active: true,
    body: "Hi {first_name},\n\nWe got a request to reset your Watchruum password.\n\nReset my password →\n\nThis link expires in 1 hour. If you didn't request this, no action is needed — your password stays the same.\n\n— The Watchruum Team",
  },
];

export default function AdminEmailTemplatesPage() {
  return <EmailTemplatesView templates={TEMPLATES} />;
}
