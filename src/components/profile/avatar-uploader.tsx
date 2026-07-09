"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { updateAvatar } from "@/app/actions";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB

export function AvatarUploader({
  userId,
  name,
  src,
}: {
  userId: string;
  name: string;
  src: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(src);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [, start] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setErr(null);

    if (!file.type.startsWith("image/")) {
      setErr("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setErr("Image must be under 3 MB.");
      return;
    }
    if (!supabase) {
      setErr("Storage isn't configured.");
      return;
    }

    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${userId}/avatar_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;
      const res = await updateAvatar(url);
      if (!res.ok) throw new Error(res.error || "Couldn't save your photo.");

      setPreview(url);
      start(() => router.refresh());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative w-fit">
      <Avatar name={name} src={preview} size="lg" className="size-20 text-2xl ring-4 ring-bg" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Change profile photo"
        title="Change profile photo"
        className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-primary text-white ring-2 ring-bg transition hover:brightness-110 disabled:opacity-70"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
      {err && (
        <p className="absolute left-1/2 top-full mt-1 w-max max-w-[220px] -translate-x-1/2 text-center text-[11px] text-danger">
          {err}
        </p>
      )}
    </div>
  );
}
