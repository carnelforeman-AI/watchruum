"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Bell,
  BellRing,
  LogOut,
  Lock,
  Loader2,
  Check,
  Languages,
  MessageSquare,
  Reply,
  Heart,
  CalendarClock,
  Flame,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { setProfilePrivacy, setShowActivity, setPreferredLanguage, setSpoilerSafety, setNotificationPrefs } from "@/app/actions";
import { LANGUAGES } from "@/lib/lang";
import { DeviceNotifications } from "@/components/settings/device-notifications";
import { AccessibilityPanel } from "@/components/settings/accessibility-panel";

const SAFETY = [
  { value: "strict", label: "Strict", desc: "Hide everything beyond my progress. Recommended." },
  { value: "balanced", label: "Balanced", desc: "Blur spoilers but let me peek with one click." },
  { value: "off", label: "Off", desc: "Show everything. I like living dangerously." },
];

// Dark dropdown options with purple text, to match the theme (native <option>
// styling is honored by Chromium/Firefox).
const optionStyle: React.CSSProperties = {
  backgroundColor: "var(--color-bg-elevated)",
  color: "var(--color-primary)",
};

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors",
        on ? "bg-primary" : "bg-white/15",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-white shadow-sm transition-transform",
          on ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

interface NotifPrefs {
  messages: boolean;
  replies: boolean;
  likes: boolean;
  releases: boolean;
  reminders: boolean;
  unlocks: boolean;
  trending: boolean;
}

// Row config for the Manage Notifications card — order, icon, tint and copy.
const NOTIF_ROWS: { key: keyof NotifPrefs; label: string; desc: string; Icon: LucideIcon; color: string }[] = [
  { key: "messages", label: "Direct messages", desc: "Get notified when someone sends you a message.", Icon: MessageSquare, color: "bg-accent" },
  { key: "replies", label: "Replies to my posts", desc: "Get notified when someone replies to your posts or comments.", Icon: Reply, color: "bg-accent" },
  { key: "likes", label: "Likes on my reviews", desc: "Get notified when someone likes your review.", Icon: Heart, color: "bg-danger" },
  { key: "reminders", label: "Scheduled watch reminders", desc: "Get reminded before your scheduled shows or movies.", Icon: CalendarClock, color: "bg-safe" },
  { key: "releases", label: "New release alerts", desc: "Get notified about new episodes and movie releases.", Icon: BellRing, color: "bg-warn" },
  { key: "unlocks", label: "Discussion unlocks", desc: "Get notified when a discussion you follow is unlocked.", Icon: Lock, color: "bg-primary" },
  { key: "trending", label: "Trending room alerts", desc: "Get notified about popular rooms and trending discussions.", Icon: Flame, color: "bg-season" },
];

const ALL_ON: NotifPrefs = { messages: true, replies: true, likes: true, releases: true, reminders: true, unlocks: true, trending: true };

