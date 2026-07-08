import { hashSeed, pickPalette, type Motif } from "@/lib/poster-art";

/**
 * Original, copyright-safe cinematic poster art generated procedurally as SVG.
 * Genre-aware scenery + film grain + vignette + title typography. Deterministic
 * from the title string so a given show always looks the same.
 */
export function CinematicPoster({
  title,
  genres = [],
  showTitle = true,
  className,
}: {
  title: string;
  genres?: string[];
  showTitle?: boolean;
  className?: string;
}) {
  const seed = hashSeed(title);
  const { motif, top, mid, bottom, accent } = pickPalette(genres, seed);
  const gid = `g${seed}`;
  const rand = mulberry(seed);

  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <svg
        viewBox="0 0 300 450"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        role="img"
        aria-label={title}
      >
        <defs>
          <linearGradient id={`${gid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={top} />
            <stop offset="55%" stopColor={mid} />
            <stop offset="100%" stopColor={bottom} />
          </linearGradient>
          <radialGradient id={`${gid}-glow`} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
            <stop offset="60%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${gid}-fade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="55%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.85" />
          </linearGradient>
          <filter id={`${gid}-grain`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.08" />
            </feComponentTransfer>
            <feComposite operator="over" in2="SourceGraphic" />
          </filter>
        </defs>

        {/* Base sky */}
        <rect width="300" height="450" fill={`url(#${gid}-sky)`} />
        <rect width="300" height="450" fill={`url(#${gid}-glow)`} />

        {/* Genre scenery */}
        <Scenery motif={motif} accent={accent} bottom={bottom} rand={rand} />

        {/* Grain + fade + vignette */}
        <rect width="300" height="450" filter={`url(#${gid}-grain)`} opacity="0.6" />
        <rect width="300" height="450" fill={`url(#${gid}-fade)`} />
        <rect width="300" height="450" fill="none" stroke="#000" strokeWidth="26" opacity="0.25" />

        {showTitle && <PosterTitle title={title} />}
      </svg>
    </div>
  );
}

/* --------------------------------------------------------------- scenery */

function Scenery({
  motif,
  accent,
  bottom,
  rand,
}: {
  motif: Motif;
  accent: string;
  bottom: string;
  rand: () => number;
}) {
  switch (motif) {
    case "mountains":
      return (
        <g>
          <circle cx="150" cy="120" r="46" fill={accent} opacity="0.5" />
          <path d="M0 300 L70 200 L120 260 L190 170 L300 290 L300 450 L0 450 Z" fill="#000" opacity="0.35" />
          <path d="M0 340 L90 250 L160 310 L230 240 L300 320 L300 450 L0 450 Z" fill="#000" opacity="0.55" />
          <path d="M0 390 L120 320 L210 370 L300 330 L300 450 L0 450 Z" fill="#000" opacity="0.8" />
        </g>
      );
    case "space":
      return (
        <g>
          {Array.from({ length: 60 }, (_, i) => (
            <circle
              key={i}
              cx={rand() * 300}
              cy={rand() * 320}
              r={rand() * 1.4 + 0.3}
              fill="#fff"
              opacity={rand() * 0.7 + 0.2}
            />
          ))}
          <circle cx="205" cy="150" r="62" fill={bottom} stroke={accent} strokeWidth="1.5" opacity="0.9" />
          <ellipse cx="205" cy="150" rx="92" ry="26" fill="none" stroke={accent} strokeWidth="2" opacity="0.55" transform="rotate(-20 205 150)" />
        </g>
      );
    case "city":
      return (
        <g opacity="0.9">
          <circle cx="150" cy="110" r="40" fill={accent} opacity="0.4" />
          {Array.from({ length: 12 }, (_, i) => {
            const w = 26;
            const h = 120 + rand() * 170;
            const x = i * 25 - 8;
            return <rect key={i} x={x} y={450 - h} width={w} height={h} fill="#000" opacity={0.55 + rand() * 0.35} />;
          })}
        </g>
      );
    case "fantasy":
      return (
        <g>
          <circle cx="150" cy="130" r="70" fill={accent} opacity="0.35" />
          <path d="M120 300 L120 210 L135 235 L150 195 L165 235 L180 210 L180 300 Z" fill="#000" opacity="0.6" />
          <path d="M60 320 L60 250 L80 300 Z M240 320 L240 250 L220 300 Z" fill="#000" opacity="0.5" />
          <rect x="60" y="300" width="180" height="150" fill="#000" opacity="0.7" />
        </g>
      );
    case "spotlight":
      return (
        <g>
          <path d="M150 -20 L60 260 L240 260 Z" fill={accent} opacity="0.28" />
          <path d="M150 -20 L110 260 L190 260 Z" fill="#fff" opacity="0.12" />
          <ellipse cx="150" cy="330" rx="120" ry="24" fill={accent} opacity="0.3" />
        </g>
      );
    default:
      return (
        <g opacity="0.5">
          <path d="M-40 200 L340 60 L340 100 L-40 240 Z" fill={accent} opacity="0.4" />
          <path d="M-40 300 L340 150 L340 185 L-40 335 Z" fill="#fff" opacity="0.08" />
        </g>
      );
  }
}

/* ----------------------------------------------------------------- title */

function PosterTitle({ title }: { title: string }) {
  const words = title.toUpperCase().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 11 && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  const shown = lines.slice(0, 3);
  const startY = 430 - (shown.length - 1) * 30;

  return (
    <g>
      {shown.map((line, i) => (
        <text
          key={i}
          x="20"
          y={startY + i * 30}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize="26"
          fontWeight="800"
          letterSpacing="0.5"
          fill="#fff"
          style={{ paintOrder: "stroke" }}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

/* deterministic PRNG */
function mulberry(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
