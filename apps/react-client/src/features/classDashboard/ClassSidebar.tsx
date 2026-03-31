"use client";

import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  ChevronLeftIcon,
  MoreVerticalIcon,
  GraduationCapIcon,
  TvIcon
} from "./icons";
import { AiOutlineTeam } from "react-icons/ai";
import classService from "@/services/classService";



type TabId = "general" | "assignment" | "posts" | "students" | "teams" | "files" | "grades";

interface ClassSidebarProps {
  classId: string;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
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
  assessmentCount?: number;
  coverImageUrl?: string;
  status?: string;
  owner?: any;
  role?: string;
  joinCode?: string;
  createdAt?: Date | string;
}

const COLORS = ["bg-orange-500", "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-red-500", "bg-cyan-500"];

/**
 * Generate smart badge from class name
 * Examples: "Web Developer" → "WD", "Function" → "F", "AI Fundamentals" → "AI"
 */
const generateBadge = (className: string): string => {
  const words = className.trim().split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 0) return "CLS";
  if (words.length === 1) {
    // Single word: take first letter + next consonant or just first char
    const word = words[0];
    if (word.length === 1) return word.toUpperCase();
    return word.substring(0, 2).toUpperCase();
  }
  
  // Multiple words: take first letter of each word (max 4 chars)
  const abbreviation = words.slice(0, 4).map(w => w[0]).join("").toUpperCase();
  return abbreviation.substring(0, 4);
};

/**
 * ClassSidebar - Left sidebar navigation for class dashboard.
 * Shows class info and quick access to all classes, plus navigation items.
 */

export default function ClassSidebar({ classId, activeTab, onTabChange, allowedTabs}: ClassSidebarProps) {
  const navigate = useNavigate();
  const [userClasses, setUserClasses] = useState<ClassShortcut[]>([]);
  const [currentClass, setCurrentClass] = useState<ClassShortcut | null>(null);

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classes = await classService.getMyClasses();
        
        // Transform classes to shortcuts with colors
        const classShortcuts: ClassShortcut[] = classes.map((c, index) => {
          const badge = generateBadge(c.name);
          const color = COLORS[index % COLORS.length];
          
          return {
            ...c,
            id: Number(c.id),
            badge,
            color,
            isActive: Number(c.id) === Number(classId),
            description: c.description || '',
          };
        });

        setUserClasses(classShortcuts);
        
        // Set current class data
        const currentClassData = classShortcuts.find(c => Number(c.id) === Number(classId));
        if (currentClassData) {
          setCurrentClass(currentClassData);
        }
      } catch (err) {
        console.error("Failed to fetch classes:", err);
        setUserClasses([]);
      }
    };

    fetchClasses();
  }, [classId]);

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const handleSwitchClass = (newClassId: string | number) => {
    onTabChange("general");
    navigate(`/class/${newClassId}`, { state: { role: currentClass?.role } });
  };

  // All possible nav items
  const allNavItems = [
    { id: "general" as TabId, icon: TvIcon, label: "General" },
    { id: "assignment" as TabId, icon: GraduationCapIcon, label: "Assignment" },
    { id: "teams" as TabId, icon: AiOutlineTeam, label: "Teams" },
    { id: "students" as TabId, icon: GraduationCapIcon, label: "Students" },
    { id: "grades" as TabId, icon: TvIcon, label: "Grades" },
  ];
  // Only show allowed tabs
  const navItems = allowedTabs
    ? allNavItems.filter(item => allowedTabs.includes(item.id))
    : allNavItems;

  // Get current class for header display
  const headerClass = currentClass || (userClasses.length > 0 ? userClasses[0] : null);

  return (
    <div className="flex h-screen">
      {/* Left Sidebar: Class List - Quick Access */}
      <aside className="flex flex-col w-24 bg-white border-r text-slate-900 border-slate-200">
        {/* Navigator Button */}
        <div className="border-b border-slate-200">
          <button
            onClick={handleBackToDashboard}
            className="w-full p-6 transition-colors duration-150 hover:bg-slate-100 group"
            title="Back to Dashboard"
          >
            <ChevronLeftIcon className="w-5 h-5 mx-auto transition-colors duration-150 text-slate-400 group-hover:text-slate-600" />
          </button>
        </div>

        {/* Class Shortcuts */}
        <div className="flex-1 py-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          {userClasses.map((classItem) => (
            <button
              key={classItem.id}
              onClick={() => handleSwitchClass(classItem.id)}
              className={`w-full p-4 transition-colors duration-150 relative ${classItem.isActive ? "" : "hover:bg-slate-50"
                }`}
              title={classItem.name}
            >
              <div className={`w-14 h-14 ${classItem.color} rounded-xl mx-auto shadow-sm grid place-items-center ${classItem.isActive
                  ? "ring-2 ring-slate-400 ring-offset-2 ring-offset-white"
                  : "opacity-70 hover:opacity-100 transition-opacity duration-150"
                }`}>
                <span className="text-white font-bold text-[0.75rem] leading-tight text-center w-full px-1 line-clamp-2">{classItem.badge}</span>
              </div>
              {classItem.isActive && (
                <div className="absolute left-0 w-1 h-10 -translate-y-1/2 rounded-r bg-slate-400 top-1/2"></div>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Right Sidebar: Module Navigation */}
      <aside className="flex flex-col border-r w-72 bg-slate-50 text-slate-900 border-slate-200">
        {/* Class Header */}
        {headerClass && (
          <div className="p-5 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-12 h-12 ${headerClass.color} rounded-xl shrink-0`}>
                <span className="px-1 text-xs font-bold text-center text-white line-clamp-2">{headerClass.badge}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold leading-tight truncate text-slate-900">{headerClass.name}</h3>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-slate-500">{(headerClass as any).memberCount || 0} members</p>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    headerClass.role === "Teacher" || headerClass.role === "Instructor"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {headerClass.role === "Teacher" || headerClass.role === "Instructor" ? "My Class" : "Member"}
                  </span>
                </div>
              </div>
              <button className="p-2 transition-colors duration-150 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200">
                <MoreVerticalIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Module Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-5 py-3 transition-colors duration-150 relative ${isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
              >
                {isActive && (
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-blue-600 rounded-r"></div>
                )}
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                <span className={`text-sm ${isActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
