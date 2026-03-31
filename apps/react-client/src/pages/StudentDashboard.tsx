"use client";

import { useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/enums";
import MainNavigation from "@/components/navigation/Navigation";
import {
    ClassSidebar,
    ClassTabs,
} from "@/features/classDashboard";
import StudentGeneralTab from "@/features/classDashboard/tabs/StudentGeneralTab";
import StudentAssignmentTab from "@/features/classDashboard/tabs/StudentAssignmentTab";
import StudentGradesTab from "@/features/classDashboard/tabs/StudentGradesTab";

type StudentTabId = "general" | "assignment" | "grades";

/**
 * StudentDashboard - Student-specific class view with tabs for assignments, grades, posts, and files
 * Optimized for student workflows with focus on assignment submission and grading
 */
export default function StudentDashboard() {
    const params = useParams();
    const classId = params.id as string;
    const location = useLocation();
    const { isLoading: authLoading } = useAuth();

    // Restore tab state from navigation or default to general
    const initialTab = (location.state?.activeTab as StudentTabId) || "general";
    const [activeTab, setActiveTab] = useState<StudentTabId>(initialTab);

    // Student-only allowed tabs (no teacher-specific tabs like "students")
    const allowedTabs: StudentTabId[] = ["general", "assignment", "grades"];

    /**
     * Render tab content - STUDENT-SPECIFIC
     * Each tab component is optimized for student workflow (submission, tracking, feedback)
     * NOT shared with teacher dashboard - uses dedicated StudentXTab components
     */
    const renderTabContent = () => {
        switch (activeTab) {
            // Student General Tab - Shows assignment overview, deadlines, and status
            case "general":
                return <StudentGeneralTab classId={classId} />;

            // Student Assignment Tab - Focused on submission workflow (student-specific)
            case "assignment":
                return <StudentAssignmentTab classId={classId} />;

            // Student Grades Tab - View feedback and scores (read-only)
            case "grades":
                return <StudentGradesTab classId={classId} />;

            default:
                return <StudentGeneralTab classId={classId} />;
        }
    };

    const handleTabChange = (tab: StudentTabId | string) => {
        if (tab !== "students") {
            setActiveTab(tab as StudentTabId);
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
