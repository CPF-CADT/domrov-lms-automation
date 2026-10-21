"use client";

import { useNavigate } from "react-router-dom";
import { Home, Sparkles, CreditCard } from "lucide-react";


/**
 * MainNavigation - Vertical sidebar navigation for main app sections.
 * Reusable across layouts. Accepts items and activeId props.
 */
// Navigation items are now defined here to avoid passing icon functions from server to client
const navItems = [
  { id: "home", label: "Home", icon: Home, href: "/dashboard" },
  { id: "ai-evaluation", label: "AI Evaluation", icon: Sparkles, href: "/ai-evaluation" },
  { id: "credit", label: "Credit", icon: CreditCard, href: "/creditPurchase" },
];

interface MainNavigationProps {
  activeId?: string;
}

const MainNavigation: React.FC<MainNavigationProps> = ({ activeId }) => {
  const navigate = useNavigate();
  const pathname = window.location.pathname;
  // Map pathname to nav id
  const pathToId = (path: string) => {
    if (path === "/" || path === "/dashboard") return "home";
    if (path === "/profile") return "profile";
    if (path === "/bookmarks") return "bookmark";
    if (path === "/starred") return "star";
    if (path === "/notifications") return "bell";
    if (path === "/pricing") return "lock";
    if (path.startsWith("/ai-evaluation")) return "ai-evaluation";
    if (path.startsWith("/creditPurchase")) return "credit";
    return "";
  };
  const currentId = activeId || pathToId(pathname);
  return (
    <aside className="flex flex-col items-center w-16 min-h-screen py-6 space-y-6 bg-white border-r border-slate-200">
      <div className="h-10 w-10 rounded-xl bg-[#0B1531] flex items-center justify-center text-white font-black text-sm mb-8">
        <span className="tracking-tight">DR</span>
      </div>
      <nav className="flex flex-col items-center space-y-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === currentId;
          return (
            <button
              key={item.id}
              className={`h-11 w-11 rounded-lg flex items-center justify-center transition-colors ${isActive
                  ? "bg-[#0B1531] text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100"
                }`}
              aria-label={item.label}
              onClick={() => navigate(item.href)}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default MainNavigation;