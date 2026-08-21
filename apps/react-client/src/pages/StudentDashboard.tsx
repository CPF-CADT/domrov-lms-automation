"use client";

import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/enums";
import MainNavigation from "@/components/navigation/Navigation";
import {
    ClassSidebar,
    ClassTabs,
} from "@/features/classDashboard";

type StudentTabId = "general" | "assignment" | "grades";

/**
 * StudentDashboard - Student-specific class view with tabs for assignments, grades, posts, and files
 * Optimized for student workflows with focus on assignment submission and grading
 */
export default function StudentDashboard() {
    const params = useParams();
    const classId = params.id as string;
    const location = useLocation();
    const navigate = useNavigate();
    const { isLoading: authLoading } = useAuth();

    // Determine active tab from path
    const pathParts = location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    const currentTab = (["general", "assignment", "grades"].includes(lastPart) 
        ? lastPart 
        : "general") as StudentTabId;

    const [activeTab, setActiveTab] = useState<StudentTabId>(currentTab);

    // Sync state if navigation happens externally
    useEffect(() => {
        setActiveTab(currentTab);
    }, [currentTab]);

    // Student-only allowed tabs (no teacher-specific tabs like "students")
    const allowedTabs: StudentTabId[] = ["general", "assignment", "grades"];

    const handleTabChange = (tab: StudentTabId | string) => {
        if (tab !== "students") {
            setActiveTab(tab as StudentTabId);
            navigate(`/student-class/${classId}/${tab}`);
        }
    };

    if (authLoading) {
        return (
            <div className="flex min-h-screen bg-slate-50">
                <MainNavigation activeId="classes" />
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="text-slate-600 font-medium">Loading your class...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Main Navigation */}
            <MainNavigation activeId="classes" />

            <div className="flex flex-col flex-1 min-w-0">
                <div className="flex w-full min-h-screen">
                    {/* Class Sidebar */}
                    <ClassSidebar
                        classId={classId}
                        activeTab={activeTab}
                        onTabChange={handleTabChange as any}
                        allowedTabs={allowedTabs}
                        role={UserRole.Student}
                    />

                    {/* Main Content Area */}
                    <div className="flex flex-col flex-1 min-w-0">
                        {/* Tab Navigation */}
                        <ClassTabs
                            activeTab={activeTab}
                            allowedTabs={allowedTabs}
                        />

                        {/* Tab Content with Transition Animation */}
                        <main className="flex-1 overflow-y-auto bg-slate-50">
                            <div key={activeTab} className="animate-fadeIn p-8">
                                <Outlet />
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        </div>
    );
}
