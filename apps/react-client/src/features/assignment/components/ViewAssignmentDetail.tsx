"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import assessmentService from "@/services/assessmentService";
import type { AssessmentDetailDto } from "@/types/assessment";

interface ViewAssignmentDetailProps {
  assignmentId: number | string; // accepts both number and string
  onBack: () => void;
}

export default function ViewAssignmentDetail({ assignmentId, onBack }: ViewAssignmentDetailProps) {
  const [assignment, setAssignment] = useState<AssessmentDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    assessmentService.getAssessmentDetails(Number(assignmentId))
      .then((data) => {
        if (!cancelled) setAssignment(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load assignment details.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [assignmentId]);

  const BackButton = () => (
    <button
      onClick={onBack}
      className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 text-sm transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Assignments
    </button>
  );

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <BackButton />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-sm text-slate-500">Loading assignment...</span>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <BackButton />
        <p className="text-red-500 text-sm text-center py-8">
          {error ?? "Assignment not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <BackButton />

      <div className="bg-white rounded-lg border border-slate-200 p-8">
        {/* Title */}
        <h1 className="text-3xl font-bold text-slate-900 mb-4">{assignment.title}</h1>

        {/* Key info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 pb-8 border-b border-slate-200">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Due Date</p>
            <p className="text-sm font-semibold text-slate-900">
              {assignment.dueDate
                ? new Date(assignment.dueDate).toLocaleString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                  hour: "numeric", minute: "2-digit", hour12: true,
                })
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Session</p>
            <p className="text-sm font-semibold text-slate-900">Session {assignment.session}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Max Score</p>
            <p className="text-sm font-semibold text-slate-900">{assignment.maxScore}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Status</p>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${assignment.isPublic
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
              }`}>
              {assignment.isPublic ? "Published" : "Draft"}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase text-slate-500 mb-2">Instructions</h2>
          <p className="text-slate-700 whitespace-pre-wrap">
            {assignment.instruction || "No instructions provided."}
          </p>
        </div>

        {/* Submission info */}
        <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-200">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Submission Type</p>
            <p className="text-sm text-slate-900">{assignment.submissionType}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Submission Method</p>
            <p className="text-sm text-slate-900">{assignment.allowedSubmissionMethod}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Late Submissions</p>
            <p className="text-sm text-slate-900">{assignment.allowLate ? "Allowed" : "Not allowed"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">AI Evaluation</p>
            <p className="text-sm text-slate-900">{assignment.aiEvaluationEnable ? "Enabled" : "Disabled"}</p>
          </div>
        </div>

        {/* Rubrics */}
        {assignment.rubrics && assignment.rubrics.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold uppercase text-slate-500 mb-2">Rubrics</h3>
            <div className="space-y-2">
              {assignment.rubrics.map((rubric) => (
                <div key={rubric.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-sm text-slate-900">{rubric.definition}</span>
                  <span className="text-sm font-semibold text-slate-700">{rubric.totalScore} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resources */}
        {assignment.resources && assignment.resources.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold uppercase text-slate-500 mb-2">Resources</h3>
            <div className="space-y-2">
              {assignment.resources.map((res) => (
                <div key={res.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-sm text-slate-900">{res.resource.title ?? res.resource.url}</span>
                  {res.resource.url && (
                    <a
                      href={res.resource.url}
                      className="text-xs text-blue-600 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open link
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}