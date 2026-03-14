"use client";

import { useState, useRef, useEffect } from "react";
import {
  ClipboardIcon,
  MessageIcon,
  UsersIcon,
  FolderIcon
} from "./icons";

type TabId = "general" | "assignment" | "posts" | "students" | "files" | "grades";

interface ClassTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  allowedTabs?: TabId[];
  role?: string;
}

/**
 * ClassTabs - Top navigation bar with tab title, search, and actions.
 * Displays the current tab and provides quick actions.
 */
// Accept allowedTabs and role props
export default function ClassTabs({ activeTab, onTabChange, allowedTabs }: ClassTabsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isMenuOpen]);

  // All possible tabs
  const allTabs: { id: TabId; label: string; icon: any }[] = [
    { id: "general", label: "General", icon: ClipboardIcon },
    { id: "assignment", label: "Assignment", icon: ClipboardIcon },
    { id: "posts", label: "Posts", icon: MessageIcon },
    { id: "students", label: "Students", icon: UsersIcon },
    { id: "files", label: "Files", icon: FolderIcon },
    { id: "grades", label: "Grades", icon: ClipboardIcon },
  ];
  const tabs = allowedTabs
    ? allTabs.filter(tab => allowedTabs.includes(tab.id))
    : allTabs;

  const getTabIcon = () => {
    const found = tabs.find(tab => tab.id === activeTab);
    return found ? found.icon : ClipboardIcon;
  };

  const getTabTitle = () => {
    const found = tabs.find(tab => tab.id === activeTab);
    return found ? found.label : activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
  };

  const TabIconComponent = getTabIcon();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5">
      <div className="flex items-center justify-between">
        {/* Tab Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            {TabIconComponent({ className: "w-4 h-4 text-white" })}
          </div>
          <h1 className="text-xl font-semibold text-slate-900">{getTabTitle()}</h1>
        </div>

        {/* Tab Navigation */}
        <nav className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange && onTabChange(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${activeTab === tab.id ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-700 hover:bg-blue-100"}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
