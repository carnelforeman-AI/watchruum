import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { WatchruumLogo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg">
      {/* Left: branded poster panel (desktop only) */}
      <AuthBrandPanel />

      {/* Right: form */}
      <div className="relative flex w-full flex-col items-center justify-center px-5 py-10 lg:w-1/2">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
          <div className="absolute right-0 top-0 size-[420px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-0 left-0 size-[360px] rounded-full bg-accent/10 blur-[120px]" />
        </div>

        {/* Mobile brand mark (hidden on desktop where the left panel shows it) */}
        <div className="relative mb-8 lg:hidden">
          <WatchruumLogo />
        </div>

        <div className="relative flex w-full justify-center">{children}</div>
      </div>
    </div>
  );
}
