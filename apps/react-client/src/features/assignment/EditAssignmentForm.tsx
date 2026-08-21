import { useNavigate } from "react-router-dom";
import EditAssignmentDetail from "./components/EditAssignmentDetail";

interface EditAssignmentFormProps {
  classId: string;
  assignmentId?: string;
}

export default function EditAssignmentForm({ classId, assignmentId }: EditAssignmentFormProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(`/class/${classId}`, { state: { activeTab: "assignment" } });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-8 mx-auto max-w-7xl">
        <EditAssignmentDetail
          assignmentId={assignmentId ? Number(assignmentId) : undefined}
          classId={classId}
          onBack={handleBack}
        />
      </div>
    </div>
  );
}
