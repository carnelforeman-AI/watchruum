"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { addAdminNote, warnUser } from "@/app/admin-actions";

export function AddNoteForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    start(async () => {
      const res = await addAdminNote(userId, text);
      if (res.ok) {
        setText("");
        router.refresh();
      } else {
        setErr(res.error ?? "Something went wrong");
      }
    });
  }

  const empty = text.trim().length === 0;

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <Textarea
        placeholder="Add a private admin note…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-h-16"
      />
      {err && <p className="text-[12px] text-danger">{err}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={empty || pending}>
          {pending ? "Adding…" : "Add note"}
        </Button>
      </div>
    </form>
  );
}

export function IssueWarningForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    start(async () => {
      const res = await warnUser(userId, reason);
      if (res.ok) {
        setReason("");
        router.refresh();
      } else {
        setErr(res.error ?? "Something went wrong");
      }
    });
  }

  const empty = reason.trim().length === 0;

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <Textarea
        placeholder="Reason for warning…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="min-h-16"
      />
      {err && <p className="text-[12px] text-danger">{err}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" variant="danger" disabled={empty || pending}>
          {pending ? "Issuing…" : "Issue warning"}
        </Button>
      </div>
    </form>
  );
}
