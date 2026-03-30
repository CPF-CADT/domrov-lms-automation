"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, AlertCircle, Award } from "lucide-react";
import { getAssessmentsByClass } from "@/services/assessmentService";
import submissionService from "@/services/submissionService";
import type { SubmissionStatusItemDto } from "@/types/submission";
import type { AssessmentListItemDto } from "@/types/assessment";

interface StudentAssignmentListProps {
    classId: string;
    filter: "upcoming" | "past-due" | "completed";
}

// ─── Status Badge Rendering ────────────────────────────────────────────────────

function getSubmissionStatusBadge(status: string | undefined, grade?: number) {
    const statusDefault = status || "PENDING";

    if (statusDefault === "GRADED") {
        return {
            status: "graded",
            label: `Graded: ${grade ?? 0}%`,
            color: "bg-green-50 text-green-700 border-green-200",
            icon: Award,
        };
    }

    if (statusDefault === "LATE") {
        return {
            status: "submitted-late",
            label: "Submitted Late",
            color: "bg-orange-50 text-orange-700 border-orange-200",
            icon: AlertCircle,
        };
    }

    if (statusDefault === "SUBMITTED") {
        return {
            status: "submitted",
            label: "Submitted",
            color: "bg-blue-50 text-blue-700 border-blue-200",
            icon: CheckCircle2,
        };
    }

    return {
        status: "pending",
        label: "Pending",
        color: "bg-slate-50 text-slate-700 border-slate-200",
        icon: Clock,
    };
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function isPastDue(dueDate: string | Date): boolean {
    const d = new Date(dueDate);
    return !isNaN(d.getTime()) && d < new Date();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudentAssignmentList({
    classId,
    filter,
}: StudentAssignmentListProps) {
    const navigate = useNavigate();
    const [allAssignments, setAllAssignments] = useState<AssessmentListItemDto[]>([]);
    const [statusMap, setStatusMap] = useState<
        Map<number, SubmissionStatusItemDto>
    >(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ─── Load data ─────────────────────────────────────────────────────────────

    async function load() {
        setLoading(true);
        setError(null);
        try {
            // Fetch assessments
            const assessments = await getAssessmentsByClass(
                Number(classId)
            );
            console.log("[StudentAssignmentList] Loaded assessments:", assessments);
            setAllAssignments(assessments);

            // Fetch submission statuses
            try {
                const statuses =
                    await submissionService.getMySubmissionStatusInClass(
                        Number(classId)
                    );
                console.log("[StudentAssignmentList] Loaded submission statuses:", statuses);
                const map = new Map<number, SubmissionStatusItemDto>();
                statuses.forEach((status) => {
                    map.set(status.assessmentId, status);
                });
                setStatusMap(map);
            } catch (err) {
                console.warn("Could not load submission statuses:", err);
            }
        } catch (err) {
            console.error("Failed to load assignments:", err);
            setError("Could not load assignments. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, [classId]);

    // ─── Filter assignments ───────────────────────────────────────────────────
    // Filter logic:
    // - "upcoming": Uncompleted (PENDING) AND not due yet
    // - "past-due": Past due AND not yet submitted (PENDING only)
    // - "completed": All submitted assignments (SUBMITTED, LATE, GRADED)

    const filteredAssignments = allAssignments.filter((assignment) => {
        const status = statusMap.get(assignment.id);
        const submissionStatus = status?.status || "PENDING";
        const past = isPastDue(assignment.dueDate);

        console.log(`[StudentAssignmentList] Assignment "${assignment.title}":`, {
            id: assignment.id,
            filter,
            submissionStatus,
            isPastDue: past,
            dueDate: assignment.dueDate,
            shouldShow: filter === "past-due" ? (past && submissionStatus === "PENDING") : (filter === "upcoming" ? (!past && submissionStatus === "PENDING") : (submissionStatus === "SUBMITTED" || submissionStatus === "LATE" || submissionStatus === "GRADED"))
        });

        if (filter === "upcoming") {
            return !past && submissionStatus === "PENDING";
        }

        if (filter === "past-due") {
            // Show past due assignments that are NOT yet submitted
            return past && submissionStatus === "PENDING";
        }

        if (filter === "completed") {
            return (
                submissionStatus === "SUBMITTED" ||
                submissionStatus === "LATE" ||
                submissionStatus === "GRADED"
            );
        }

        return false;
    });

    console.log(`[StudentAssignmentList] Filtered (${filter}): ${filteredAssignments.length} / ${allAssignments.length}`);

    // ─── Group assignments by session ──────────────────────────────────────────

    const groupedAssignments: Record<number, AssessmentListItemDto[]> = {};
    filteredAssignments.forEach((assignment) => {
        const session = assignment.session || 0;
        if (!groupedAssignments[session]) {
            groupedAssignments[session] = [];
        }
        groupedAssignments[session].push(assignment);
    });

    const sessions = Object.keys(groupedAssignments)
        .map(Number)
        .sort((a, b) => a - b);

    // ─── Loading ──────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                {[1, 2].map((i) => (
                    <div key={i} className="space-y-3">
                        <div className="h-5 w-32 bg-slate-200 rounded" />
                        {[1, 2].map((j) => (
                            <div key={j} className="h-24 bg-slate-100 rounded-lg" />
                        ))}
                    </div>
                ))}
            </div>
        );
    }

    // ─── Error ────────────────────────────────────────────────────────────────

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 text-sm">{error}</p>
                <button
                    className="mt-2 text-slate-600 text-sm underline"
                    onClick={load}
                >
                    Retry
                </button>
            </div>
        );
    }

    // ─── Empty state ──────────────────────────────────────────────────────────

    if (sessions.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500">
                {filter === "upcoming" && (
                    <>
                        <p className="text-sm font-medium">No upcoming assignments.</p>
                        <p className="text-xs mt-1 text-slate-400">
                            No uncompleted assignments with future due dates.
                        </p>
                    </>
                )}
                {filter === "past-due" && (
                    <>
                        <p className="text-sm font-medium">No past due assignments.</p>
                        <p className="text-xs mt-1 text-slate-400">
                            No assignments with passed due dates.
                        </p>
                    </>
                )}
                {filter === "completed" && (
                    <>
                        <p className="text-sm font-medium">No completed assignments yet.</p>
                        <p className="text-xs mt-1 text-slate-400">
                            Submitted assignments will appear here.
                        </p>
                    </>
                )}
            </div>
        );
    }

    // ─── Render grouped assignments ────────────────────────────────────────────

    return (
        <div className="space-y-8">
            {sessions.map((session) => {
                const assignmentsInSession = groupedAssignments[session] || [];

                return (
                    <div key={session}>
                        {/* Session Header */}
                        <div className="mb-4 flex items-center gap-3">
                            <h3 className="text-base font-semibold text-slate-900">
                                Session {session}
                            </h3>
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                                {assignmentsInSession.length}
                            </span>
                        </div>

                        {/* Assignments in Session */}
                        <div className="space-y-3">
                            {assignmentsInSession.map((assignment) => {
                                const submissionStatus =
                                    statusMap.get(assignment.id);
                                const badge = getSubmissionStatusBadge(
                                    submissionStatus?.status,
                                    submissionStatus?.grade ?? undefined
                                );
                                const IconComponent = badge.icon;
                                const past = isPastDue(assignment.dueDate);

                                return (
                                    <div
                                        key={assignment.id}
                                        onClick={() =>
                                            navigate(
                                                `/assignment/${assignment.id}`
                                            )
                                        }
                                        className="group cursor-pointer bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-md transition-all duration-200"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            {/* Left: Title & Meta */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                                    {assignment.title}
                                                </h4>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {new Date(
                                                        assignment.dueDate
                                                    ).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year:
                                                            new Date(
                                                                assignment.dueDate
                                                            ).getFullYear() !==
                                                                new Date().getFullYear()
                                                                ? "numeric"
                                                                : undefined,
                                                    })}
                                                    {" · "}
                                                    {new Date(
                                                        assignment.dueDate
                                                    ).toLocaleTimeString("en-US", {
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                        hour12: true,
                                                    })}
                                                </p>
                                            </div>

                                            {/* Right: Status Badge + Past Due */}
                                            <div className="flex items-center gap-2">
                                                {past && (
                                                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                                                        Past due
                                                    </span>
                                                )}
                                                <div
                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium whitespace-nowrap ${badge.color}`}
                                                >
                                                    <IconComponent className="w-3.5 h-3.5" />
                                                    {badge.label}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
