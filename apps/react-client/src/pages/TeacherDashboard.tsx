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
    StudentsTab,
} from "@/features/classDashboard";
import TeacherGeneralTab from "@/features/classDashboard/tabs/TeacherGeneralTab";
import TeacherAssignmentTab from "@/features/classDashboard/tabs/TeacherAssignmentTab";
import TeacherGradesTab from "@/features/classDashboard/tabs/TeacherGradesTab";
import TeamsTab from "@/features/classDashboard/tabs/TeamsTab";

type TeacherTabId = "general" | "assignment" | "students" | "teams" | "grades";

/**
 * TeacherDashboard - Teacher-specific class management interface
 * Includes assignment creation/grading, student management, and class administration
 */
export default function TeacherDashboard() {
    const params = useParams();
    const classId = params.id as string;
    const location = useLocation();
    const { isLoading: authLoading } = useAuth();

    // Restore tab state from navigation or default to general
    const initialTab = (location.state?.activeTab as TeacherTabId) || "general";
    const [activeTab, setActiveTab] = useState<TeacherTabId>(initialTab);

    // Teacher-specific tabs include "students" for class roster management and "teams" for team management
    const allowedTabs: TeacherTabId[] = ["general", "assignment", "students", "teams", "grades"];

    /**
     * Render tab content - TEACHER-SPECIFIC
     * Each tab component is optimized for classroom management (creation, grading, administration)
     * NOT shared with student dashboard - uses dedicated TeacherXTab components
     */
    const renderTabContent = () => {
        switch (activeTab) {
            // Teacher General Tab - Class overview, assignment management
            case "general":
                return <TeacherGeneralTab classId={classId} />;

            // Teacher Assignment Tab - Create, edit, grade assignments
            case "assignment":
                return <TeacherAssignmentTab classId={classId} />;

            // Teacher Students Tab - Class roster and student management (teacher only)
            case "students":
                return <StudentsTab classId={classId} />;

            // Teacher Teams Tab - Team creation and management
            case "teams":
                return <TeamsTab classId={classId} />;

            // Teacher Grades Tab - Grade management and analytics
            case "grades":
                return <TeacherGradesTab classId={classId} />;

            default:
                return <TeacherGeneralTab classId={classId} />;
        }
    };

    const handleTabChange = (tab: TeacherTabId | string) => {
        setActiveTab(tab as TeacherTabId);
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
                        role={UserRole.Teacher}
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
