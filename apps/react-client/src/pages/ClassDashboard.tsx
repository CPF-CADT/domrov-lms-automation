"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/enums";
import MainNavigation from "@/components/navigation/Navigation";
import StudentDashboard from "./StudentDashboard";
import TeacherDashboard from "./TeacherDashboard";
import classService from "@/services/classService";

/**
 * ClassDashboard - Router component that delegates to StudentDashboard or TeacherDashboard
 * Role is determined exclusively by class context (location.state.role)
 * A user can have different roles in different classes
 */
export default function ClassDashboard() {
  const params = useParams();
  const classId = params.id as string;
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading: authLoading } = useAuth();
  const [role, setRole] = useState<string | undefined>();

  // Role MUST come from class context only (passed from ClassCard)
  // A user can be a teacher in one class and a student in another
  useEffect(() => {
    if (!classId) {
      navigate("/dashboard");
      return;
    }

    let cancelled = false;

    async function loadRole() {
      try {
        const classes = await classService.getMyClasses();
        const currentClass = classes.find((c) => c.id === Number(classId));

        if (!cancelled) {
          setRole(currentClass?.role ?? location.state?.role);
        }
      } catch (err) {
        console.error("Failed to load role:", err);

        if (!cancelled) {
          setRole(location.state?.role);
        }
      }
    }

    loadRole();

    return () => {
      cancelled = true;
    };
  }, [classId, location.state, navigate]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
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
      <div className="flex min-h-screen bg-slate-50">
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
