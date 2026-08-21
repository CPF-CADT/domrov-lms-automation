"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import assessmentService from "@/services/assessmentService";
import submissionService from "@/services/submissionService";
import type { AssessmentListItemDto } from "@/types/assessment";
import type { MySubmissionResponseDto, SubmissionStatusItemDto } from "@/types/submission";

interface StudentGradesTabProps {
    classId: string;
}

interface StudentGradeRow {
    assessmentId: number;
    title: string;
    dueDate: Date | string;
    maxScore: number;
    status: string;
    score: number | null;
    teacherFeedback: string;
    aiFeedback: string;
}

const StudentGradesTab = ({ classId }: StudentGradesTabProps) => {
    const [rows, setRows] = useState<StudentGradeRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadGrades = async () => {
            const classIdNum = Number(classId);
            if (!Number.isFinite(classIdNum)) {
                setError("Invalid class id.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const [assessments, classStatuses] = await Promise.all([
                    assessmentService.getAssessmentsByClass(classIdNum),
                    submissionService.getMySubmissionStatusInClass(classIdNum),
                ]);

                const statusMap = new Map<number, SubmissionStatusItemDto>();
                classStatuses.forEach((item) => {
                    statusMap.set(item.assessmentId, item);
                });

                const detailedStatuses = await Promise.all(
                    assessments.map(async (assessment) => {
                        try {
                            const detail = await submissionService.getMySubmissionStatus(assessment.id);
                            return { assessmentId: assessment.id, detail };
                        } catch {
                            return { assessmentId: assessment.id, detail: null };
                        }
                    }),
                );

                const detailMap = new Map<number, MySubmissionResponseDto | null>();
                detailedStatuses.forEach((item) => {
                    detailMap.set(item.assessmentId, item.detail);
                });

                const nextRows = assessments.map((assessment: AssessmentListItemDto) => {
                    const detail = detailMap.get(assessment.id);
                    const classStatus = statusMap.get(assessment.id);
                    const evaluation = detail?.evaluation;

                    return {
                        assessmentId: assessment.id,
                        title: assessment.title,
                        dueDate: assessment.dueDate,
                        maxScore: assessment.maxScore,
                        status: detail?.status ?? classStatus?.status ?? "NOT_SUBMITTED",
                        score: evaluation?.score ?? classStatus?.grade ?? null,
                        teacherFeedback: (evaluation?.feedback ?? "").trim(),
                        aiFeedback: (evaluation?.aiFeedback ?? "").trim(),
                    };
                });

                nextRows.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
                setRows(nextRows);
            } catch {
                setError("Failed to load grades. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadGrades();
    }, [classId]);

    const gradedCount = useMemo(() => rows.filter((row) => row.score !== null).length, [rows]);

    const getStatusBadge = (status: string) => {
        const normalized = status.toUpperCase();
        if (normalized === "GRADED") {
            return <span className="px-2 py-1 text-xs font-semibold rounded bg-emerald-100 text-emerald-700">Graded</span>;
        }
        if (normalized === "SUBMITTED" || normalized === "RESUBMITTED") {
            return <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-700">Submitted</span>;
        }
        if (normalized === "LATE") {
            return <span className="px-2 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-700">Late Submission</span>;
        }
        if (normalized === "PENDING") {
            return <span className="px-2 py-1 text-xs font-semibold rounded bg-violet-100 text-violet-700">Under Review</span>;
        }
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-slate-100 text-slate-700">Not Submitted</span>;
    };

    const formatDate = (value: Date | string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "-";
        }
        return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Grades</h2>
                <p className="text-slate-600 text-sm mb-4">
                    Track your assignment scores, feedback, and overall course performance.
                </p>

                {loading && (
                    <div className="py-16 flex items-center justify-center gap-3 text-slate-600">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading grades...</span>
                    </div>
                )}

                {!loading && error && (
                    <div className="border border-red-200 bg-red-50 rounded-lg p-4 flex items-start gap-3 text-red-700">
                        <AlertCircle className="w-5 h-5 mt-0.5" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {!loading && !error && rows.length === 0 && (
                    <div className="text-slate-500 py-12 text-center">
                        <p>No assignments found for this class yet.</p>
                    </div>
                )}

                {!loading && !error && rows.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-sm text-slate-700">
                                Graded assignments: <span className="font-semibold text-slate-900">{gradedCount}/{rows.length}</span>
                            </p>
                        </div>

                        <div className="space-y-3">
                            {rows.map((row) => (
                                <div key={row.assessmentId} className="rounded-lg border border-slate-200 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                                        <div>
                                            <h3 className="text-base font-semibold text-slate-900">{row.title}</h3>
                                            <p className="text-xs text-slate-500 mt-1">Due {formatDate(row.dueDate)}</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(row.status)}
                                            <span className="text-sm font-semibold text-slate-900">
                                                {row.score !== null ? `${row.score}/${row.maxScore}` : `-/${row.maxScore}`}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="rounded-md bg-blue-50 border border-blue-100 p-3">
                                            <p className="text-xs uppercase tracking-wide text-blue-700 font-semibold mb-1">Teacher Feedback</p>
                                            <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                                {row.teacherFeedback || "No teacher feedback yet."}
                                            </p>
                                        </div>

                                        <div className="rounded-md bg-violet-50 border border-violet-100 p-3">
                                            <p className="text-xs uppercase tracking-wide text-violet-700 font-semibold mb-1">AI Feedback</p>
                                            <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                                {row.aiFeedback || "No AI feedback yet."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentGradesTab;
