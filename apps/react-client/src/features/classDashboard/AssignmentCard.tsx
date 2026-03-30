import { Link, useLocation } from "react-router-dom";
import StatusBadge from "@/components/primitives/StatusBadge";
import { ClipboardIcon, CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  dueTime: string;
  relativeDate: string;
  module: string;
  status?: "submitted" | "feedback" | "inactive";
  additionalStatus?: "feedback";
  maxScore?: number;
}

interface AssignmentCardProps {
  assignment: Assignment;
  classId?: string;
  submissionStatus?: "not-submitted" | "submitted-early" | "submitted-ontime" | "submitted-late" | "graded" | null;
  currentScore?: number;
  maxScore?: number;
}

/**
 * AssignmentCard - Individual assignment card display with submission status.
 * Shows visual indicators for submission timing (early, on-time, late) and grading status.
 */
export default function AssignmentCard({
  assignment,
  classId,
  submissionStatus = null,
  currentScore,
  maxScore = assignment.maxScore
}: AssignmentCardProps) {
  const location = useLocation();

  const isStudentContext = location.pathname.includes('/student-class/');

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

  const getSubmissionStatusBadge = () => {
    if (!submissionStatus) return null;

    const badgeConfig: Record<string, { icon: any; label: string; color: string }> = {
      "not-submitted": { icon: Clock, label: "Not Submitted", color: "bg-slate-100 text-slate-700" },
      "submitted-early": { icon: CheckCircle2, label: "Submitted Early", color: "bg-green-100 text-green-700" },
      "submitted-ontime": { icon: CheckCircle2, label: "Submitted", color: "bg-blue-100 text-blue-700" },
      "submitted-late": { icon: AlertCircle, label: "Submitted Late", color: "bg-orange-100 text-orange-700" },
      "graded": { icon: CheckCircle2, label: `Graded ${currentScore !== undefined ? `• ${currentScore}/${maxScore}` : ''}`, color: "bg-purple-100 text-purple-700" },
    };

    const config = badgeConfig[submissionStatus];
    if (!config) return null;

    const IconComponent = config.icon;
    return (
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${config.color}`}>
        <IconComponent className="w-4 h-4" />
        {config.label}
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
        <div className="flex flex-col items-end gap-2 shrink-0">
          {getSubmissionStatusBadge()}
          {getStatusBadges()}
        </div>
      </div>
    </Link>
  );
}
