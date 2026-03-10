"use client";

import {
  ChevronLeftIcon,
  MoreVerticalIcon,
  GraduationCapIcon,
  TvIcon
} from "./icons";


type TabId = "general" | "assignment" | "posts" | "students" | "files" | "grades";

interface ClassSidebarProps {
  classId: string;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  allowedTabs?: TabId[];
  role?: string;
}

/**
 * ClassSidebar - Left sidebar navigation for class dashboard.
 * Shows class info and navigation items.
 */

export default function ClassSidebar({ classId: _classId, activeTab, onTabChange, allowedTabs, role }: ClassSidebarProps) {
  // All possible nav items
  const allNavItems = [
    { id: "general" as TabId, icon: TvIcon, label: "General" },
    { id: "assignment" as TabId, icon: GraduationCapIcon, label: "Assignment" },
    { id: "posts" as TabId, icon: TvIcon, label: "Posts" },
    { id: "students" as TabId, icon: GraduationCapIcon, label: "Students" },
    { id: "files" as TabId, icon: TvIcon, label: "Files" },
    { id: "grades" as TabId, icon: TvIcon, label: "Grades" },
  ];
  // Only show allowed tabs
  const navItems = allowedTabs
    ? allNavItems.filter(item => allowedTabs.includes(item.id))
    : allNavItems;

  // Mock data for other classes user has joined
  const userClasses = [
    { id: "gen10", name: "GEN-10-Advanced Mobile Development", badge: "GEN 10", color: "bg-orange-500", members: 128, isActive: true },
    { id: "flutter", name: "Database Class, Diagram", badge: "DB", color: "bg-blue-500", members: 85 },
    { id: "web", name: "Web Development Fundamentals", badge: "WD", color: "bg-green-500", members: 102 },
    { id: "react", name: "React Native Advanced", badge: "RN", color: "bg-purple-500", members: 67 },
  ];

  return (
    <div className="flex h-screen">
      {/* Left Sidebar: Class List */}
      <aside className="w-24 bg-[#0c1929] text-white flex flex-col border-r border-white/5">
        {/* Navigator Button */}
        <div className="border-b border-white/5">
          <button
            onClick={() => { }}
            className="w-full p-6 hover:bg-white/3 transition-colors duration-150 group"
            title="Back to Dashboard"
          >
            <ChevronLeftIcon className="w-5 h-5 mx-auto text-white/60 group-hover:text-white/90 transition-colors duration-150" />
          </button>
        </div>

        {/* Class List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent py-3">
          {userClasses.map((classItem) => (
            <button
              key={classItem.id}
              onClick={() => { }}
              className={`w-full p-4 transition-colors duration-150 relative ${classItem.isActive ? "" : "hover:bg-white/3"
                }`}
              title={classItem.name}
            >
              <div className={`w-14 h-14 ${classItem.color} rounded-xl mx-auto shadow-sm grid place-items-center ${classItem.isActive
                  ? "ring-2 ring-white/80 ring-offset-2 ring-offset-[#0c1929]"
                  : "opacity-70 hover:opacity-100 transition-opacity duration-150"
                }`}>
                <span className="text-white font-bold text-[1rem] leading-tight text-center w-full">{classItem.badge}</span>
              </div>
              {classItem.isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-white rounded-r"></div>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Right Sidebar: Module Navigation */}
      <aside className="w-72 bg-[#0a1e3d] text-white flex flex-col border-r border-white/5">
        {/* Class Header */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">GEN 10</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white truncate leading-tight">GEN-10-Advanced Mobile Development</h3>
              <p className="text-xs text-white/40 mt-1">{userClasses[0].members} members</p>
            </div>
            <button className="text-white/30 hover:text-white/60 transition-colors duration-150 p-2 hover:bg-white/3 rounded-lg">
              <MoreVerticalIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Module Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-5 py-3 transition-colors duration-150 relative ${isActive
                    ? "bg-white/8 text-white"
                    : "text-white/50 hover:bg-white/3 hover:text-white/80"
                  }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r"></div>
                )}
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-white/50"}`} />
                <span className={`text-sm ${isActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
