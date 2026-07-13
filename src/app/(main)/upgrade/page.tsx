import { notFound } from "next/navigation";
import { Eye, Rocket } from "lucide-react";
import { Pricing } from "@/components/upgrade/pricing";
import { getLiveMode } from "@/lib/settings";
import { getViewerFlags } from "@/lib/roles";
import { getUserLibrary } from "@/lib/queries";

export const metadata = { title: "Upgrade · Watchruum" };
export const dynamic = "force-dynamic";

/**
 * Memberships / pricing page.
 *
 * Gated on the global "Go Live" switch (app_settings.live_mode). Until an admin
 * flips Go Live, the page is dark for everyone EXCEPT admins and beta testers,
 * who get a live preview (with a banner) so they can QA it before launch. Once
 * Go Live is on, the page is public — signed-in and signed-out visitors alike.
 */
export default async function UpgradePage() {
  const [live, flags, lib] = await Promise.all([getLiveMode(), getViewerFlags(), getUserLibrary()]);

  const preview = !live && (flags.isAdmin || flags.isTester);
  if (!live && !preview) notFound();

  const signedIn = !!lib;

  return (
    <div>
      {preview && (
        <div className="border-b border-warn/20 bg-warn/[0.07]">
          <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-medium text-warn md:px-6">
            <Eye className="size-4 shrink-0" />
            <span>
              <strong className="font-bold">Preview only.</strong> Memberships are hidden from members
              until you flip <span className="inline-flex items-center gap-1"><Rocket className="size-3.5" /> Go Live</span> in
              Admin. Regular users can’t see this page yet.
            </span>
          </div>
        </div>
      )}
      <Pricing signedIn={signedIn} />
    </div>
  );
}
