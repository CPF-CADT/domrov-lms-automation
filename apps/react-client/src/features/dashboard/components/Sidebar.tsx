import type { ComponentType } from "react";
import type { IconProps } from "@/features/classDashboard/icons";

// --- Types ---
interface SidebarItem {
  id: string;
  label: string;
  icon: ComponentType<IconProps>;
}

interface SidebarProps {
  items: SidebarItem[];
  activeId: string;
}

/**
 * Sidebar - Vertical navigation sidebar with icon buttons.
 * Displays logo and navigation items with active state.
 */
export default function Sidebar({ items, activeId }: SidebarProps) {
  return (
    <aside className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-6 space-y-6">
      <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-sm">
        <span className="tracking-tight">DR</span>
      </div>
      <nav className="flex flex-col items-center space-y-5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              className={`h-11 w-11 rounded-lg flex items-center justify-center transition-colors ${isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100"
                }`}
              aria-label={item.label}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
