import { Link, useLocation } from "react-router-dom";
import StatusBadge from "@/components/primitives/StatusBadge";
import { ClipboardIcon } from "./icons";

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  dueTime: string;
  relativeDate: string;
  module: string;
  status?: "submitted" | "feedback" | "inactive";
  additionalStatus?: "feedback";
}

interface AssignmentCardProps {
  assignment: Assignment;
  classId?: string;
}

/**
 * AssignmentCard - Individual assignment card display.
 * Redesigned to match the reference design with better visual hierarchy.
 */
export default function AssignmentCard({ assignment, classId }: AssignmentCardProps) {
  const location = useLocation();

  // Determine if we're in a student context by checking the URL
  const isStudentContext = location.pathname.includes('/student-class/');

  // Build the appropriate link based on context
  const assignmentLink = isStudentContext && classId
    ? `/student-class/${classId}/assignment/${assignment.id}`
    : `/assignment/${assignment.id}`;
  const getStatusBadges = () => {
    if (!assignment.status) return null;

    return (
      <div className="flex gap-2">
        <StatusBadge status={assignment.status} />
        {assignment.additionalStatus === "feedback" && (
          <StatusBadge status="feedback" />
        )}
      </div>
    );
  };

  return (
    <Link
      to={assignmentLink}
      className="block bg-white border border-slate-300 rounded-xl p-5 hover:shadow-lg hover:border-slate-400 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <h4 className="font-semibold text-slate-900 text-lg">{assignment.title}</h4>
          <p className="text-sm text-red-600 font-medium">
            Due at {assignment.dueTime}
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <ClipboardIcon className="w-4 h-4 text-slate-500" />
            <span>{assignment.module}</span>
          </div>
        </div>
        {getStatusBadges()}
      </div>
    </Link>
  );
}
