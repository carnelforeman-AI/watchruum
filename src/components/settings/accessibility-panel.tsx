"use client";

import { useEffect, useState } from "react";
import { Accessibility, Type, Zap, Contrast, ScanLine } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { A11Y_DEFAULTS, applyA11y, readA11y, writeA11y, type A11yPrefs, type TextSize } from "@/lib/a11y";

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors",
        on ? "bg-primary" : "bg-white/15",
      )}
    >
      <span className={cn("inline-block size-5 rounded-full bg-white shadow-sm transition-transform", on ? "translate-x-5" : "translate-x-0")} />
    </button>
  );
}

const TEXT_SIZES: { value: TextSize; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "Extra Large" },
];

export function AccessibilityPanel() {
  // Start from defaults so server + first client render match, then hydrate from
  // localStorage after mount (client-only value).
  const [prefs, setPrefs] = useState<A11yPrefs>(A11Y_DEFAULTS);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(readA11y());
  }, []);

  function update(next: A11yPrefs) {
    setPrefs(next);
    writeA11y(next);
    applyA11y(next);
  }

  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center gap-2">
        <Accessibility className="size-4 text-primary" />
        <h2 className="font-semibold">Accessibility</h2>
      </div>
      <p className="mb-4 text-[12px] text-muted-2">
        Customize Watchruum to make reading, navigating, and participating easier. Your choices apply on this device.
      </p>

      <div className="space-y-4">
        {/* Text size */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Type className="size-4 text-muted" />
            <p className="text-sm font-semibold">Text size</p>
          </div>
          <div className="inline-flex rounded-xl border border-border bg-white/[0.03] p-1">
            {TEXT_SIZES.map((s) => (
              <button
                key={s.value}
                onClick={() => update({ ...prefs, textSize: s.value })}
                aria-pressed={prefs.textSize === s.value}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                  prefs.textSize === s.value ? "bg-primary text-white" : "text-muted-2 hover:text-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[12px] text-muted-2">Scales the whole interface up for easier reading.</p>
        </div>

        {/* Reduce motion */}
        <Row
          icon={<Zap className="size-4 text-muted" />}
          title="Reduce motion"
          desc="Minimize animations and transitions across the app."
          on={prefs.reduceMotion}
          onToggle={() => update({ ...prefs, reduceMotion: !prefs.reduceMotion })}
        />

        {/* High contrast */}
        <Row
          icon={<Contrast className="size-4 text-muted" />}
          title="High contrast"
          desc="Boost the contrast of text and borders for better legibility."
          on={prefs.highContrast}
          onToggle={() => update({ ...prefs, highContrast: !prefs.highContrast })}
        />

        {/* Focus outlines */}
        <Row
          icon={<ScanLine className="size-4 text-muted" />}
          title="Always show focus outlines"
          desc="Show a clear outline on the focused element, not just when using a keyboard."
          on={prefs.focusRings}
          onToggle={() => update({ ...prefs, focusRings: !prefs.focusRings })}
        />
      </div>

      <p className="mt-4 border-t border-border-soft pt-3 text-[12px] text-muted-2">
        Watchruum also honors your device&apos;s system &ldquo;reduce motion&rdquo; setting automatically.
      </p>
    </Card>
  );
}

function Row({
  icon,
  title,
  desc,
  on,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border-soft pt-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-semibold">
          {icon} {title}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-2">{desc}</p>
      </div>
      <Toggle on={on} onClick={onToggle} label={title} />
    </div>
  );
}
