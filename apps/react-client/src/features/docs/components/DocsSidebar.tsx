import { SidebarGroup } from "@/components/primitives";
import { USER_TYPES, PLATFORM_FEATURES } from "@/config";

/**
 * DocsSidebar - Navigation sidebar for documentation page.
 * Groups navigation items by user types and platform features.
 */
export default function DocsSidebar() {
  return (
    <aside className="hidden lg:block col-span-3 border-r border-slate-200 h-[calc(100vh-6rem)] sticky top-24 bg-[#FAFCFF] overflow-y-auto p-4 rounded-lg shadow-sm">
      <nav className="space-y-6">
        <SidebarGroup
          title="User Types"
          items={USER_TYPES}
          activeId="students"
        />
        <SidebarGroup title="Platform Features" items={PLATFORM_FEATURES} />
      </nav>
    </aside>
  );
}
