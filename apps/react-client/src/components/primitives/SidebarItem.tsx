import { Icon } from "@/components/data-display";
import type { NavItem } from "@/config/documentation";

interface SidebarItemProps {
  item: NavItem;
  active?: boolean;
}

/**
 * SidebarItem - Individual sidebar navigation item with icon.
 * Handles active state styling for current section.
 */
export default function SidebarItem({
  item,
  active = false,
}: SidebarItemProps) {
  const baseClasses =
    "px-3 py-2 text-sm rounded-md flex items-center gap-2 cursor-pointer transition-colors";
  const activeClasses = active
    ? "text-primary bg-blue-50 font-semibold"
    : "text-slate-600 hover:bg-blue-50 hover:text-primary";

  return (
    <li className={`${baseClasses} ${activeClasses}`}>
      <Icon name={item.icon} size="md" />
      <span>{item.label}</span>
    </li>
  );
}
