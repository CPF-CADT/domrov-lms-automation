import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import EditAssignmentForm from "@/features/assignment/EditAssignmentForm";
import GradeStudentsDetail from "@/features/assignment/components/GradeStudentsDetail";
import ViewAssignmentDetail from "@/features/assignment/components/ViewAssignmentDetail";
import ClassSidebar from "@/features/classDashboard/ClassSidebar";
import MainNavigation from "@/components/navigation/Navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { Toast } from "@/components/Toast";

type TabId = "general" | "assignment" | "posts" | "students" | "teams" | "files" | "grades";

export default function EditAssignmentPage() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const classId = params.id as string;
  const assignmentId = params.assignmentId as string;
  const [activeTab, setActiveTab] = useState<TabId>("assignment");
  const { toast } = useToast();

  const isGradeRoute = location.pathname.includes("/grade");
  const isViewRoute = location.pathname.includes("/view");

  if (!classId || !assignmentId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">Error: Class ID or Assignment ID not found</div>
      </div>
    );
  }

  const handleBack = () => {
    navigate(`/class/${classId}`, { state: { activeTab: "assignment" } });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <MainNavigation activeId="classes" />
      <ClassSidebar 
        classId={classId} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
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
