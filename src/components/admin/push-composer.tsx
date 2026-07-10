"use client";

import { useState } from "react";
import { Plus, X, Send, CheckCircle2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

const AUDIENCES = ["All Users", "Active Users", "Subscribed Users", "Show Followers", "Returning Users"];

export function PushComposer() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState(AUDIENCES[0]);
  const [done, setDone] = useState(false);

  const reset = () => {
    setTitle("");
    setBody("");
    setAudience(AUDIENCES[0]);
    setDone(false);
  };
  const close = () => {
    setOpen(false);
    reset();
  };

  return (
    <>
      <button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2.5 text-[14px] font-bold text-white shadow-[0_8px_24px_-10px_rgba(124,58,237,0.9)] transition hover:brightness-110"
      >
        <Plus className="size-4" /> New Push
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div className="glass w-full max-w-lg rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Bell className="size-[18px]" />
                </span>
                <h3 className="text-base font-bold">New Push Notification</h3>
              </div>
              <button onClick={close} aria-label="Close" className="text-muted-2 hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            {done ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto size-10 text-safe" />
                <p className="mt-3 font-semibold">Draft ready</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-2">
                  Push delivery isn&apos;t connected to a provider yet, so this is a preview. Your notification for{" "}
                  <span className="font-semibold text-foreground">{audience}</span> looks good and is ready to schedule
                  once delivery is wired up.
                </p>
                <div className="mt-5 flex justify-center gap-2">
                  <Button variant="secondary" size="sm" onClick={reset}>
                    Compose another
                  </Button>
                  <Button size="sm" onClick={close}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <label className="mt-4 block text-[12px] font-semibold text-muted">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                  placeholder="e.g. New trailer just dropped!"
                  className="mt-1.5"
                />

                <label className="mt-3 block text-[12px] font-semibold text-muted">Message</label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write the push message…"
                  className="mt-1.5 min-h-24"
                />

                <label className="mt-3 block text-[12px] font-semibold text-muted">Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-white/5 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary/60"
                >
                  {AUDIENCES.map((a) => (
                    <option key={a} value={a} className="bg-bg-elevated">
                      {a}
                    </option>
                  ))}
                </select>

                {/* Live preview */}
                <div className="mt-4 rounded-xl border border-border bg-white/[0.03] p-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Preview</p>
                  <div className="flex items-start gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-white">
                      <Bell className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold">{title || "Notification title"}</p>
                      <p className="line-clamp-2 text-[12px] text-muted">
                        {body || "Your message preview shows up here."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={close}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => setDone(true)} disabled={!title.trim() || !body.trim()}>
                    <Send className="size-4" /> Schedule Push
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
