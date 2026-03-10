"use client";

import { useEffect, useState } from "react";
import { ClipboardIcon } from "../icons";
import assessmentService from "@/services/assessmentService";
import type { AssessmentListItemDto } from "@/types";

interface GeneralTabProps {
  classId: string;
}

const GeneralTab = ({ classId }: GeneralTabProps) => {
  const classIdNum = Number(classId);

  const [assignments, setAssignments] = useState<AssessmentListItemDto[]>([]);
  const [groupedAssignments, setGroupedAssignments] = useState<Record<number, AssessmentListItemDto[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true);
      setError(null);

      try {
        // fetch ALL assignments in class
        const data: AssessmentListItemDto[]  = (await assessmentService.getAssessmentsByClass(classIdNum)).data;
        setAssignments(data);

        // group by session
        const grouped: Record<number, AssessmentListItemDto[]> = {};

        data.forEach((assignment: AssessmentListItemDto) => {
          const session = assignment.session || 1;

          if (!grouped[session]) {
            grouped[session] = [];
          }

          grouped[session].push(assignment);
        });

        setGroupedAssignments(grouped);
      } catch (err) {
        setError("Failed to load assignments");
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };

    if (classIdNum) fetchAssignments();
  }, [classIdNum]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardIcon className="w-5 h-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Assignments</h2>
        </div>

        {loading ? (
          <div className="text-slate-500">Loading assignments...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : Object.keys(groupedAssignments).length === 0 ? (
          <div className="text-slate-500">No assignments found.</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedAssignments).map(([session, sessionAssignments]) => (
              <div key={session}>
                {/* Session Title */}
                <h3 className="text-md font-semibold text-slate-800 mb-3">
                  Session {session}
                </h3>

                <div className="space-y-3">
                  {sessionAssignments.map((assignment) => (
                    <div
                      key={assignment.id || assignment.id}
                      className="border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
                    >
                      <h3 className="font-semibold text-slate-900 mb-2">
                        {assignment.title}
                      </h3>

                      <p className="text-sm text-slate-600 mb-2">
                        Due:{" "}
                        {assignment.dueDate
                          ? new Date(assignment.dueDate).toLocaleString()
                          : "-"}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <ClipboardIcon className="w-4 h-4" />
                        <span>Session: {assignment.session}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneralTab;