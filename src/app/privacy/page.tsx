import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const metadata = { title: "Privacy Policy · Watchruum" };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="July 2026">
      <p className="rounded-xl border border-warn/25 bg-warn/[0.06] px-4 py-3 text-[13px] text-warn">
        Template notice: this is a starting draft written to match how Watchruum actually works. Have it
        reviewed by a lawyer for your jurisdiction before launch.
      </p>

      <p>
        This policy explains what personal information Watchruum (“we”) collects, why we collect it, and the
        choices you have. Watchruum is a spoiler-safe social platform for discussing TV and movies — we are not
        a streaming service and we do not host video.
      </p>

      <LegalSection heading="Information we collect">
        <p>
          <strong className="text-foreground">Account information</strong> you provide: email address (used to sign
          in and to contact you), and the username, display name, avatar, bio and favorite genres you choose.
        </p>
        <p>
          <strong className="text-foreground">Activity you create</strong>: the rooms you join, your watch progress,
          ratings, reviews, posts, comments, reactions and direct messages.
        </p>
        <p>
          <strong className="text-foreground">Payment information</strong> (only if you subscribe): billing is
          handled by Stripe. We never see or store your card number — we store only a Stripe customer reference and
          your subscription status.
        </p>
        <p>
          <strong className="text-foreground">Technical data</strong> needed to run the service, such as your
          authentication session. We do not use third-party advertising or analytics trackers.
        </p>
      </LegalSection>

      <LegalSection heading="How we use your information">
        <p>
          To provide the core service — protecting you from spoilers based on your watch progress, powering rooms,
          discussions, ratings and messages, sending notifications you’ve opted into, and processing subscriptions.
          We do not sell your personal information.
        </p>
      </LegalSection>

      <LegalSection heading="Who we share it with">
        <p>
          Service providers that operate the platform on our behalf: Supabase (database and authentication), Stripe
          (payments), The Movie Database (TMDb) for film and show metadata, and — when translation is enabled —
          Google Cloud Translation, which processes the public content you choose to translate (reviews, posts and
          room messages). Content you post publicly is visible to other members according to your spoiler and privacy
          settings.
        </p>
      </LegalSection>

      <LegalSection heading="Your choices and rights">
        <p>
          You can make your profile private, hide your activity, and control notifications in Settings. You can
          download a copy of your data and permanently delete your account (which erases your data and cancels any
          subscription) from Settings → Your data &amp; privacy. Depending on where you live, you may have additional
          rights under laws such as the GDPR or CCPA, including access, correction, and erasure.
        </p>
      </LegalSection>

      <LegalSection heading="Data retention & security">
        <p>
          We keep your information for as long as your account is active. When you delete your account, associated
          data is removed. We use access controls and database-level row security to limit who can see your data.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p>Watchruum is not intended for children under 13 (or the minimum age in your country), and we do not knowingly collect their information.</p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>Questions about this policy or your data? Contact us at privacy@watchruum.com.</p>
      </LegalSection>
    </LegalShell>
  );
}
