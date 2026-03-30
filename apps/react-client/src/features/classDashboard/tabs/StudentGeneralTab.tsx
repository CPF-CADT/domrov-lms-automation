"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardIcon, CheckCircle2, Clock, AlertCircle, CheckCheck } from "lucide-react";
import assessmentService from "@/services/assessmentService";
import submissionService from "@/services/submissionService";
import type { AssessmentListItemDto, SubmissionStatusItemDto } from "@/types";

interface StudentGeneralTabProps {
    classId: string;
}

/**
 * Helper to determine submission status badge
 */
function getSubmissionStatusBadge(
    assignment: AssessmentListItemDto,
    submissionStatus: SubmissionStatusItemDto | null
) {
    // No submission data available - not submitted
    if (!submissionStatus) {
        const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
        const now = new Date();

        if (!dueDate) {
            return { status: 'pending', label: 'Pending', color: 'bg-slate-100 text-slate-700', icon: Clock };
        }

        if (now > dueDate) {
            return { status: 'overdue', label: 'Not Submitted • Overdue', color: 'bg-red-100 text-red-700', icon: AlertCircle };
        }

        return { status: 'pending', label: 'Not Submitted', color: 'bg-slate-100 text-slate-700', icon: Clock };
    }

    // Has grade - show graded status with score
    if (submissionStatus.grade !== null && submissionStatus.grade !== undefined) {
        return {
            status: 'graded',
            label: `Graded • ${submissionStatus.grade}/${assignment.maxScore}`,
            color: 'bg-purple-100 text-purple-700',
            icon: CheckCheck
        };
    }

    // Has submission
    if (submissionStatus.submissionId) {
        const dueDate = new Date(submissionStatus.dueDate);
        const now = new Date();

        // If still past due, likely submitted late (unless graded, which we checked above)
        if (now > dueDate) {
            return {
                status: 'submitted-late',
                label: '⚠ Submitted Late',
                color: 'bg-orange-100 text-orange-700',
                icon: AlertCircle
            };
        }

        return {
            status: 'submitted',
            label: '✓ Submitted',
            color: 'bg-green-100 text-green-700',
            icon: CheckCircle2
        };
    }

    // Not submitted
    const dueDate = new Date(submissionStatus.dueDate);
    const now = new Date();

    if (now > dueDate) {
        return {
            status: 'overdue',
            label: 'Not Submitted • Overdue',
            color: 'bg-red-100 text-red-700',
            icon: AlertCircle
        };
    }

    return {
        status: 'pending',
        label: 'Not Submitted',
        color: 'bg-slate-100 text-slate-700',
        icon: Clock
    };
}

/**
 * StudentGeneralTab - STUDENT-SPECIFIC
 * Shows assignment overview with actual submission status and due dates
 * Displays submission status: not submitted, submitted early/late, graded with score
 * NOT shared with teacher dashboard
 */
const StudentGeneralTab = ({ classId }: StudentGeneralTabProps) => {
    const classIdNum = Number(classId);
    const navigate = useNavigate();

    const [, setAssignments] = useState<AssessmentListItemDto[]>([]);
    const [groupedAssignments, setGroupedAssignments] = useState<Record<number, AssessmentListItemDto[]>>({});
    const [submissionStatusMap, setSubmissionStatusMap] = useState<Map<number, SubmissionStatusItemDto>>(new Map());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch assignments and submission status
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                // Fetch assignments
                const assignmentData: AssessmentListItemDto[] = (await assessmentService.getAssessmentsByClass(classIdNum));
                setAssignments(assignmentData);

                // Fetch submission statuses
                const submissionData: SubmissionStatusItemDto[] = (await submissionService.getMySubmissionStatusInClass(classIdNum));

                // Create map for easy lookup
                const statusMap = new Map<number, SubmissionStatusItemDto>();
                submissionData.forEach((item) => {
                    statusMap.set(item.assessmentId, item);
                });
                setSubmissionStatusMap(statusMap);

                // Group assignments by session
                const grouped: Record<number, AssessmentListItemDto[]> = {};
                assignmentData.forEach((assignment: AssessmentListItemDto) => {
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

        if (classIdNum) fetchData();
    }, [classIdNum]);

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <ClipboardIcon className="w-6 h-6 text-blue-700" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Your Assignments</h2>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin">
                            <Clock className="w-8 h-8 text-blue-500" />
                        </div>
                        <p className="text-slate-600 mt-3">Loading assignments...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                        {error}
                    </div>
                ) : Object.keys(groupedAssignments).length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-slate-500 text-lg">No assignments yet</p>
                        <p className="text-slate-400 text-sm mt-2">Check back soon for assignments from your instructor</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedAssignments).map(([session, sessionAssignments]) => (
                            <div key={session}>
                                <div className="flex items-center gap-3 mb-4">
                                    <h3 className="text-lg font-bold text-slate-800">Session {session}</h3>
                                    <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
                                        {sessionAssignments.length} assignment{sessionAssignments.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {sessionAssignments.map((assignment) => {
                                        const submissionStatus = submissionStatusMap.get(assignment.id) || null;
                                        const statusInfo = getSubmissionStatusBadge(assignment, submissionStatus);
                                        const IconComponent = statusInfo.icon;

                                        return (
                                            <button
                                                key={assignment.id}
                                                onClick={() => {
                                                    navigate(`/student-class/${classId}/assignment/${assignment.id}`);
                                                }}
                                                className="w-full text-left p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all duration-200 group"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start gap-3 mb-2">
                                                            <p className="font-bold text-slate-900 group-hover:text-blue-900 text-lg">
                                                                {assignment.title || "Untitled Assignment"}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm">
                                                            <span className="text-slate-600 flex items-center gap-1">
                                                                <Clock className="w-4 h-4" />
                                                                Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                                                            </span>
                                                            <span className="text-blue-600 font-semibold flex items-center gap-1">
                                                                {assignment.maxScore || 0} pts
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm ${statusInfo.color}`}>
                                                            <IconComponent className="w-4 h-4" />
                                                            {statusInfo.label}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentGeneralTab;
