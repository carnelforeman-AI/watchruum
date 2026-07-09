/** Lightweight, dependency-free SVG charts for the admin Overview. */

export function AreaChart({ data }: { data: { label: string; value: number }[] }) {
  const w = 640;
  const h = 200;
  const pad = { top: 16, right: 12, bottom: 26, left: 12 };
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top - pad.bottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? iw / (data.length - 1) : iw;

  const pts = data.map((d, i) => ({
    x: pad.left + i * stepX,
    y: pad.top + ih - (d.value / max) * ih,
  }));

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${(pad.top + ih).toFixed(1)} L${pts[0].x.toFixed(1)},${(pad.top + ih).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-52 w-full" preserveAspectRatio="none" role="img" aria-label="Weekly activity">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={pad.left}
          x2={w - pad.right}
          y1={pad.top + ih * g}
          y2={pad.top + ih * g}
          stroke="var(--color-border)"
          strokeWidth="1"
        />
      ))}
      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--color-primary)" />
      ))}
      {data.map((d, i) => (
        <text key={d.label} x={pts[i].x} y={h - 6} textAnchor="middle" className="fill-[var(--color-muted-2)] text-[11px]">
          {d.label}
        </text>
      ))}
    </svg>
  );
}

export function Donut({
  slices,
  total,
}: {
  slices: { label: string; value: number; color: string }[];
  total: number;
}) {
  const size = 168;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const sum = Math.max(1, slices.reduce((a, s) => a + s.value, 0));

  let offset = 0;
  const arcs = slices.map((s) => {
    const frac = s.value / sum;
    const dash = frac * c;
    const arc = { color: s.color, dash, gap: c - dash, off: offset };
    offset -= dash;
    return arc;
  });

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
          {arcs.map((a, i) => (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={stroke}
              strokeDasharray={`${a.dash} ${a.gap}`}
              strokeDashoffset={a.off}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-2xl font-extrabold leading-none">{total.toLocaleString()}</p>
            <p className="mt-0.5 text-[11px] text-muted-2">Total</p>
          </div>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2.5">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-2 text-[13px]">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: s.color }} />
              <span className="text-muted">{s.label}</span>
            </span>
            <span className="font-semibold">{s.value.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
