"use client";

import { useState } from "react";
import type { ActivityPoint } from "@/lib/admin";

function niceAxis(max: number): { step: number; niceMax: number } {
  const rough = max / 6;
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(1, rough))));
  const cands = [1, 2, 2.5, 5, 10].map((m) => m * pow);
  let step = cands[cands.length - 1];
  for (const c of cands) {
    if (rough <= c) {
      step = c;
      break;
    }
  }
  step = Math.max(1, Math.round(step));
  const niceMax = Math.max(step, Math.ceil(max / step) * step);
  return { step, niceMax };
}

const fmt = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0).replace(/\.0$/, "")}K` : String(v);

/**
 * Interactive 7-day activity area chart. SVG draws the fill/line (scaled), while
 * axis text, points and the tooltip are HTML positioned by percentage so they
 * stay crisp and hover works. Mirrors the Overview design at full size.
 */
export function ActivityChart({ points }: { points: ActivityPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = points.length;
  const rawMax = Math.max(4, ...points.map((p) => p.value));
  const { step, niceMax } = niceAxis(rawMax);

  const ticks: number[] = [];
  for (let v = 0; v <= niceMax; v += step) ticks.push(v);

  const xAt = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 50);
  const yAt = (v: number) => (1 - v / niceMax) * 100;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(2)},${yAt(p.value).toFixed(2)}`).join(" ");
  const area = `${line} L${xAt(n - 1).toFixed(2)},100 L${xAt(0).toFixed(2)},100 Z`;

  return (
    <div className="flex gap-3">
      {/* Y axis */}
      <div className="relative w-9 shrink-0" style={{ height: 300 }}>
        {ticks
          .slice()
          .reverse()
          .map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2 text-[11px] text-muted-2"
              style={{ top: `${yAt(t)}%` }}
            >
              {fmt(t)}
            </span>
          ))}
      </div>

      {/* Plot + X axis */}
      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height: 300 }}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            <defs>
              <linearGradient id="actFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <line
                key={t}
                x1="0"
                x2="100"
                y1={yAt(t)}
                y2={yAt(t)}
                stroke="var(--color-border)"
                strokeWidth="0.4"
                strokeDasharray="1.5 1.5"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={area} fill="url(#actFill)" />
            <path
              d={line}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {hover != null && (
              <line
                x1={xAt(hover)}
                x2={xAt(hover)}
                y1="0"
                y2="100"
                stroke="var(--color-primary)"
                strokeWidth="1"
                strokeOpacity="0.4"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {/* HTML dots (crisp, no distortion) */}
          {points.map((p, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-bg transition-transform"
              style={{
                left: `${xAt(i)}%`,
                top: `${yAt(p.value)}%`,
                width: hover === i ? 12 : 7,
                height: hover === i ? 12 : 7,
              }}
            />
          ))}

          {/* Hover capture columns */}
          <div className="absolute inset-0 flex">
            {points.map((p, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${p.date}: ${p.value} activities`}
                className="h-full flex-1 cursor-default"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                onBlur={() => setHover((h) => (h === i ? null : h))}
              />
            ))}
          </div>

          {/* Tooltip */}
          {hover != null && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] whitespace-nowrap rounded-xl border border-border bg-bg-elevated px-3 py-2 shadow-xl"
              style={{
                left: `${Math.min(88, Math.max(12, xAt(hover)))}%`,
                top: `${yAt(points[hover].value)}%`,
              }}
            >
              <p className="text-[12px] font-medium text-muted-2">{points[hover].date}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[15px] font-bold">
                <span className="size-2 rounded-full bg-primary" />
                {points[hover].value.toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-2">Total Activities</p>
            </div>
          )}
        </div>

        {/* X axis */}
        <div className="mt-2 flex">
          {points.map((p, i) => (
            <span key={i} className="flex-1 text-center text-[11px] text-muted-2">
              {p.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
