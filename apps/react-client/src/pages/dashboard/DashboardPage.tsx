import MainNavigation from "@/components/navigation/MainNavigation";
import DashboardClient from "@/pages/dashboard/components/DashboardClient";

/**
 * Dashboard - Main dashboard page component.
 * Uses portal layout with sidebar navigation.
 */
export default function Dashboard() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <MainNavigation activeId="home" />
      <div className="flex flex-col flex-1 min-w-0">
        <DashboardClient />
      </div>
    </div>
  );
}
