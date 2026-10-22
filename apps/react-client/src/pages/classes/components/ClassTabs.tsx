"use client";

import { BookOpen, LayoutDashboard, Users, UsersRound } from "lucide-react";
import { useLocation } from "react-router-dom";

type TabId = "general" | "assignment" | "posts" | "students" | "teams" | "files";

interface ClassTabsProps {
  allowedTabs?: TabId[];
  role?: string;
}

const allTabs: Array<{ id: TabId; label: string; icon: typeof LayoutDashboard }> = [
  { id: "general", label: "General", icon: LayoutDashboard },
  { id: "assignment", label: "Assignments", icon: BookOpen },
  { id: "students", label: "Students", icon: Users },
  { id: "teams", label: "Teams", icon: UsersRound },
];

function getActiveTab(pathname: string): TabId {
  const pathTab = pathname.split("/").filter(Boolean).at(-1);
  return (pathTab === "assignments" ? "assignment" : pathTab ?? "general") as TabId;
}

/** Compact page header for the single-sidebar class layout. */
export default function ClassTabs({ allowedTabs }: ClassTabsProps) {
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);
  const tabs = allTabs.filter((tab) => !allowedTabs || allowedTabs.includes(tab.id));
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0] ?? allTabs[0];
  const Icon = active.icon;

  return (
    <header className="border-b border-slate-200 bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-medium text-slate-500">
            Classes <span className="px-1 text-slate-300">/</span> Class workspace
          </p>
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
              <Icon className="h-4 w-4" />
            </div>
            <h1 className="truncate text-xl font-semibold text-slate-900">{active.label}</h1>
          </div>
        </div>
        <span className="hidden shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 sm:inline-flex">
          Class workspace
        </span>
      </div>
    </header>
  );
}
