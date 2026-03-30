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
    FilesTab,
    GradesTab,
} from "@/features/classDashboard";
import { useParams, useLocation } from "react-router-dom";

type StudentTabId = "general" | "assignment" | "posts" | "files" | "grades";

export default function StudentDashboard() {
    const params = useParams();
    const classId = params.id as string;
    const { isLoading: authLoading } = useAuth();
    const location = useLocation();
    const initialTab = (location.state?.activeTab as StudentTabId) || "general";
    const [activeTab, setActiveTab] = useState<StudentTabId>(initialTab);
    const [error] = useState<string | null>(null);

    const renderTabContent = () => {
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
            default:
                return <GeneralTab classId={classId} />;
        }
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg text-slate-600">Loading student dashboard...</div>
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

    // Student only tabs: no "students" tab, no teacher-specific content
    const allowedTabs: StudentTabId[] = ["general", "assignment", "posts", "files", "grades"];

    // Wrapper to handle tab change with type safety
    const handleTabChange = (tab: StudentTabId | string) => {
        if (tab !== "students") {
            setActiveTab(tab as StudentTabId);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50">
            <MainNavigation activeId="classes" />
            <div className="flex flex-col flex-1 min-w-0">
                <div className="flex w-full min-h-screen">
                    {/* Class Sidebar (middle left) */}
                    <ClassSidebar
                        classId={classId}
                        activeTab={activeTab}
                        onTabChange={handleTabChange as any}
                        allowedTabs={allowedTabs}
                        role={UserRole.Student}
                    />

                    {/* Main Content Area */}
                    <div className="flex flex-col flex-1 min-w-0">
                        {/* Top Header Navigation */}
                        <ClassTabs activeTab={activeTab} allowedTabs={allowedTabs} />

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
