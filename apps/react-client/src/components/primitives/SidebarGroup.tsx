import SidebarItem from "@/components/primitives/SidebarItem";
import type { NavItem } from "@/config/documentation";

interface SidebarGroupProps {
  title: string;
  items: NavItem[];
  activeId?: string;
}

/**
 * SidebarGroup - Groups related sidebar navigation items under a title.
 * Uses the global .sidebar-label class for the title styling.
 */
export default function SidebarGroup({
  title,
  items,
  activeId,
}: SidebarGroupProps) {
  return (
    <div>
      <div className="sidebar-label">{title}</div>
      <ul className="space-y-1">
        {items.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            active={item.id === activeId}
          />
        ))}
      </ul>
    </div>
  );
}
