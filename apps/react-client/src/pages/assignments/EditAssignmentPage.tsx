import { useParams, useNavigate, useLocation } from "react-router-dom";
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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <MainNavigation activeId="classes" />
      <ClassSidebar 
        classId={classId} 
        allowedTabs={["general", "assignment", "students"]}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isGradeRoute ? (
            <div className="w-full p-5">
              <GradeStudentsDetail 
                assignmentId={assignmentId} 
                onBack={handleBack} 
              />
            </div>
          ) : isViewRoute ? (
            <div className="w-full p-5">
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
