"use client";

import { useRouter } from "next/navigation";
import { HomeIcon, BookIcon, ReportIcon, BellIcon, ShopIcon, TokenIcon } from "@/ui/features/dashboard/components/icons";


/**
 * MainNavigation - Vertical sidebar navigation for main app sections.
 * Reusable across layouts. Accepts items and activeId props.
 */
// Navigation items are now defined here to avoid passing icon functions from server to client
const navItems = [
  { id: "home", label: "HomeScreen", icon: HomeIcon, href: "/" },
  { id: "ai", label: "AI Evaluation", icon: TokenIcon, href: "/ai-evaluation" },
  { id: "bookmark", label: "Bookmark", icon: BookIcon, href: "/bookmarks" },
  { id: "star", label: "Star", icon: ReportIcon, href: "/starred" },
  { id: "bell", label: "Notifications", icon: BellIcon, href: "/notifications" },
  { id: "shop", label: "Shop", icon: ShopIcon, href: "/shop" },
];

interface MainNavigationProps {
  activeId: string;
}

const MainNavigation: React.FC<MainNavigationProps> = ({ activeId }) => {
  const router = useRouter();
  return (
    <aside className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-6 space-y-6 min-h-screen">
      <div className="h-10 w-10 rounded-xl bg-[#0B1531] flex items-center justify-center text-white font-black text-sm mb-2">
        <span className="tracking-tight">DR</span>
      </div>
      <nav className="flex flex-col items-center space-y-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              className={`h-11 w-11 rounded-lg flex items-center justify-center transition-colors ${
                isActive
                  ? "bg-[#0B1531] text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
              aria-label={item.label}
              onClick={() => router.push(item.href)}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default MainNavigation;