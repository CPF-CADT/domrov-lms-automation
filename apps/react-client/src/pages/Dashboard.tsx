import MainNavigation from "@/components/navigation/Navigation";
import { DashboardClient } from "@/features/dashboard";

/**
 * Dashboard - Main dashboard page component.
 * Uses portal layout with sidebar navigation.
 */
export default function Dashboard() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <MainNavigation activeId="home" />
      <div className="flex flex-col flex-1 min-w-0">
        <DashboardClient />
      </div>
    </div>
  );
}