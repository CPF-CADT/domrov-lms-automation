import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import EditAssignmentForm from "@/pages/assignments/components/EditAssignmentForm";
import GradeStudentsDetail from "@/pages/assignments/components/GradeStudentsDetail";
import ViewAssignmentDetail from "@/pages/assignments/components/ViewAssignmentDetail";
import ClassSidebar from "@/pages/classes/components/ClassSidebar";
import MainNavigation from "@/components/navigation/MainNavigation";
import { useToast } from "@/components/Toast";
import { Toast } from "@/components/Toast";
import { routes } from "@/lib/routes";

export default function EditAssignmentPage({ mode }: { mode?: "edit" | "grade" | "view" }) {
  const params = useParams<{ id?: string; classId?: string; assignmentId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const classId = (params.classId ?? params.id) as string;
  const assignmentId = params.assignmentId as string;
  const { toast } = useToast();

  const isGradeRoute = mode === "grade" || (mode === undefined && location.pathname.endsWith("/grade"));
  const isViewRoute = mode === "view" || (mode === undefined && location.pathname.endsWith("/view"));

  if (!classId || !assignmentId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">Error: Class ID or Assignment ID not found</div>
      </div>
    );
  }

  const handleBack = () => {
    navigate(routes.classAssignments(classId));
  };


  return (
    <div className="flex min-h-screen bg-slate-50">
      <MainNavigation activeId="classes" />
      <ClassSidebar 
        classId={classId} 
        allowedTabs={["general", "assignment", "students", "grades"]}
      />
      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-slate-200">
          <button
            onClick={handleBack}
            className="flex items-center justify-center transition-colors rounded-lg w-9 h-9 hover:bg-slate-100 text-slate-600 hover:text-slate-900"
            title="Back to assignments"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isGradeRoute ? "Grade Submissions" : isViewRoute ? "View Assignment" : "Edit Assignment"}
            </h1>
            <p className="text-sm text-slate-600">
              {isGradeRoute ? "Review and grade student work" : isViewRoute ? "Detailed view of the assignment" : "Update assignment details and settings"}
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isGradeRoute ? (
            <div className="p-8 mx-auto max-w-7xl">
              <GradeStudentsDetail 
                assignmentId={assignmentId} 
                onBack={handleBack} 
              />
            </div>
          ) : isViewRoute ? (
            <div className="p-8 mx-auto max-w-7xl">
              <ViewAssignmentDetail 
                assignmentId={assignmentId} 
                onBack={handleBack} 
              />
            </div>
          ) : (
            <EditAssignmentForm classId={classId} assignmentId={assignmentId} />
          )}
        </div>
        {toast && <Toast {...toast} />}
      </div>
    </div>
  );
}
