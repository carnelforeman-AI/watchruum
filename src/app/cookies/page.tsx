import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const metadata = { title: "Cookie Policy · Watchruum" };

export default function CookiesPage() {
  return (
    <LegalShell title="Cookie Policy" updated="July 2026">
      <p className="rounded-xl border border-warn/25 bg-warn/[0.06] px-4 py-3 text-[13px] text-warn">
        Template notice: this is a starting draft. Have it reviewed by a lawyer for your jurisdiction before launch.
      </p>

      <p>
        Watchruum uses a small number of cookies (and similar local storage) that are strictly necessary to run the
        service. We do not use advertising or third-party tracking cookies.
      </p>

      <LegalSection heading="Essential cookies">
        <p>
          These keep you signed in and secure your session. Without them, you couldn’t log in or stay logged in.
          They’re set by our authentication provider (Supabase) and by Watchruum itself.
        </p>
      </LegalSection>

      <LegalSection heading="Preferences stored on your device">
        <p>
          We store small preferences locally in your browser — for example, whether you’ve dismissed the cookie
          notice, and accessibility choices like reduced motion or text size. This information stays on your device.
        </p>
      </LegalSection>

      <LegalSection heading="Payments">
        <p>
          If you subscribe, Stripe may set cookies needed to process your payment securely on its checkout pages.
          See Stripe’s privacy documentation for details.
        </p>
      </LegalSection>

      <LegalSection heading="Managing cookies">
        <p>
          Because we only use essential cookies and on-device preferences, there’s nothing to opt out of for
          tracking. You can clear cookies and local storage in your browser settings at any time, though doing so
          will sign you out.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>Questions? Contact us at privacy@watchruum.com.</p>
      </LegalSection>
    </LegalShell>
  );
}
