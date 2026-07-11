import { notFound } from "next/navigation";
import { Cake, MapPin } from "lucide-react";
import { getPerson, getPersonCredits } from "@/lib/tmdb";
import { getPersonComments } from "@/lib/queries";
import { getCurrentProfile } from "@/lib/supabase/server";
import { AlsoIn } from "@/components/person/also-in";
import { PersonComments } from "@/components/person/person-comments";
import { posterGradient, initials } from "@/lib/utils";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const person = await getPerson(id);
  if (!person) return { title: "Cast" };
  const description = person.biography
    ? person.biography.slice(0, 200)
    : `See ${person.name}'s movies and shows and join the spoiler-safe fan conversation on Watchruum.`;
  const image = person.profile_url || undefined;
  return {
    title: person.name,
    description,
    alternates: { canonical: `/person/${id}` },
    openGraph: {
      type: "profile",
      title: `${person.name} · ${SITE_NAME}`,
      description,
      url: `/person/${id}`,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: "summary",
      title: `${person.name} · ${SITE_NAME}`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

function born(birthday: string | null): string | null {
  if (!birthday) return null;
  const d = new Date(birthday);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await getPerson(id);
  if (!person) notFound();

  const [credits, comments, profile] = await Promise.all([
    getPersonCredits(id, 60),
    getPersonComments(person.id),
    getCurrentProfile(),
  ]);
  const viewerLang = (profile as { preferred_language?: string | null } | null)?.preferred_language ?? null;

  const birthday = born(person.birthday);

  const personJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    url: absoluteUrl(`/person/${person.id}`),
    ...(person.profile_url ? { image: person.profile_url } : {}),
    ...(person.biography ? { description: person.biography } : {}),
    ...(person.known_for ? { jobTitle: person.known_for } : {}),
    ...(person.birthday ? { birthDate: person.birthday } : {}),
    ...(person.place_of_birth ? { birthPlace: person.place_of_birth } : {}),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <JsonLd data={personJsonLd} />
      {/* Header */}
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <div className="mx-auto w-48 md:mx-0">
          <div className="relative aspect-[2/3] w-48 overflow-hidden rounded-2xl ring-1 ring-border">
            {person.profile_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={person.profile_url} alt={person.name} className="h-full w-full object-cover" />
            ) : (
              <div
                className="grid h-full w-full place-items-center text-4xl font-extrabold text-white/85"
                style={{ background: posterGradient(person.name) }}
              >
                {initials(person.name)}
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{person.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-[13px] text-muted">
            {person.known_for && (
              <span className="rounded-full bg-primary/15 px-3 py-1 text-[12px] font-semibold text-primary">
                {person.known_for}
              </span>
            )}
            {birthday && (
              <span className="flex items-center gap-1.5">
                <Cake className="size-4" /> {birthday}
              </span>
            )}
            {person.place_of_birth && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" /> {person.place_of_birth}
              </span>
            )}
          </div>
          {person.biography ? (
            <p className="mt-4 max-w-3xl whitespace-pre-line text-[14.5px] leading-relaxed text-foreground/85 line-clamp-6">
              {person.biography}
            </p>
          ) : (
            <p className="mt-4 text-[14px] text-muted-2">No biography available yet.</p>
          )}
        </div>
      </div>

      {/* Other movies & shows */}
      <AlsoIn items={credits} />

      {/* Fan comments */}
      <PersonComments
        personTmdbId={person.id}
        personName={person.name}
        initial={comments}
        viewerLang={viewerLang}
      />
    </div>
  );
}
