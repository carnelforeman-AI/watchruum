import * as React from "react";
import { initials as toInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

const SIZES = { sm: "h-8 w-8 text-[11px]", md: "h-10 w-10 text-xs", lg: "h-12 w-12 text-sm" };

/** Deterministic gradient avatar with initials fallback (no external images required). */
export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  let hue = 0;
  for (let i = 0; i < name.length; i++) hue = (hue * 31 + name.charCodeAt(i)) % 360;
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ring-1 ring-white/10",
        SIZES[size],
        className,
      )}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 60% 45%), hsl(${(hue + 40) % 360} 65% 32%))` }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{toInitials(name)}</span>
      )}
    </div>
  );
}

/** Overlapping row of avatars (discussion participants). */
export function AvatarStack({
  names,
  max = 5,
  size = "sm",
}: {
  names: string[];
  max?: number;
  size?: keyof typeof SIZES;
}) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((n, i) => (
          <div key={n + i} className="rounded-full ring-2 ring-panel">
            <Avatar name={n} size={size} />
          </div>
        ))}
      </div>
      {extra > 0 && (
        <span className="ml-1.5 text-[11px] font-semibold text-muted-2">+{extra}</span>
      )}
    </div>
  );
}
