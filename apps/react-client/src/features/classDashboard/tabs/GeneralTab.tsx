"use client";

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ClipboardIcon } from "../icons";
import AssignmentDetailView from "./AssignmentDetailView";
import assessmentService from "@/services/assessmentService";
import type { AssessmentListItemDto } from "@/types";

interface GeneralTabProps {
  classId: string;
}

const GeneralTab = ({ classId }: GeneralTabProps) => {
  const classIdNum = Number(classId);
  const navigate = useNavigate();
  const location = useLocation();

  const [, setAssignments] = useState<AssessmentListItemDto[]>([]);
  const [groupedAssignments, setGroupedAssignments] = useState<Record<number, AssessmentListItemDto[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<AssessmentListItemDto | null>(null);

  // Detect if we're in a student context
  const isStudentContext = location.pathname.includes('/student-class/');

  // Fetch all assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true);
      setError(null);

      try {
        // fetch ALL assignments in class
        const data: AssessmentListItemDto[] = (await assessmentService.getAssessmentsByClass(classIdNum));
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
    <>
      {selectedAssignment && !isStudentContext ? (
        <AssignmentDetailView
          assessmentId={selectedAssignment.id}
          onBack={() => setSelectedAssignment(null)}
        />
      ) : (
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
                        <button
                          key={assignment.id || assignment.id}
                          onClick={() => {
                            if (isStudentContext) {
                              // Route students to the dedicated assignment page
                              navigate(`/student-class/${classId}/assignment/${assignment.id}`);
                            } else {
                              // Show modal for teachers
                              setSelectedAssignment(assignment);
                            }
                          }}
                          className="w-full text-left border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all"
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
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default GeneralTab;