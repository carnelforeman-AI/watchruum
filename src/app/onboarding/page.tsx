import { OnboardingFlow } from "@/components/auth/onboarding-flow";
import { WatchruumLogo } from "@/components/layout/logo";

export const metadata = { title: "Set up your profile · Watchruum" };

export default function OnboardingPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/3 top-0 size-[500px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 size-[400px] rounded-full bg-accent/15 blur-[120px]" />
      </div>
      <div className="w-full max-w-lg">
        <div className="mb-6 flex justify-center">
          <WatchruumLogo />
        </div>
        <OnboardingFlow />
      </div>
    </div>
  );
}
