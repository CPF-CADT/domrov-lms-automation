"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import AnimatedPage from "@/components/AnimatedPage";
import type { AssessmentDetailDto } from "@/types/assessment";
import { getAssessmentDetails } from "@/services/assessmentService";

interface AssignmentDetailViewProps {
  assessmentId: number;
  onBack: () => void;
}

export default function AssignmentDetailView({ assessmentId, onBack }: AssignmentDetailViewProps) {
  const [assignment, setAssignment] = useState<AssessmentDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAssessmentDetails(assessmentId)
      .then(data => {
        setAssignment(data);
        setLoading(false);
      })
      .catch(_err => {
        setError("Failed to load assignment details.");
        setLoading(false);
      });
  }, [assessmentId]);

  return (
    <AnimatedPage>
      <div className="p-6 max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Assignments
        </button>

        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600">{error}</div>}

        {assignment && (
          <div className="bg-white rounded-lg border border-slate-200 p-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              {assignment.title}
            </h1>

            <div className="grid grid-cols-2 gap-6 mb-8 pb-8 border-b border-slate-200">
              <div>
                <p className="text-sm text-slate-600 mb-1">Due Date</p>
                <p className="text-lg font-semibold text-slate-900">
                  {assignment.dueDate
                    ? new Date(assignment.dueDate).toLocaleString()
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Session</p>
                <p className="text-lg font-semibold text-slate-900">
                  Session {assignment.session}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Details</h2>
              <p className="text-slate-700 mb-2">Assignment ID: {assignment.id}</p>
              <p className="text-slate-700 mb-2">Instruction: {assignment.instruction}</p>
              <p className="text-slate-700 mb-2">Max Score: {assignment.maxScore}</p>
              <p className="text-slate-700 mb-2">AI Evaluation: {assignment.aiEvaluationEnable ? "Enabled" : "Disabled"}</p>
              {assignment.class && (
                <p className="text-slate-700 mb-2">Class: {assignment.class.name || assignment.class.id}</p>
              )}
              {assignment.aiModel && (
                <p className="text-slate-700 mb-2">AI Model: {assignment.aiModel.name}</p>
              )}
            </div>

            {assignment.rubrics && assignment.rubrics.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Rubrics</h3>
                <ul className="list-disc pl-5">
                  {assignment.rubrics.map(rubric => (
                    <li key={rubric.id} className="mb-1">
                      {rubric.definition} (Total Score: {rubric.totalScore})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {assignment.resources && assignment.resources.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Resources</h3>
                <ul className="list-disc pl-5">
                  {assignment.resources.map(res => (
                    <li key={res.id} className="mb-1">
                      {res.resource.title} {res.resource.url && (<a href={res.resource.url} className="text-blue-600 underline ml-2" target="_blank" rel="noopener noreferrer">Link</a>)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {assignment.user_include_files && assignment.user_include_files.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">User Include Files</h3>
                <ul className="list-disc pl-5">
                  {assignment.user_include_files.map((file, idx) => (
                    <li key={idx}>{file}</li>
                  ))}
                </ul>
              </div>
            )}

            {assignment.user_exclude_files && assignment.user_exclude_files.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">User Exclude Files</h3>
                <ul className="list-disc pl-5">
                  {assignment.user_exclude_files.map((file, idx) => (
                    <li key={idx}>{file}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
