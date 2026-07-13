"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  UserPlus,
  Users,
  Play,
  MessageSquare,
  X,
  Contact,
  Activity as ActivityIcon,
  Star,
  Pencil,
  Heart,
  MessageCircle,
  UserCheck,
  ShieldOff,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toggleFollow } from "@/app/actions";
import { unblockUser } from "@/app/(main)/u/block-actions";
import { useFriendsPresence } from "@/lib/use-presence";
import { FriendsDirectory, type Person } from "@/components/friends/friends-directory";
import type { FriendsHubData, HubPerson, HubOnline, HubActivity, BlockedPerson } from "@/lib/friends";

type TabKey = "overview" | "all" | "online" | "requests" | "find" | "blocked";

function statusDot(status: "online" | "away") {
  return status === "online" ? "bg-safe" : "bg-warn";
}

function activityIcon(verb: string) {
  if (verb.includes("rated")) return { icon: Star, tone: "text-warn" };
  if (verb.includes("review")) return { icon: Pencil, tone: "text-accent-2" };
  if (verb.includes("comment")) return { icon: MessageCircle, tone: "text-accent" };
  if (verb.includes("lik")) return { icon: Heart, tone: "text-danger" };
  return { icon: Users, tone: "text-primary" };
}

export function FriendsHub({ data, suggestionsForFind }: { data: FriendsHubData; suggestionsForFind: Person[] }) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [requests, setRequests] = useState<HubPerson[]>(data.requests);
  const [suggestions, setSuggestions] = useState<HubPerson[]>(data.suggestions);
  const [blocked, setBlocked] = useState<BlockedPerson[]>(data.blocked);
  const [, start] = useTransition();

  // Live room presence, scoped to who the viewer follows (Supabase Realtime).
  // Resolution: if anyone the viewer follows is really in a room, show that
  // (badged "Live"). Otherwise, pre-launch (demo mode) falls back to the seeded
  // list so the tab stays populated; once Go Live is on, an empty presence set
  // means the tab is genuinely empty — no fake friends.
  const livePresence = useFriendsPresence(data.followingIds);
  const onlineIsLive = livePresence.length > 0;
  const online: HubOnline[] = onlineIsLive
    ? livePresence.map((p) => ({
        name: p.name,
        avatar: p.avatar,
        room: p.room,
        roomHref: p.roomHref,
        status: p.status,
      }))
    : data.live
      ? []
      : data.online;

  function accept(p: HubPerson) {
    setRequests((r) => r.filter((x) => x.id !== p.id));
    start(() => void toggleFollow(p.id, true));
  }
  function decline(id: string) {
    setRequests((r) => r.filter((x) => x.id !== id));
  }
  function add(p: HubPerson) {
    setSuggestions((s) => s.filter((x) => x.id !== p.id));
    start(() => void toggleFollow(p.id, true));
  }
  function dismiss(id: string) {
    setSuggestions((s) => s.filter((x) => x.id !== id));
  }
  function unblock(id: string) {
    setBlocked((b) => b.filter((x) => x.id !== id));
    start(() => void unblockUser(id));
  }

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "all", label: "All Friends", count: data.counts.friends || undefined },
    { key: "online", label: "Online", count: online.length || undefined },
    { key: "requests", label: "Requests", count: requests.length || undefined },
    { key: "find", label: "Find Friends" },
    { key: "blocked", label: "Blocked", count: blocked.length || undefined },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Friends</h1>
          <p className="mt-1 text-[13.5px] text-muted-2">
            Connect with friends, see what they&apos;re watching, and stay in the loop.
          </p>
        </div>
        <button
          onClick={() => setTab("find")}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          <UserPlus className="size-4" /> Add Friend
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-[14px] font-semibold transition-colors",
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-2 hover:text-foreground",
            )}
          >
            {t.label}
            {t.count != null && (
              <span
                className={cn(
                  "grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold",
                  t.key === "requests" ? "bg-primary text-white" : "bg-white/10 text-foreground",
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-5">
            <OnlinePanel online={online} isLive={onlineIsLive} onViewAll={() => setTab("online")} />
            <ActivityPanel activity={data.activity} />
          </div>
          <aside className="space-y-5">
            <RequestsCard requests={requests} onAccept={accept} onDecline={decline} onViewAll={() => setTab("requests")} />
            <SuggestionsCard people={suggestions} onAdd={add} onDismiss={dismiss} onViewAll={() => setTab("find")} />
            <ConnectCard onConnect={() => setTab("find")} />
          </aside>
        </div>
      )}

      {tab === "all" && <FriendsGrid people={data.friends} emptyText="You aren't following anyone yet. Head to Find Friends." />}

      {tab === "online" && <OnlineGrid online={online} isLive={onlineIsLive} live={data.live} />}

      {tab === "requests" && (
        <div className="max-w-2xl space-y-3">
          {requests.length === 0 ? (
            <Empty icon={UserPlus} title="No pending requests" subtitle="When someone follows you, they'll show up here." />
          ) : (
            requests.map((p) => (
              <div key={p.id} className="glass flex items-center gap-3 rounded-2xl p-4">
                <Link href={`/u/${p.username}`}>
                  <Avatar name={p.display_name} src={p.avatar_url} />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{p.display_name}</p>
                  <p className="truncate text-[12px] text-muted-2">{p.mutual} mutual friends</p>
                </div>
                <button onClick={() => accept(p)} className="rounded-lg bg-primary px-3 py-2 text-[12.5px] font-bold text-white hover:bg-primary-strong">
                  Accept
                </button>
                <button onClick={() => decline(p.id)} className="rounded-lg border border-border px-3 py-2 text-[12.5px] font-semibold text-muted hover:text-foreground">
                  Decline
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "find" && (
        <div>
          {!data.signedIn && (
            <p className="mb-4 text-[13px] text-muted">
              <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link> to follow other fans.
            </p>
          )}
          <FriendsDirectory people={suggestionsForFind} signedIn={data.signedIn} embedded />
        </div>
      )}

      {tab === "blocked" &&
        (blocked.length === 0 ? (
          <Empty
            icon={ShieldOff}
            title="No blocked members"
            subtitle="Blocking someone stops them from messaging you, and hides you from each other. You can block a member from their profile — anyone you block will show up here so you can unblock them anytime."
          />
        ) : (
          <div className="max-w-2xl space-y-3">
            <p className="text-[13px] text-muted-2">
              Blocked members can&apos;t message you or start a chat. Changed your mind? Unblock anytime.
            </p>
            {blocked.map((p) => (
              <div key={p.id} className="glass flex items-center gap-3 rounded-2xl p-4">
                <Link href={`/u/${p.username}`} className="shrink-0">
                  <Avatar name={p.display_name} src={p.avatar_url} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${p.username}`} className="block truncate text-sm font-bold hover:underline">
                    {p.display_name}
                  </Link>
                  <p className="truncate text-[12px] text-muted-2">
                    @{p.username}
                    {p.since ? ` · blocked ${p.since}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => unblock(p.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12.5px] font-semibold text-muted transition-colors hover:border-safe/40 hover:text-safe"
                >
                  <UserCheck className="size-3.5" /> Unblock
                </button>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

/* ------------------------------------------------------------ subcomponents */

function OnlinePanel({ online, isLive, onViewAll }: { online: HubOnline[]; isLive: boolean; onViewAll: () => void }) {
  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <span className="size-2.5 rounded-full bg-safe" /> Friends Online
          {isLive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-safe/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-safe">
              <span className="size-1.5 animate-pulse rounded-full bg-safe" /> Live
            </span>
          )}
        </h2>
        <button onClick={onViewAll} className="text-[12px] font-semibold text-primary hover:underline">
          View all
        </button>
      </div>
      {online.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted-2">
          No friends in a room right now. When someone you follow joins one, they&apos;ll show up here.
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {online.map((f, i) => (
            <div key={i} className="w-[172px] shrink-0 rounded-2xl border border-border bg-white/[0.02] p-4 text-center">
              <div className="relative mx-auto w-fit">
                <Avatar name={f.name} src={f.avatar} size="lg" className="size-16" />
                <span
                  role="img"
                  aria-label={f.status === "online" ? "Online" : "Away"}
                  title={f.status === "online" ? "Online" : "Away"}
                  className={cn("absolute bottom-0 right-0 size-3.5 rounded-full ring-2 ring-bg-elevated", statusDot(f.status))}
                />
              </div>
              <p className="mt-2 truncate text-[14px] font-bold">{f.name}</p>
              <p className="truncate text-[12px] text-muted-2">
                In <span className="text-primary">{f.room}</span> Room
              </p>
              {f.members && (
                <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-muted-2">
                  <Users className="size-3" /> {f.members} members
                </p>
              )}
              <Link
                href={f.roomHref ?? "/rooms"}
                className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-primary/15 py-2 text-[12.5px] font-semibold text-primary hover:bg-primary/25"
              >
                {f.status === "online" ? <Play className="size-3.5" /> : <MessageSquare className="size-3.5" />}
                {f.status === "online" ? "Join Room" : "Message"}
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ActivityPanel({ activity }: { activity: HubActivity[] }) {
  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <ActivityIcon className="size-4 text-primary" /> Friend Activity
        </h2>
        <Link href="/activity" className="text-[12px] font-semibold text-primary hover:underline">
          View all activity
        </Link>
      </div>
      <div className="divide-y divide-border-soft">
        {activity.map((a) => {
          const { icon: Icon, tone } = activityIcon(a.verb);
          return (
            <div key={a.id} className="flex items-start gap-3 py-3 first:pt-0">
              <Avatar name={a.name} size="sm" />
              <span className={cn("mt-1 shrink-0", tone)}>
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] leading-tight">
                  <span className="font-semibold">{a.name}</span> <span className="text-muted">{a.verb}</span>{" "}
                  {a.score ? <span className="font-semibold text-warn">★ {a.score}/10</span> : null}
                </p>
                <p className="truncate text-[12px] text-muted-2">{a.target}</p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-2">{a.when}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RequestsCard({
  requests,
  onAccept,
  onDecline,
  onViewAll,
}: {
  requests: HubPerson[];
  onAccept: (p: HubPerson) => void;
  onDecline: (id: string) => void;
  onViewAll: () => void;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold">
          <UserPlus className="size-4 text-primary" /> Friend Requests
        </h3>
        <button onClick={onViewAll} className="text-[12px] font-semibold text-primary hover:underline">
          View all
        </button>
      </div>
      {requests.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-muted-2">No pending requests.</p>
      ) : (
        <ul className="space-y-3">
          {requests.slice(0, 3).map((p) => (
            <li key={p.id} className="flex items-center gap-2.5">
              <Avatar name={p.display_name} src={p.avatar_url} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{p.display_name}</p>
                <p className="truncate text-[11px] text-muted-2">{p.mutual} mutual friends</p>
              </div>
              <button onClick={() => onAccept(p)} className="rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-primary-strong">
                Accept
              </button>
              <button onClick={() => onDecline(p.id)} className="rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted hover:text-foreground">
                Decline
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SuggestionsCard({
  people,
  onAdd,
  onDismiss,
  onViewAll,
}: {
  people: HubPerson[];
  onAdd: (p: HubPerson) => void;
  onDismiss: (id: string) => void;
  onViewAll: () => void;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold">People You May Know</h3>
        <button onClick={onViewAll} className="text-[12px] font-semibold text-primary hover:underline">
          View all
        </button>
      </div>
      {people.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-muted-2">No suggestions right now.</p>
      ) : (
        <ul className="space-y-3">
          {people.slice(0, 5).map((p) => (
            <li key={p.id} className="flex items-center gap-2.5">
              <Link href={`/u/${p.username}`}>
                <Avatar name={p.display_name} src={p.avatar_url} size="sm" />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{p.display_name}</p>
                <p className="truncate text-[11px] text-muted-2">{p.mutual} mutual friends</p>
              </div>
              <button onClick={() => onAdd(p)} className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2.5 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/25">
                <UserPlus className="size-3" /> Add
              </button>
              <button onClick={() => onDismiss(p.id)} aria-label="Dismiss" className="grid size-7 place-items-center rounded-md text-muted-2 hover:bg-white/5 hover:text-foreground">
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ConnectCard({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="glass rounded-2xl border border-primary/20 bg-primary/[0.04] p-5">
      <span className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
        <Contact className="size-5" />
      </span>
      <h3 className="mt-3 text-base font-bold">Find more friends</h3>
      <p className="mt-1 text-[12.5px] text-muted">Search for fans by name or @username to grow your circle.</p>
      <button
        onClick={onConnect}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
      >
        <UserPlus className="size-4" /> Find Friends
      </button>
    </div>
  );
}

function FriendsGrid({ people, emptyText }: { people: HubPerson[]; emptyText: string }) {
  if (people.length === 0) return <Empty icon={Users} title="No friends yet" subtitle={emptyText} />;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((p) => (
        <div key={p.id} className="glass flex items-center gap-3 rounded-2xl p-4">
          <Link href={`/u/${p.username}`}>
            <Avatar name={p.display_name} src={p.avatar_url} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/u/${p.username}`} className="block truncate text-sm font-bold hover:underline">
              {p.display_name}
            </Link>
            <p className="truncate text-[12px] text-muted-2">@{p.username}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg border border-safe/40 bg-safe/10 px-2.5 py-1.5 text-[12px] font-semibold text-safe">
            <UserCheck className="size-3.5" /> Friends
          </span>
        </div>
      ))}
    </div>
  );
}

function OnlineGrid({ online, isLive, live }: { online: HubOnline[]; isLive: boolean; live: boolean }) {
  if (online.length === 0)
    return (
      <Empty
        icon={Users}
        title="No friends online right now"
        subtitle={
          live
            ? "When someone you follow hops into a room, they'll appear here in real time."
            : "Live presence is ready — friends will appear here in real time once the app is live."
        }
      />
    );
  return (
    <div>
      {isLive && (
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-safe/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-safe">
          <span className="size-1.5 animate-pulse rounded-full bg-safe" /> Live now
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {online.map((f, i) => (
          <div key={i} className="glass rounded-2xl p-4 text-center">
            <div className="relative mx-auto w-fit">
              <Avatar name={f.name} src={f.avatar} size="lg" className="size-16" />
              <span
                role="img"
                aria-label={f.status === "online" ? "Online" : "Away"}
                title={f.status === "online" ? "Online" : "Away"}
                className={cn("absolute bottom-0 right-0 size-3.5 rounded-full ring-2 ring-bg-elevated", statusDot(f.status))}
              />
            </div>
            <p className="mt-2 truncate text-[14px] font-bold">{f.name}</p>
            <p className="truncate text-[12px] text-muted-2">In <span className="text-primary">{f.room}</span> Room</p>
            <Link href={f.roomHref ?? "/rooms"} className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-primary/15 py-2 text-[12.5px] font-semibold text-primary hover:bg-primary/25">
              <Play className="size-3.5" /> Join Room
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string }) {
  return (
    <div className="glass grid place-items-center rounded-2xl px-6 py-16 text-center">
      <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-white/5 text-muted-2">
        <Icon className="size-6" />
      </span>
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-2">{subtitle}</p>
    </div>
  );
}
