import {
  Home,
  TrendingUp,
  Users,
  LayoutGrid,
  CalendarDays,
  Bookmark,
  Activity,
  UserPlus,
  User,
  Settings,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

/** Primary navigation, shared by the desktop sidebar and the mobile drawer. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/trending", label: "Trending", icon: TrendingUp },
  { href: "/rooms", label: "Watch Rooms", icon: Users },
  { href: "/genres", label: "Genres", icon: LayoutGrid },
  { href: "/calendar", label: "Watch Calendar", icon: CalendarDays },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/friends", label: "Find Friends", icon: UserPlus },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];
