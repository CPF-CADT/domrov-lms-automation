"use client";

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  LayoutDashboard,
  Menu,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { routes } from "@/lib/routes";
import { useMyClasses } from "@/hooks/useMyClasses";

type TabId = "general" | "assignment" | "posts" | "students" | "teams" | "files";

interface ClassSidebarProps {
  classId: string;
  allowedTabs?: TabId[];
  role?: string;
}

interface ClassShortcut {
  id: number | string;
  name: string;
  description: string;
  badge: string;
  color: string;
  isActive: boolean;
  memberCount?: number;
  role?: string;
}

const COLORS = [
  "bg-orange-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-red-500",
  "bg-cyan-500",
];

const generateBadge = (className: string): string => {
  const words = className.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "CLS";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 4).map((word) => word[0]).join("").toUpperCase();
};

const tabConfig: Array<{ id: TabId; icon: typeof LayoutDashboard; label: string }> = [
  { id: "general", icon: LayoutDashboard, label: "General" },
  { id: "assignment", icon: BookOpen, label: "Assignments" },
  { id: "students", icon: Users, label: "Students" },
  { id: "teams", icon: UsersRound, label: "Teams" },
];

function getActiveTab(pathname: string): TabId {
  const pathTab = pathname.split("/").filter(Boolean).at(-1);
  return (pathTab === "assignments" ? "assignment" : pathTab ?? "general") as TabId;
}

/**
 * Single class navigation column shared by teacher and student class pages.
 * The old narrow class shortcut rail and the second module sidebar are now
 * represented by one responsive navigation surface.
 */
export default function ClassSidebar({ classId, allowedTabs, role }: ClassSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { classes } = useMyClasses();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isClassMenuOpen, setIsClassMenuOpen] = useState(false);

  const userClasses: ClassShortcut[] = classes.map((currentClass, index) => ({
    ...currentClass,
    id: Number(currentClass.id),
    badge: generateBadge(currentClass.name),
    color: COLORS[index % COLORS.length],
    isActive: Number(currentClass.id) === Number(classId),
    description: currentClass.description || "",
  }));

  const currentClass = userClasses.find((item) => item.isActive) ?? userClasses[0];
  const activeTab = getActiveTab(location.pathname);
  const visibleTabs = tabConfig.filter((tab) => !allowedTabs || allowedTabs.includes(tab.id));
  const roleLabel = role === "Teacher" || role === "TeacherAssistant" ? "Teacher view" : "Student view";

  useEffect(() => {
    setIsMobileOpen(false);
    setIsClassMenuOpen(false);
  }, [location.pathname]);

  const navigateToTab = (tab: TabId) => {
    const destination = tab === "general"
      ? routes.classGeneral(classId)
      : tab === "assignment"
        ? routes.classAssignments(classId)
        : tab === "students"
          ? routes.classStudents(classId)
          : tab === "teams"
            ? routes.classTeams(classId)
            : routes.classGeneral(classId);

    navigate(destination);
  };

  const handleSwitchClass = (newClassId: string | number) => {
    navigate(routes.classGeneral(newClassId));
  };

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>All classes</span>
        </button>
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          aria-label="Close class navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="border-b border-slate-200 p-5">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsClassMenuOpen((open) => !open)}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
            aria-expanded={isClassMenuOpen}
          >
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${currentClass?.color ?? "bg-blue-500"}`}>
              <span className="px-1 text-center text-xs font-bold leading-tight text-white">
                {currentClass?.badge ?? "CLS"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {currentClass?.name ?? "Current class"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {currentClass?.memberCount ?? 0} members · {roleLabel}
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isClassMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {isClassMenuOpen && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              {userClasses.map((classItem) => (
                <button
                  key={classItem.id}
                  type="button"
                  onClick={() => handleSwitchClass(classItem.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${classItem.isActive ? "bg-blue-50" : "hover:bg-slate-50"}`}
                >
                  <div className={`grid h-8 w-8 place-items-center rounded-lg ${classItem.color}`}>
                    <span className="text-[10px] font-bold text-white">{classItem.badge}</span>
                  </div>
                  <span className="truncate text-sm font-medium text-slate-700">{classItem.name}</span>
                </button>
              ))}
              {userClasses.length === 0 && (
                <p className="px-3 py-2 text-sm text-slate-500">No classes available.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Class navigation">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Class workspace
        </p>
        <div className="space-y-1">
          {visibleTabs.map(({ id, icon: Icon, label }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => navigateToTab(id)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${isActive
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
              >
                {isActive && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-blue-600" />}
                <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className="fixed left-4 top-4 z-30 rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm lg:hidden"
        aria-label="Open class navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close class navigation overlay"
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(84vw,280px)] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-[260px] lg:shrink-0 lg:shadow-none ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {sidebarContent}
      </aside>
    </>
  );
}
