"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreVertical, X, Send, Users, UserCheck, Search, Loader2, CheckCircle2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, initials, posterGradient } from "@/lib/utils";
import { getRecipientOptions, sendCommunication, type RecipientOption } from "@/app/admin/communication-actions";

/** ⋮ actions trigger for a Communication item; opens a "send to all / select users" flow. */
export function SendMenu({ subject, body }: { subject: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Send options"
        className="grid size-8 place-items-center rounded-lg text-muted-2 transition hover:bg-white/5 hover:text-foreground"
      >
        <MoreVertical className="size-4" />
      </button>
      {open && <SendModal subject={subject} body={body} onClose={() => setOpen(false)} />}
    </>
  );
}

function SendModal({ subject, body, onClose }: { subject: string; body: string; onClose: () => void }) {
  const [audience, setAudience] = useState<"all" | "selected">("all");
  const [recipients, setRecipients] = useState<RecipientOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ count?: number; error?: string } | null>(null);

  useEffect(() => {
    if (audience === "selected" && recipients === null && !loading) {
      setLoading(true);
      getRecipientOptions()
        .then((r) => setRecipients(r))
        .finally(() => setLoading(false));
    }
  }, [audience, recipients, loading]);

  const filtered = useMemo(() => {
    const list = recipients ?? [];
    const q = query.trim().toLowerCase();
    return q ? list.filter((r) => `${r.name} ${r.username ?? ""}`.toLowerCase().includes(q)) : list;
  }, [recipients, query]);

  const allShownSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleAllShown = () =>
    setSelected((s) => {
      const n = new Set(s);
      if (allShownSelected) filtered.forEach((r) => n.delete(r.id));
      else filtered.forEach((r) => n.add(r.id));
      return n;
    });

  const canSend = audience === "all" || selected.size > 0;

  const send = async () => {
    setSending(true);
    const res = await sendCommunication({ subject, body, audience, userIds: [...selected] });
    setSending(false);
    if (res.ok) setResult({ count: res.count });
    else setResult({ error: res.error ?? "Couldn't send." });
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass w-full max-w-md rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
              <Send className="size-[18px]" />
            </span>
            <h3 className="text-base font-bold">Send</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted-2 hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        {result?.count != null ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto size-10 text-safe" />
            <p className="mt-3 font-semibold">Sent</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-2">
              Delivered to {result.count} {result.count === 1 ? "inbox" : "inboxes"}. Recipients see it in their
              messages now. (Email/push delivery is a later add.)
            </p>
            <div className="mt-5 flex justify-center">
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-3 truncate rounded-lg border border-border bg-white/[0.03] px-3 py-2 text-[13px] font-semibold">
              {subject}
            </p>

            <p className="mt-4 text-[12px] font-semibold text-muted">Audience</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setAudience("all")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-[13px] font-semibold transition",
                  audience === "all"
                    ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40"
                    : "border-border bg-white/[0.02] text-muted hover:text-foreground",
                )}
              >
                <Users className={cn("size-4", audience === "all" && "text-primary")} /> All Users
              </button>
              <button
                onClick={() => setAudience("selected")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-[13px] font-semibold transition",
                  audience === "selected"
                    ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40"
                    : "border-border bg-white/[0.02] text-muted hover:text-foreground",
                )}
              >
                <UserCheck className={cn("size-4", audience === "selected" && "text-primary")} /> Select Users
              </button>
            </div>

            {audience === "selected" && (
              <div className="mt-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search members..."
                      className="w-full rounded-lg border border-border bg-white/5 py-2 pl-9 pr-3 text-[13px] outline-none transition focus:border-primary/60"
                    />
                  </div>
                  <button
                    onClick={toggleAllShown}
                    disabled={filtered.length === 0}
                    className="shrink-0 rounded-lg border border-border bg-white/[0.03] px-3 py-2 text-[12px] font-semibold text-muted transition enabled:hover:text-foreground disabled:opacity-40"
                  >
                    {allShownSelected ? "Clear" : "Select all"}
                  </button>
                </div>

                <div className="mt-2 max-h-[240px] space-y-1 overflow-y-auto rounded-xl border border-border bg-white/[0.02] p-1.5">
                  {loading ? (
                    <div className="grid place-items-center py-8">
                      <Loader2 className="size-5 animate-spin text-muted-2" />
                    </div>
                  ) : filtered.length === 0 ? (
                    <p className="py-8 text-center text-[13px] text-muted-2">No members found.</p>
                  ) : (
                    filtered.map((r) => {
                      const on = selected.has(r.id);
                      return (
                        <button
                          key={r.id}
                          onClick={() => toggle(r.id)}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/5"
                        >
                          <span
                            className="grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                            style={{ background: posterGradient(r.name) }}
                          >
                            {initials(r.name)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold">{r.name}</p>
                            <p className="truncate text-[11px] text-muted-2">@{r.username ?? "member"}</p>
                          </div>
                          <span
                            className={cn(
                              "grid size-5 shrink-0 place-items-center rounded-md border transition",
                              on ? "border-primary bg-primary text-white" : "border-border",
                            )}
                          >
                            {on && <Check className="size-3.5" />}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
                <p className="mt-1.5 text-[12px] text-muted-2">{selected.size} selected</p>
              </div>
            )}

            {result?.error && <p className="mt-3 text-[13px] font-medium text-danger">{result.error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={onClose} disabled={sending}>
                Cancel
              </Button>
              <Button size="sm" onClick={send} disabled={!canSend || sending}>
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {audience === "all" ? "Send to All" : `Send to ${selected.size || ""}`.trim()}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
