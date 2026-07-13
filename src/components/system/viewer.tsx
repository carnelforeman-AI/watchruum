"use client";

import { createContext, useContext } from "react";

/**
 * Viewer role flags, provided once at the app shell and readable anywhere via
 * useViewer(). Powers <BetaGate>, which lets you ship an in-progress feature to
 * production while keeping it hidden from regular users.
 */
export interface ViewerFlags {
  isAdmin: boolean;
  isModerator: boolean;
  isTester: boolean;
}

const ViewerContext = createContext<ViewerFlags>({ isAdmin: false, isModerator: false, isTester: false });

export function ViewerProvider({ flags, children }: { flags: ViewerFlags; children: React.ReactNode }) {
  return <ViewerContext.Provider value={flags}>{children}</ViewerContext.Provider>;
}

export function useViewer(): ViewerFlags {
  return useContext(ViewerContext);
}

/**
 * Renders its children only for beta testers (admins always see beta features
 * too, since they run the program). Wrap any not-yet-public feature in this:
 *
 *   <BetaGate>
 *     <MyNewFeature />
 *   </BetaGate>
 *
 * The code deploys to everyone, but regular users never see it — an in-app
 * canary/sandbox. Pass `fallback` to show something else to non-testers.
 *
 * Note: this hides UI, not data. For anything sensitive, also gate on the
 * server (see getViewerFlags in @/lib/roles) or with RLS.
 */
export function BetaGate({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isTester, isAdmin } = useViewer();
  return <>{isTester || isAdmin ? children : fallback}</>;
}
