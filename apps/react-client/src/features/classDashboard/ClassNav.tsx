/**
 * ClassNav - Navigation utilities for class dashboard.
 * This file can be used to export navigation-related types and utilities.
 */

export type ClassTabId = "assignment" | "posts" | "students" | "files";

export const CLASS_TABS = [
  { id: "assignment" as ClassTabId, label: "Assignment", icon: "list" },
  { id: "posts" as ClassTabId, label: "Posts", icon: "📝" },
  { id: "students" as ClassTabId, label: "Students", icon: "👥" },
  { id: "files" as ClassTabId, label: "Files", icon: "📁" },
] as const;
