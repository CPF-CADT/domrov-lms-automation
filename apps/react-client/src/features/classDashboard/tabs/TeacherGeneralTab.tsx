"use client";

import { useEffect, useState } from "react";
import { ClipboardIcon } from "../icons";
import assessmentService from "@/services/assessmentService";
import type { AssessmentListItemDto } from "@/types";

interface TeacherGeneralTabProps {
    classId: string;
}

/**
 * TeacherGeneralTab - TEACHER-SPECIFIC
 * Shows assignment overview with management options, creation tools, and class analytics
 * NOT shared with student dashboard
 */
const TeacherGeneralTab = ({ classId }: TeacherGeneralTabProps) => {
    const classIdNum = Number(classId);

    const [, setAssignments] = useState<AssessmentListItemDto[]>([]);
    const [groupedAssignments, setGroupedAssignments] = useState<Record<number, AssessmentListItemDto[]>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAssignments = async () => {
            setLoading(true);
            setError(null);

            try {
                const data: AssessmentListItemDto[] = (await assessmentService.getAssessmentsByClass(classIdNum));
                setAssignments(data);

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
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <ClipboardIcon className="w-5 h-5 text-slate-700" />
                        <h2 className="text-lg font-semibold text-slate-900">Class Assignments</h2>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        + Create Assignment
                    </button>
                </div>

                {loading ? (
                    <div className="text-slate-500">Loading assignments...</div>
                ) : error ? (
                    <div className="text-red-600">{error}</div>
                ) : Object.keys(groupedAssignments).length === 0 ? (
                    <div className="text-slate-500">No assignments created yet. Create one to get started.</div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedAssignments).map(([session, sessionAssignments]) => (
                            <div key={session}>
                                <h3 className="text-md font-semibold text-slate-800 mb-3">Session {session}</h3>
                                <div className="space-y-3">
                                    {sessionAssignments.map((assignment) => (
                                        <div
                                            key={assignment.id}
                                            className="p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-slate-900 group-hover:text-blue-900">
                                                        {assignment.title || "Untitled"}
                                                    </p>
                                                    <p className="text-sm text-slate-600 mt-1">
                                                        Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "Not set"}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 ml-2">
                                                    <button className="px-3 py-1 text-sm bg-white border border-slate-300 rounded hover:bg-slate-100 transition-colors">
                                                        Edit
                                                    </button>
                                                    <button className="px-3 py-1 text-sm bg-white border border-slate-300 rounded hover:bg-slate-100 transition-colors">
                                                        Grade
                                                    </button>
                                                </div>
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

export default TeacherGeneralTab;
