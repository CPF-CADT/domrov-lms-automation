"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/Enums";
import MainNavigation from "@/components/navigation/MainNavigation";
import StudentDashboard from "@/pages/dashboard/StudentDashboardPage";
import TeacherDashboard from "@/pages/dashboard/TeacherDashboardPage";
import { useMyClasses } from "@/hooks/useMyClasses";

/**
 * ClassDashboard - Router component that delegates to StudentDashboard or TeacherDashboard
 * Role is determined by the class membership returned from the API.
 * A user can have different roles in different classes
 */
export default function ClassDashboard() {
  const params = useParams<{ id?: string; classId?: string }>();
  const classId = (params.classId ?? params.id) as string;
  const navigate = useNavigate();
  const { isLoading: authLoading } = useAuth();
  const { classes, isLoading: classesLoading } = useMyClasses();
  const [role, setRole] = useState<string | undefined>();

  // A user can be a teacher in one class and a student in another. Resolve
  // the role from the server so direct links and refreshes remain valid.
  useEffect(() => {
    if (!classId) {
      navigate("/dashboard");
      return;
    }

    if (!classesLoading) {
      setRole(classes.find((currentClass) => currentClass.id === Number(classId))?.role);
    }
  }, [classId, classes, classesLoading, navigate]);

  if (authLoading || classesLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <MainNavigation activeId="classes" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-slate-600 font-medium">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Require role from class context
  if (!role) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <MainNavigation activeId="classes" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <p className="text-red-600 font-medium">Unable to determine your role in this class</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Back to Classes
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Route to appropriate dashboard based on class role
  if (role === UserRole.Teacher || role === UserRole.TeacherAssistant) {

    return <TeacherDashboard />;
  } else {
    return <StudentDashboard />;
  }
}
