import { WatchruumLogo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-0 size-[500px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 size-[420px] rounded-full bg-accent/15 blur-[120px]" />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <WatchruumLogo />
        </div>
        {children}
      </div>
    </div>
  );
}
