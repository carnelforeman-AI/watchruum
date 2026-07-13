import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const metadata = { title: "Terms of Service · Watchruum" };

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="July 2026">
      <p className="rounded-xl border border-warn/25 bg-warn/[0.06] px-4 py-3 text-[13px] text-warn">
        Template notice: this is a starting draft. Have it reviewed by a lawyer for your jurisdiction before launch.
      </p>

      <p>
        These terms govern your use of Watchruum. By creating an account or using the service, you agree to them.
      </p>

      <LegalSection heading="Your account">
        <p>
          You must provide accurate information and are responsible for activity on your account. You must be at
          least 13 years old (or the minimum age in your country) to use Watchruum.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>
          Watchruum is a community. Don’t post spoilers outside the correct episode context, harass or abuse other
          members, post illegal content, upload copyrighted video, or attempt to disrupt the service. We may remove
          content or suspend accounts that violate these terms.
        </p>
      </LegalSection>

      <LegalSection heading="Your content">
        <p>
          You keep ownership of the reviews, posts and other content you create. You grant us a license to host and
          display it within the service so it can appear in rooms and on your profile according to your settings.
        </p>
      </LegalSection>

      <LegalSection heading="Memberships & billing">
        <p>
          Watchruum offers a free plan and paid plans (Plus and Founder). Paid plans are billed through Stripe on a
          monthly or annual basis as you select. You can cancel anytime; cancellation stops future charges and takes
          effect at the end of the current billing period. Founder is a one-time annual plan for launch supporters.
          We may change pricing with notice for future billing periods.
        </p>
      </LegalSection>

      <LegalSection heading="Not a streaming service">
        <p>
          Watchruum is for discussing content you watch elsewhere. We do not provide video playback and are not
          affiliated with the studios, networks or streaming services whose titles are discussed.
        </p>
      </LegalSection>

      <LegalSection heading="Disclaimers & liability">
        <p>
          The service is provided “as is.” To the extent permitted by law, we disclaim warranties and are not liable
          for indirect or incidental damages arising from your use of the service.
        </p>
      </LegalSection>

      <LegalSection heading="Changes & termination">
        <p>
          We may update these terms; we’ll note the date above. You may stop using Watchruum at any time and delete
          your account from Settings.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>Questions about these terms? Contact us at support@watchruum.com.</p>
      </LegalSection>
    </LegalShell>
  );
}
