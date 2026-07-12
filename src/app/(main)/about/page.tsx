import Link from "next/link";
import type { Metadata } from "next";
import { ShieldCheck, MessagesSquare, Star, CalendarClock, Users, Lock } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Watchruum — the spoiler-safe social platform for TV & movie fans",
  description:
    "Watchruum is a spoiler-safe social platform where fans discuss, rate, and react to the shows and movies they watch — with discussions organized by watch progress so you never get spoiled.",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    title: `About ${SITE_NAME}`,
    description:
      "The spoiler-safe home for TV and movie fans. Join rooms for shows, movies, seasons, and episodes — and only see discussion up to where you've watched.",
    url: "/about",
  },
};

const FAQ = [
  {
    q: "What is Watchruum?",
    a: "Watchruum is a spoiler-safe social platform for TV and movie fans. You join rooms for shows, movies, seasons, and specific episodes to rate, review, react, and discuss what you're watching — without stumbling onto spoilers for parts you haven't reached yet.",
  },
  {
    q: "How does spoiler protection work?",
    a: "You set the episode you're currently on. Watchruum then shows you posts, reviews, and reactions from that episode and earlier, and hides anything from future episodes behind a locked spoiler card. You control when future discussions unlock by updating your progress.",
  },
  {
    q: "Is Watchruum a streaming service?",
    a: "No. Watchruum has no video playback and hosts no copyrighted content. It's a place to discuss, rate, review, and track the shows and movies you watch elsewhere — a social layer, not a player.",
  },
  {
    q: "Is Watchruum free to use?",
    a: "Yes — you can browse trending titles, join rooms, track your progress, and take part in spoiler-safe discussions for free.",
  },
];

const FEATURES = [
  { Icon: ShieldCheck, title: "Spoiler-safe by default", body: "Discussions are separated by watch progress. Someone on Episode 3 never sees what happens in Episode 7." },
  { Icon: MessagesSquare, title: "Rooms for every show", body: "Join dedicated rooms for shows, movies, seasons, and individual episodes — and chat with fans at your exact point in the story." },
  { Icon: Star, title: "Rate & review", body: "Score whole shows, movies, seasons, or single episodes on a 1–10 scale, with clear spoiler-free and spoiler-tagged reviews." },
  { Icon: CalendarClock, title: "Track & get notified", body: "Keep a watchlist, follow a release calendar, and get notified about new episodes and premieres you care about." },
  { Icon: Users, title: "Social, not solitary", body: "Follow friends, see what they're watching, host watch parties, and react together — safely." },
  { Icon: Lock, title: "You're in control", body: "Set your spoiler-safety level, choose your notifications, and decide when future discussions unlock." },
];

export default function AboutPage() {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "About", item: absoluteUrl("/about") },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <JsonLd data={orgJsonLd} />
      <JsonLd data={faqJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <header className="mb-10 text-center">
        <p className="mb-2 text-[12px] font-bold uppercase tracking-widest text-primary">About</p>
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Never get spoiled again.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
          {SITE_NAME} is the spoiler-safe social home for TV and movie fans. Join rooms for the shows and movies you love,
          talk about the episode you&apos;re <em>actually</em> on, and let us hide everything beyond your progress.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/explore" className="rounded-xl bg-gradient-to-r from-primary to-primary-strong px-5 py-2.5 text-sm font-bold text-white hover:brightness-110">
            Explore Watchruum
          </Link>
          <Link href="/trending" className="rounded-xl border border-border bg-white/[0.03] px-5 py-2.5 text-sm font-semibold hover:bg-white/[0.07]">
            See what&apos;s trending
          </Link>
        </div>
      </header>

      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">What makes Watchruum different</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map(({ Icon, title, body }) => (
            <div key={title} className="glass rounded-2xl p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="size-4" />
                </span>
                <h3 className="text-sm font-bold">{title}</h3>
              </div>
              <p className="text-[13px] leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">How spoiler protection works</h2>
        <div className="glass rounded-2xl p-6 text-[14px] leading-relaxed text-muted">
          <p>
            Every post, review, and reaction on {SITE_NAME} is tagged to a point in a show or movie. When you tell us the
            episode you&apos;re on, we show you everything up to and including that point — and hide anything further ahead
            behind a locked spoiler card that reads something like &ldquo;Hidden spoiler. Unlock after finishing Episode
            6.&rdquo;
          </p>
          <p className="mt-3">
            You&apos;re always in control: pick a strict, balanced, or off spoiler-safety level, reveal a specific post if
            you choose, and unlock future discussions the moment you catch up. The default always protects you first.
          </p>
        </div>
      </section>

      <section className="mb-4">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Frequently asked questions</h2>
        <div className="space-y-3">
          {FAQ.map((f) => (
            <div key={f.q} className="glass rounded-2xl p-5">
              <h3 className="text-[15px] font-bold">{f.q}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
