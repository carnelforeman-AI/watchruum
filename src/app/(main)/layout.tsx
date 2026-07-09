import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getUserLibrary, getSampleContent } from "@/lib/queries";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const lib = await getUserLibrary();
  const signedIn = !!lib;

  // Logged-out visitors see sample content built from real TMDb titles.
  const sample = signedIn ? null : await getSampleContent();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        signedIn={signedIn}
        profile={lib?.profile ?? null}
        continueWatching={signedIn ? lib!.continueWatching : sample!.continueWatching}
        watchlist={signedIn ? lib!.watchlist : sample!.watchlist}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar profile={lib?.profile ?? null} />
        <main className="flex-1 pb-24 lg:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
