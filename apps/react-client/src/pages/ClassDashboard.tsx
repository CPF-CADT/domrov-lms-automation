"use client";


import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/enums";
import MainNavigation from "@/components/navigation/Navigation";
import {
  ClassSidebar,
  ClassTabs,
  GeneralTab,
  AssignmentTab,
  PostsTab,
  StudentsTab,
  FilesTab,
  GradesTab,
} from "@/features/classDashboard";
import { useParams, useLocation } from "react-router-dom";

type TabId = "general" | "assignment" | "posts" | "students" | "files" | "grades";


export default function ClassDashboardClient() {
  const params = useParams();
  const classId = params.id as string;
  const { isLoading: authLoading } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>("general");
  // Get role from location.state (passed from ClassCard)
  const role = (location.state && location.state.role) || null;
  const [error, setError] = useState<string | null>(null);

  const renderTabContent = () => {
    if (role === UserRole.Teacher) {
      switch (activeTab) {
        case "general":
          return <GeneralTab classId={classId} />;
        case "assignment":
          return <AssignmentTab classId={classId} />;
        case "posts":
          return <PostsTab classId={classId} />;
        case "students":
          return <StudentsTab classId={classId} />;
        case "files":
          return <FilesTab classId={classId} />;
        case "grades":
          return <GradesTab classId={classId} />;
        default:
          return <GeneralTab classId={classId} />;
      }
    } else if (role === UserRole.Student) {
      switch (activeTab) {
        case "general":
          return <GeneralTab classId={classId} />;
        case "assignment":
          return <AssignmentTab classId={classId} />;
        case "posts":
          return <PostsTab classId={classId} />;
        case "files":
          return <FilesTab classId={classId} />;
        case "grades":
          return <GradesTab classId={classId} />;
        // Students tab is not available for students
        default:
          return <GeneralTab classId={classId} />;
      }
    }
    return null;
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-slate-600">Loading class dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  // Permission: Only show dashboard if user is enrolled (role is present)
  if (!role) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">You do not have permission to view this class. (No role found)</div>
      </div>
    );
  }

  // Teacher: all tabs, Student: no Students tab
  const allowedTabs: TabId[] = role === UserRole.Teacher
    ? ["general", "assignment", "posts", "students", "files", "grades"]
    : ["general", "assignment", "posts", "files", "grades"];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <MainNavigation activeId="classes" />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex w-full min-h-screen">
          {/* Class Sidebar (middle left) */}
          <ClassSidebar
            classId={classId}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            allowedTabs={allowedTabs}
            role={role}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Tabs Navigation */}
            <ClassTabs activeTab={activeTab} onTabChange={setActiveTab} allowedTabs={allowedTabs} role={role} />

            {/* Tab Content */}
            <main className="flex-1 overflow-y-auto bg-slate-50">
              <div key={activeTab} className="animate-fadeIn">
                {renderTabContent()}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