export function SettingsPanel({
  initialPrivate = false,
  initialShowActivity = true,
  initialLanguage = null,
  initialSafety = "strict",
  initialNotifs = { messages: true, replies: true, likes: true, releases: true, reminders: true, unlocks: true, trending: false },
}: {
  initialPrivate?: boolean;
  initialShowActivity?: boolean;
  initialLanguage?: string | null;
  initialSafety?: string;
  initialNotifs?: NotifPrefs;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [safety, setSafety] = useState(initialSafety);
  const [savedSafety, setSavedSafety] = useState(false);
  const [safetyPending, startSafety] = useTransition();
  const [notifs, setNotifs] = useState<NotifPrefs>(initialNotifs);
  const [savedNotifs, setSavedNotifs] = useState(false);
  const [notifsPending, startNotifs] = useTransition();
  const [openRow, setOpenRow] = useState<string | null>(null);
  // "Live" once Web Push is configured — the "Coming soon" badge clears itself then.
  const notifLive = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  function changeSafety(next: string) {
    if (next === safety) return;
    const prev = safety;
    setSafety(next);
    setSavedSafety(false);
    startSafety(async () => {
      const res = await setSpoilerSafety(next);
      if (res.ok) setSavedSafety(true);
      else setSafety(prev); // revert on failure
    });
  }

  function toggleNotif(key: keyof NotifPrefs) {
    const prev = notifs;
    const next = { ...notifs, [key]: !notifs[key] };
    setNotifs(next);
    setSavedNotifs(false);
    startNotifs(async () => {
      const res = await setNotificationPrefs(next);
      if (res.ok) setSavedNotifs(true);
      else setNotifs(prev); // revert on failure
    });
  }

  function enableAllNotifs() {
    const prev = notifs;
    setNotifs(ALL_ON);
    setSavedNotifs(false);
    startNotifs(async () => {
      const res = await setNotificationPrefs(ALL_ON);
      if (res.ok) setSavedNotifs(true);
      else setNotifs(prev); // revert on failure
    });
  }
  const [isPrivate, setIsPrivate] = useState(initialPrivate);
  const [savedPrivate, setSavedPrivate] = useState(false);
  const [pending, startPrivacy] = useTransition();
  const [showActivity, setShowActivityState] = useState(initialShowActivity);
  const [savedActivity, setSavedActivity] = useState(false);
  const [activityPending, startActivity] = useTransition();
  const [language, setLanguage] = useState<string>(initialLanguage ?? "");
  const [savedLang, setSavedLang] = useState(false);
  const [langPending, startLang] = useTransition();

  function togglePrivacy() {
    const next = !isPrivate;
    setIsPrivate(next);
    setSavedPrivate(false);
    startPrivacy(async () => {
      const res = await setProfilePrivacy(next);
      if (res.ok) setSavedPrivate(true);
      else setIsPrivate(!next); // revert on failure
    });
  }

  function toggleActivity() {
    const next = !showActivity;
    setShowActivityState(next);
    setSavedActivity(false);
    startActivity(async () => {
      const res = await setShowActivity(next);
      if (res.ok) setSavedActivity(true);
      else setShowActivityState(!next); // revert on failure
    });
  }

  function changeLanguage(code: string) {
    const prev = language;
    setLanguage(code);
    setSavedLang(false);
    startLang(async () => {
      const res = await setPreferredLanguage(code || null);
      if (res.ok) {
        setSavedLang(true);
        router.refresh();
      } else {
        setLanguage(prev); // revert on failure
      }
    });
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="size-4 text-primary" />
          <h2 className="font-semibold">Privacy</h2>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Private profile</p>
            <p className="text-[12px] text-muted-2">
              When on, other members only see your name and avatar. Your bio, favorite genres, stats and reviews stay
              hidden from everyone but you.
            </p>
            {savedPrivate && !pending && (
              <p className="mt-1.5 flex items-center gap-1 text-[12px] font-medium text-safe">
                <Check className="size-3.5" /> Saved
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {pending && <Loader2 className="size-4 animate-spin text-muted-2" />}
            <Toggle on={isPrivate} onClick={togglePrivacy} />
          </div>
        </div>

        <div className="mt-4 flex items-start justify-between gap-4 border-t border-border pt-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Show my current room to friends</p>
            <p className="text-[12px] text-muted-2">
              When on, people you follow can see which watch room you&apos;re in on their Friends panel. Turn it off to
              browse rooms invisibly — nobody sees where you are.
            </p>
            {savedActivity && !activityPending && (
              <p className="mt-1.5 flex items-center gap-1 text-[12px] font-medium text-safe">
                <Check className="size-3.5" /> Saved
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {activityPending && <Loader2 className="size-4 animate-spin text-muted-2" />}
            <Toggle on={showActivity} onClick={toggleActivity} />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Languages className="size-4 text-primary" />
          <h2 className="font-semibold">Language</h2>
        </div>
        <p className="mb-3 text-[13px] text-muted">
          Posts, reviews and chat written in another language get translated to yours automatically — with a
          &ldquo;Show original&rdquo; toggle, so you never miss a conversation.
        </p>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
              aria-label="Preferred language"
              className="w-full appearance-none rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition [color-scheme:dark] hover:border-primary/40 focus:border-primary/60"
            >
              <option value="" style={optionStyle}>Auto (match my device)</option>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} style={optionStyle}>
                  {l.name} · {l.native}
                </option>
              ))}
            </select>
          </div>
          {langPending && <Loader2 className="size-4 shrink-0 animate-spin text-muted-2" />}
          {savedLang && !langPending && (
            <span className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-safe">
              <Check className="size-3.5" /> Saved
            </span>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <h2 className="font-semibold">Spoiler safety</h2>
          {safetyPending && <Loader2 className="size-4 animate-spin text-muted-2" />}
          {savedSafety && !safetyPending && (
            <span className="flex items-center gap-1 text-[12px] font-medium text-safe">
              <Check className="size-3.5" /> Saved
            </span>
          )}
        </div>
        <div className="space-y-2">
          {SAFETY.map((s) => (
            <button
              key={s.value}
              onClick={() => changeSafety(s.value)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                safety === s.value ? "border-primary/50 bg-primary/10" : "border-border bg-white/[0.02] hover:bg-white/5",
              )}
            >
              <span className={cn("mt-0.5 grid size-4 place-items-center rounded-full border", safety === s.value ? "border-primary" : "border-muted-2")}>
                {safety === s.value && <span className="size-2 rounded-full bg-primary" />}
              </span>
              <span>
                <span className="block text-sm font-semibold">{s.label}</span>
                <span className="block text-[12px] text-muted-2">{s.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Bell className="size-4 shrink-0 text-primary" />
            <h2 className="font-semibold">Manage Notifications</h2>
            {notifsPending && <Loader2 className="size-4 animate-spin text-muted-2" />}
            {savedNotifs && !notifsPending && (
              <span className="flex items-center gap-1 text-[12px] font-medium text-safe">
                <Check className="size-3.5" /> Saved
              </span>
            )}
          </div>
          <button
            onClick={enableAllNotifs}
            className="shrink-0 text-[12.5px] font-semibold text-primary transition hover:brightness-110"
          >
            Enable all
          </button>
        </div>
        <p className="mb-4 text-[12px] text-muted-2">Choose what you want to be notified about.</p>

        <div className="space-y-2.5">
          {NOTIF_ROWS.map(({ key, label, desc, Icon, color }) => {
            const open = openRow === key;
            return (
              <div key={key} className="rounded-xl border border-border bg-white/[0.02]">
                <div className="flex items-center gap-3 p-3">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-white", color)}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-[12px] leading-snug text-muted-2">{desc}</p>
                  </div>
                  <Toggle on={notifs[key]} onClick={() => toggleNotif(key)} />
                  <button
                    onClick={() => setOpenRow(open ? null : key)}
                    aria-label={open ? "Hide details" : "Show details"}
                    aria-expanded={open}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-muted-2 transition hover:bg-white/5 hover:text-foreground"
                  >
                    <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} />
                  </button>
                </div>
                {open && (
                  <div className="border-t border-border px-3 py-2.5 text-[12px] text-muted-2">
                    {notifs[key] ? (
                      <>
                        <span className="font-medium text-foreground">On.</span>{" "}
                        {notifLive
                          ? "Delivered to your notification bell and pushed to your devices."
                          : "Delivered to your notification bell. Device push is rolling out soon."}
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-foreground">Off.</span> You won&apos;t be notified about this.
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DeviceNotifications />
      </Card>

      <AccessibilityPanel />

      <Card className="p-5">
        <h2 className="mb-1 font-semibold">Account</h2>
        <p className="mb-4 text-[13px] text-muted">Sign out of Watchruum on this device.</p>
        <Button variant="danger" onClick={signOut}>
          <LogOut /> Sign out
        </Button>
      </Card>
    </div>
  );
}
