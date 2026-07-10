"use client";

import { useMemo, useRef, useState } from "react";
import {
  Users,
  Sparkles,
  UserPlus,
  PieChart,
  Upload,
  Copy,
  Check,
  Smile,
  Bold,
  Italic,
  Underline,
  Link2,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  ChevronDown,
  Calendar,
  X,
  Send,
  Save,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AUDIENCES = [
  { key: "all", label: "All Users", icon: Users },
  { key: "new", label: "New Users", icon: Sparkles },
  { key: "specific", label: "Specific Users", icon: UserPlus },
  { key: "segment", label: "Custom Segment", icon: PieChart },
] as const;

const INVITE_TYPES = ["General Invite", "VIP / Early Access", "Beta Tester", "Creator / Partner", "Moderator"];

const DEFAULT_MESSAGE = `Hi {{first_name}},

You're invited to join Watchruum, the community for movies and TV fans. Connect with others, join watch rooms, track what you're watching, and never miss a moment.

Click the button below to create your account and get started!

See you inside,
The Watchruum Team`;

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function InvitesComposer({ nowIso }: { nowIso: string }) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);

  const expireOptions = useMemo(() => {
    const opts = [7, 14, 30, 90].map((days) => {
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      return { value: String(days), label: `${fmtDate(d)} (${days} days)` };
    });
    return [...opts, { value: "never", label: "Never expires" }];
  }, [now]);

  const [name, setName] = useState("VIP Launch Invite – Spring 2025");
  const [type, setType] = useState(INVITE_TYPES[0]);
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]["key"]>("specific");
  const [recipientsRaw, setRecipientsRaw] = useState("");
  const [showRecipients, setShowRecipients] = useState(false);

  const [subject, setSubject] = useState("You're Invited to Watchruum 🎉");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [showVars, setShowVars] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const [link] = useState("https://watchruum.app/join/abc123xyz");
  const [copied, setCopied] = useState(false);
  const [expire, setExpire] = useState("14");
  const [maxUsesOn, setMaxUsesOn] = useState(false);
  const [maxUses, setMaxUses] = useState("500");

  const [opts, setOpts] = useState({
    sendNow: true,
    allowForward: false,
    trackOpens: true,
    requireVerify: false,
  });

  const [review, setReview] = useState(false);
  const [saved, setSaved] = useState(false);

  const parsed = useMemo(() => {
    const entries = recipientsRaw.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    const seen = new Set<string>();
    const rows: { email: string; state: "valid" | "duplicate" | "invalid" }[] = [];
    let valid = 0,
      dup = 0,
      invalid = 0;
    for (const e of entries) {
      if (!EMAIL_RE.test(e)) {
        rows.push({ email: e, state: "invalid" });
        invalid++;
      } else if (seen.has(e.toLowerCase())) {
        rows.push({ email: e, state: "duplicate" });
        dup++;
      } else {
        seen.add(e.toLowerCase());
        rows.push({ email: e, state: "valid" });
        valid++;
      }
    }
    return { total: entries.length, valid, dup, invalid, rows };
  }, [recipientsRaw]);

  const needsRecipients = audience === "specific" || audience === "segment";

  const insertVar = (token: string) => {
    const el = messageRef.current;
    if (!el) {
      setMessage((m) => m + token);
    } else {
      const start = el.selectionStart ?? message.length;
      const end = el.selectionEnd ?? message.length;
      setMessage(message.slice(0, start) + token + message.slice(end));
      requestAnimationFrame(() => {
        el.focus();
        el.selectionStart = el.selectionEnd = start + token.length;
      });
    }
    setShowVars(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-[15px]">
          <span className="text-muted-2">Invites</span>
          <ChevronRight className="size-4 text-muted-2" />
          <span className="font-bold">Send New Invite</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setSaved(true);
              setTimeout(() => setSaved(false), 2500);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/[0.03] px-4 py-2.5 text-[14px] font-semibold text-foreground transition hover:bg-white/[0.06]"
          >
            <Save className="size-4" /> Save as Draft
          </button>
          <button
            onClick={() => setReview(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2.5 text-[14px] font-bold text-white shadow-[0_8px_24px_-10px_rgba(124,58,237,0.9)] transition hover:brightness-110"
          >
            Review &amp; Send
          </button>
        </div>
      </div>

      {saved && (
        <div className="mb-4 rounded-xl border border-safe/30 bg-safe/10 px-4 py-2.5 text-[13px] text-foreground">
          Draft saved (preview — invites aren&apos;t persisted to a mail provider yet).
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* ---------------- left column ---------------- */}
        <div className="space-y-6">
          {/* section 1 */}
          <Panel step={1} title="Invite Details" subtitle="Set up the basics for your invite.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Invite Name (Internal)" hint="This is for internal reference only.">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Invite Type" hint="Choose the type of invite you want to send.">
                <SelectBox value={type} onChange={setType} options={INVITE_TYPES} />
              </Field>
            </div>

            <p className="mt-5 text-[13px] font-semibold">Audience</p>
            <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {AUDIENCES.map((a) => {
                const Icon = a.icon;
                const active = audience === a.key;
                return (
                  <button
                    key={a.key}
                    onClick={() => setAudience(a.key)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-[13px] font-semibold transition",
                      active
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40"
                        : "border-border bg-white/[0.02] text-muted hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("size-4", active && "text-primary")} /> {a.label}
                  </button>
                );
              })}
            </div>

            {needsRecipients && (
              <>
                <p className="mt-5 text-[13px] font-semibold">Add Recipients</p>
                <div className="mt-2 flex gap-2.5">
                  <textarea
                    value={recipientsRaw}
                    onChange={(e) => setRecipientsRaw(e.target.value)}
                    placeholder="Enter email addresses separated by commas or new lines"
                    className="min-h-[52px] flex-1 rounded-xl border border-border bg-white/5 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary/60"
                  />
                  <button className="inline-flex h-fit items-center gap-2 self-start rounded-xl border border-border bg-white/[0.03] px-4 py-2.5 text-[13px] font-semibold text-muted transition hover:text-foreground">
                    <Upload className="size-4" /> Upload CSV
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-white/[0.02] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
                      <Users className="size-[18px]" />
                    </span>
                    <div>
                      <p className="text-[14px] font-bold">{parsed.total} Recipients</p>
                      <p className="text-[12px] text-muted-2">
                        {parsed.valid} valid · {parsed.dup} duplicates · {parsed.invalid} invalid
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRecipients(true)}
                    disabled={parsed.total === 0}
                    className="rounded-lg border border-border bg-white/[0.03] px-3.5 py-2 text-[13px] font-semibold text-muted transition enabled:hover:text-foreground disabled:opacity-40"
                  >
                    View Recipients
                  </button>
                </div>
              </>
            )}
          </Panel>

          {/* section 2 */}
          <Panel step={2} title="Invite Message" subtitle="Customize the message your invitees will receive.">
            <Field label="Subject">
              <div className="relative">
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="pr-10" />
                <Smile className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
              </div>
            </Field>

            <p className="mt-4 text-[13px] font-semibold">Message</p>
            <div className="mt-1.5 overflow-hidden rounded-xl border border-border">
              {/* toolbar */}
              <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-white/[0.03] px-2 py-1.5">
                <ToolSelect />
                <Sep />
                <ToolBtn><Bold className="size-4" /></ToolBtn>
                <ToolBtn><Italic className="size-4" /></ToolBtn>
                <ToolBtn><Underline className="size-4" /></ToolBtn>
                <ToolBtn><Link2 className="size-4" /></ToolBtn>
                <Sep />
                <ToolBtn><List className="size-4" /></ToolBtn>
                <ToolBtn><ListOrdered className="size-4" /></ToolBtn>
                <Sep />
                <ToolBtn><AlignLeft className="size-4" /></ToolBtn>
                <ToolBtn><AlignCenter className="size-4" /></ToolBtn>
                <ToolBtn><AlignRight className="size-4" /></ToolBtn>
                <Sep />
                <ToolBtn><ImageIcon className="size-4" /></ToolBtn>
                <div className="relative ml-auto">
                  <button
                    onClick={() => setShowVars((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold text-muted transition hover:bg-white/5 hover:text-foreground"
                  >
                    Variables <ChevronDown className="size-3.5" />
                  </button>
                  {showVars && (
                    <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-bg-elevated py-1 shadow-2xl">
                      {["{{first_name}}", "{{site_name}}", "{{invite_link}}"].map((v) => (
                        <button
                          key={v}
                          onClick={() => insertVar(v)}
                          className="block w-full px-3 py-2 text-left text-[12px] font-medium text-muted transition hover:bg-white/5 hover:text-foreground"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <textarea
                ref={messageRef}
                value={message}
                maxLength={5000}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[220px] w-full resize-none bg-transparent px-4 py-3.5 text-[14px] leading-relaxed outline-none"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[12px] text-muted-2">
              <span>
                Use variables: <code className="rounded bg-white/10 px-1">{"{{first_name}}"}</code>,{" "}
                <code className="rounded bg-white/10 px-1">{"{{site_name}}"}</code>,{" "}
                <code className="rounded bg-white/10 px-1">{"{{invite_link}}"}</code>
              </span>
              <span>{message.length}/5000 characters</span>
            </div>
          </Panel>
        </div>

        {/* ---------------- right column ---------------- */}
        <div className="space-y-6">
          {/* preview */}
          <div>
            <h3 className="text-[15px] font-bold">Invite Preview</h3>
            <p className="text-[12px] text-muted-2">This is how your invite will appear to recipients.</p>
            <div className="glass mt-3 rounded-2xl border border-border-soft p-8 text-center">
              <p className="text-2xl font-extrabold">
                Watch<span className="brand-gradient bg-clip-text text-transparent">ruum</span>
              </p>
              <span className="mx-auto mt-4 grid size-14 place-items-center rounded-full bg-primary/15 text-primary">
                <Users className="size-6" />
              </span>
              <p className="mt-4 text-xl font-extrabold">You&apos;re Invited!</p>
              <p className="mx-auto mt-2 max-w-[260px] text-[13px] text-muted">
                Join Watchruum and be part of the ultimate community for movie and TV lovers.
              </p>
              <div className="mt-5 w-full rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2.5 text-[14px] font-bold text-white">
                Accept Invite
              </div>
              <p className="mt-3 text-[12px] text-muted-2">
                This invite link expires in {expire === "never" ? "—" : `${expire} days`}.
              </p>
            </div>
          </div>

          {/* section 3 */}
          <Panel step={3} title="Invite Link & Expiration" subtitle="Manage how your invite works." dense>
            <Field label="Invite Link">
              <div className="flex gap-2">
                <Input value={link} readOnly className="flex-1" />
                <button
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-3 text-[13px] font-semibold text-muted transition hover:text-foreground"
                >
                  {copied ? <Check className="size-4 text-safe" /> : <Copy className="size-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </Field>

            <Field label="Link Expires" className="mt-4">
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
                <select
                  value={expire}
                  onChange={(e) => setExpire(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-border bg-white/5 py-2.5 pl-10 pr-9 text-sm outline-none transition focus:border-primary/60"
                >
                  {expireOptions.map((o) => (
                    <option key={o.value} value={o.value} className="bg-bg-elevated">
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
              </div>
            </Field>

            <div className="mt-4 flex items-center justify-between gap-3">
              <Checkbox checked={maxUsesOn} onChange={() => setMaxUsesOn((v) => !v)} label="Set maximum uses" />
              <Input
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ""))}
                disabled={!maxUsesOn}
                className="w-20 text-center disabled:opacity-40"
              />
            </div>
          </Panel>

          {/* section 4 */}
          <Panel step={4} title="Additional Options" dense>
            <div className="space-y-3">
              <Checkbox checked={opts.sendNow} onChange={() => setOpts((o) => ({ ...o, sendNow: !o.sendNow }))} label="Send email invites immediately" />
              <Checkbox checked={opts.allowForward} onChange={() => setOpts((o) => ({ ...o, allowForward: !o.allowForward }))} label="Allow invitees to forward this invite" />
              <Checkbox checked={opts.trackOpens} onChange={() => setOpts((o) => ({ ...o, trackOpens: !o.trackOpens }))} label="Track opens and clicks" />
              <Checkbox checked={opts.requireVerify} onChange={() => setOpts((o) => ({ ...o, requireVerify: !o.requireVerify }))} label="Require email verification" />
            </div>
          </Panel>
        </div>
      </div>

      {/* recipients modal */}
      {showRecipients && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowRecipients(false)}>
          <div className="glass w-full max-w-md rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Recipients ({parsed.total})</h3>
              <button onClick={() => setShowRecipients(false)} aria-label="Close" className="text-muted-2 hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-3 max-h-[50vh] space-y-1 overflow-y-auto">
              {parsed.rows.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 text-[13px] hover:bg-white/5">
                  <span className="truncate">{r.email}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                      r.state === "valid" && "bg-safe/15 text-safe",
                      r.state === "duplicate" && "bg-[#f59e0b]/15 text-[#f59e0b]",
                      r.state === "invalid" && "bg-danger/15 text-danger",
                    )}
                  >
                    {r.state}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* review modal */}
      {review && (
        <ReviewModal
          onClose={() => setReview(false)}
          summary={{
            name,
            type,
            audience: AUDIENCES.find((a) => a.key === audience)?.label ?? "",
            recipients: needsRecipients ? parsed.valid : null,
            subject,
            expire: expireOptions.find((o) => o.value === expire)?.label ?? "",
          }}
        />
      )}
    </div>
  );
}

/* ---------------- helpers ---------------- */

function Panel({
  step,
  title,
  subtitle,
  children,
  dense,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  dense?: boolean;
}) {
  return (
    <div className={cn("glass rounded-2xl border border-border-soft", dense ? "p-4" : "p-5")}>
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-[13px] font-bold text-white">
          {step}
        </span>
        <div>
          <h2 className="text-[16px] font-bold leading-tight">{title}</h2>
          {subtitle && <p className="text-[12px] text-muted-2">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[13px] font-semibold text-muted">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[12px] text-muted-2">{hint}</p>}
    </div>
  );
}

function SelectBox({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-border bg-white/5 py-2.5 pl-3.5 pr-9 text-sm outline-none transition focus:border-primary/60"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-bg-elevated">
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
    </div>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button onClick={onChange} className="flex items-center gap-2.5 text-left text-[13px]">
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-md border transition",
          checked ? "border-primary bg-primary text-white" : "border-border bg-white/5",
        )}
      >
        {checked && <Check className="size-3.5" />}
      </span>
      <span className={checked ? "text-foreground" : "text-muted"}>{label}</span>
    </button>
  );
}

function ToolBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="grid size-7 place-items-center rounded-md text-muted-2 transition hover:bg-white/5 hover:text-foreground">
      {children}
    </button>
  );
}

function ToolSelect() {
  return (
    <button className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-muted transition hover:bg-white/5 hover:text-foreground">
      Paragraph <ChevronDown className="size-3" />
    </button>
  );
}

function Sep() {
  return <span className="mx-1 h-5 w-px bg-border" />;
}

function ReviewModal({
  onClose,
  summary,
}: {
  onClose: () => void;
  summary: { name: string; type: string; audience: string; recipients: number | null; subject: string; expire: string };
}) {
  const [sent, setSent] = useState(false);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass w-full max-w-md rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Review &amp; Send</h3>
          <button onClick={onClose} aria-label="Close" className="text-muted-2 hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        {sent ? (
          <div className="py-8 text-center">
            <Check className="mx-auto size-10 rounded-full bg-safe/15 p-2 text-safe" />
            <p className="mt-3 font-semibold">Invite ready to send</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-2">
              This is a preview — invites aren&apos;t connected to a mail provider yet. Everything is validated and ready
              to go once delivery is wired up.
            </p>
            <div className="mt-5 flex justify-center">
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <dl className="mt-4 space-y-2.5 text-[13px]">
              <Row label="Invite name" value={summary.name} />
              <Row label="Type" value={summary.type} />
              <Row label="Audience" value={summary.audience} />
              {summary.recipients != null && <Row label="Valid recipients" value={String(summary.recipients)} />}
              <Row label="Subject" value={summary.subject} />
              <Row label="Expires" value={summary.expire} />
            </dl>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Back
              </Button>
              <Button size="sm" onClick={() => setSent(true)}>
                <Send className="size-4" /> Send Invites
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-muted-2">{label}</dt>
      <dd className="truncate text-right font-medium">{value || "—"}</dd>
    </div>
  );
}
