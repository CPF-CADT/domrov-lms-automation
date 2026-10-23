"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, ChevronUp, ChevronDown, RefreshCw, Sparkles, CheckCircle2, Download } from "lucide-react";
import assessmentService from "@/services/AssessmentService";
import submissionService from "@/services/SubmissionService";
import fileService from "@/services/FileService";
import { useToast } from "@/components/Toast";
import type { AssessmentListItemDto, TeamTrackingItemDto, IndividualTrackingItemDto } from "@/types/Assessment";
import type { TeamRosterItemDto, IndividualRosterItemDto, SubmissionViewerResponseDto } from "@/types/Submission";
import SubmissionCodeViewer from "./SubmissionCodeViewer";

interface GradeStudentsDetailProps {
    assignmentId: number | string;
    onBack: () => void;
}

type TrackingItem = TeamTrackingItemDto | IndividualTrackingItemDto;
type RosterItem = TeamRosterItemDto | IndividualRosterItemDto;

export default function GradeStudentsDetail({ assignmentId, onBack }: GradeStudentsDetailProps) {
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [assignment, setAssignment] = useState<AssessmentListItemDto | null>(null);
    const [trackingData, setTrackingData] = useState<TrackingItem[]>([]);
    const [rosterData, setRosterData] = useState<RosterItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<"name" | "score">("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [searchTerm, setSearchTerm] = useState("");
    const selectedStudentParam = searchParams.get("studentId");
    const selectedStudentId = selectedStudentParam ? Number(selectedStudentParam) : null;
    const [submissionDetail, setSubmissionDetail] = useState<SubmissionViewerResponseDto | null>(null);
    const [submissionLoading, setSubmissionLoading] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [manualScore, setManualScore] = useState<number>(0);
    const [manualFeedback, setManualFeedback] = useState<string>("");
    const [isDownloading, setIsDownloading] = useState(false);

    const setSelectedStudentId = (studentId: number | null) => {
        const next = new URLSearchParams(searchParams);
        if (studentId === null) next.delete("studentId");
        else next.set("studentId", String(studentId));
        setSearchParams(next);
    };

    const fetchData = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError(null);

            const [details, tracking, roster] = await Promise.all([
                assessmentService.getAssessmentDetails(Number(assignmentId)),
                assessmentService.getAssessmentTracking(Number(assignmentId)),
                submissionService.getSubmissionRoster(Number(assignmentId)),
            ]);

            setAssignment(details);
            setTrackingData(Array.isArray(tracking) ? tracking : []);
            setRosterData(Array.isArray(roster) ? roster : []);
        } catch (err) {
            setError("Failed to load grading data.");
        } finally {
            if (isRefresh) setRefreshing(false);
            else setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Removed auto-refresh to prevent UI from resetting while typing
    }, [assignmentId]);

    // Load submission details when student is selected
    useEffect(() => {
        if (selectedStudentId === null) {
            setSubmissionDetail(null);
            return;
        }

        const rosterItem = rosterData.find(item => {
            const id = "userId" in item ? item.userId : item.id;
            return id === selectedStudentId;
        });

        if (!rosterItem?.submissionId) {
            setSubmissionDetail(null);
            return;
        }

        let cancelled = false;
        setSubmissionLoading(true);

        submissionService
            .getSubmissionDetailsTeacher(rosterItem.submissionId)
            .then((data) => {
                if (!cancelled) setSubmissionDetail(data);
            })
            .catch(() => {
                if (!cancelled) setSubmissionDetail(null);
            })
            .finally(() => {
                if (!cancelled) setSubmissionLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [selectedStudentId, rosterData]);

    useEffect(() => {
        if (submissionDetail?.evaluation) {
            setManualScore(submissionDetail.evaluation.score);
            setManualFeedback(submissionDetail.evaluation.feedback || "");
        } else {
            setManualScore(0);
            setManualFeedback("");
        }
    }, [submissionDetail]);

    const filteredData = trackingData.filter((item) => {
        const name = "studentId" in item ? item.name : item.name;
        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const sortedData = [...filteredData].sort((a, b) => {
        let aVal: string | number;
        let bVal: string | number;

        if (sortBy === "name") {
            aVal = "studentId" in a ? a.name : a.name;
            bVal = "studentId" in b ? b.name : b.name;
        } else {
            aVal = a.score ?? -1;
            bVal = b.score ?? -1;
        }

        if (typeof aVal === "string" && typeof bVal === "string") {
            return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }

        return sortOrder === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case "GRADED":
                return "bg-green-100 text-green-700";
            case "SUBMITTED":
                return "bg-blue-100 text-blue-700";
            case "PENDING":
            case "pending":
                return "bg-orange-100 text-orange-700";
            case "NOT_SUBMITTED":
                return "bg-slate-100 text-slate-700";
            default:
                return "bg-slate-100 text-slate-700";
        }
    };

    const getStatusLabel = (status: string) => {
        if (status === "NOT_SUBMITTED") {
            return "Not Submitted Yet";
        }
        if (status === "PENDING" || status === "pending") {
            return "Pending Evaluation";
        }
        return status.replace(/_/g, " ");
    };

    const setRefreshCurrent = () => {
        if (selectedStudentId === null) return;
        const rosterItem = rosterData.find(item => {
            const id = "userId" in item ? item.userId : item.id;
            return id === selectedStudentId;
        });
        if (rosterItem?.submissionId) {
            setSubmissionLoading(true);
            submissionService
                .getSubmissionDetailsTeacher(rosterItem.submissionId)
                .then((data) => {
                    setSubmissionDetail(data);
                    if (data.evaluation) {
                        setManualScore(data.evaluation.score);
                        setManualFeedback(data.evaluation.feedback || "");
                    } else {
                        setManualScore(0);
                        setManualFeedback("");
                    }
                })
                .finally(() => setSubmissionLoading(false));
        }
    };

    const handleSaveGrade = async () => {
        try {
            if (submissionDetail?.evaluation?.isApproved) {
                showToast("Approved evaluations cannot be edited.", "error");
                return;
            }

            const rosterItem = rosterData.find(item => {
                const id = "userId" in item ? item.userId : item.id;
                return id === selectedStudentId;
            });

            if (!rosterItem || !rosterItem.submissionId) {
                showToast("Could not find submission.", "error");
                return;
            }

            if (manualScore < 0 || (assignment && manualScore > assignment.maxScore)) {
                showToast(`Score must be between 0 and ${assignment?.maxScore}`, "error");
                return;
            }

            setIsApproving(true);

            await submissionService.gradeSubmission(rosterItem.submissionId, {
                score: manualScore,
                feedback: manualFeedback
            });

            showToast("✅ Score updated successfully!", "success");
            setRefreshCurrent();
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || "Failed to update score";
            showToast(message, "error");
        } finally {
            setIsApproving(false);
        }
    };

    const handleApproveSubmission = async () => {
        try {
            if (!submissionDetail || selectedStudentId === null) {
                showToast("No submission details loaded. Please try again.", "error");
                return;
            }

            const rosterItem = rosterData.find(item => {
                const id = "userId" in item ? item.userId : item.id;
                return id === selectedStudentId;
            });

            if (!rosterItem || !rosterItem.submissionId) {
                showToast("Could not find submission. Please try again.", "error");
                return;
            }

            setIsApproving(true);
            await submissionService.approveSubmission(rosterItem.submissionId);

            showToast("✅ Grades posted to student successfully!", "success");
            setRefreshCurrent();
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || "Failed to approve submission";
            showToast(message, "error");
        } finally {
            setIsApproving(false);
        }
    };

    const handleDownloadSubmission = async (submissionId: number) => {
        try {
            setIsDownloading(true);
            const blob = await fileService.downloadSubmissionArchive(submissionId);
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = submissionDetail?.resources.find((item) => item.resource?.type !== "URL")?.resource?.title || `submission-${submissionId}.zip`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            showToast(err?.response?.data?.message || "Could not download the submitted archive.", "error");
        } finally {
            setIsDownloading(false);
        }
    };

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
            <div className="w-full p-5">
                <BackButton />
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-sm text-slate-500">Loading grading data...</span>
                </div>
            </div>
        );
    }

    if (error || !assignment) {
        return (
            <div className="w-full p-5">
                <BackButton />
                <p className="text-red-500 text-sm text-center py-8">{error ?? "Assignment not found."}</p>
            </div>
        );
    }

    // Show submission detail view when student is selected
    if (selectedStudentId !== null) {
        const selectedItem = trackingData.find(item => {
            const id = "studentId" in item ? item.studentId : item.teamId;
            return id === selectedStudentId;
        });

        const currentEvaluation = submissionDetail?.evaluation;
        const hasEvaluation = Boolean(currentEvaluation);
        const isApproved = submissionDetail?.evaluation?.isApproved;
        const selectedRosterItem = rosterData.find(item => {
            const id = "userId" in item ? item.userId : item.id;
            return id === selectedStudentId;
        });
        const selectedSubmissionId = selectedRosterItem?.submissionId ?? submissionDetail?.id;

        return (
            <div className="min-h-full bg-slate-50">
                {/* Evaluation Workflow Header */}
                <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
                    <div className="mx-auto w-full max-w-[1440px] px-4 py-3">
                        <button
                            onClick={() => {
                                setSelectedStudentId(null);
                                setSubmissionDetail(null);
                            }}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 text-sm transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Grades
                        </button>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">{selectedItem?.name || "Student"}</h1>
                                <p className="text-sm text-slate-600">{assignment.title}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-medium text-slate-500 uppercase mb-1">Current Score</p>
                                <p className="text-3xl font-bold text-slate-900">{submissionDetail?.evaluation?.score ?? selectedItem?.score ?? "—"}/{assignment.maxScore}</p>
                            </div>
                        </div>

                        {/* Evaluation Workflow Steps */}
                        <div className="flex items-center justify-between mt-6">
                            <div className="flex items-center gap-6">
                                {/* Step 1: Submitted */}
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-semibold">✓</div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-600">Submitted</p>
                                        <p className="text-xs text-slate-500">Code received</p>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="flex-1 h-0.5 bg-gradient-to-r from-green-100 to-blue-100 max-w-20"></div>

                                {/* Step 2: AI Evaluated */}
                                <div className="flex items-center gap-2">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold ${hasEvaluation ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                                        {hasEvaluation ? <Sparkles className="w-4 h-4" /> : '○'}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-600">{submissionDetail?.evaluation?.evaluationType === 'AI' ? 'AI Evaluated' : 'Teacher Evaluated'}</p>
                                        <p className="text-xs text-slate-500">{hasEvaluation ? 'Feedback ready' : 'Pending...'}</p>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className={`flex-1 h-0.5 max-w-20 ${hasEvaluation ? 'bg-gradient-to-r from-blue-100 to-amber-100' : 'bg-slate-200'}`}></div>

                                {/* Step 3: Review & Approve */}
                                <div className="flex items-center gap-2">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold ${isApproved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {isApproved ? <CheckCircle2 className="w-4 h-4" /> : '○'}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-600">Approved</p>
                                        <p className="text-xs text-slate-500">{isApproved ? 'Visible to student' : 'Pending approval'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="mx-auto w-full max-w-[1440px] px-4 py-4">
                    {submissionLoading ? (
                        <div className="flex items-center justify-center py-20 bg-white rounded-lg border border-slate-200">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                            <span className="text-slate-600">Loading submission...</span>
                        </div>
                    ) : (
                        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                            {/* Submitted code stays in the primary workspace. */}
                            <main className="min-w-0 space-y-4">
                                <div className="bg-white rounded-xl border border-slate-200 p-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <h2 className="text-base font-semibold text-slate-900">Submitted Code</h2>
                                        {selectedSubmissionId ? <button type="button" onClick={() => handleDownloadSubmission(selectedSubmissionId)} disabled={isDownloading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" />{isDownloading ? "Downloading..." : "Download ZIP"}</button> : null}
                                    </div>
                                    {selectedSubmissionId ? (
                                        <SubmissionCodeViewer
                                            submissionId={selectedSubmissionId}
                                            feedbacks={submissionDetail?.evaluation?.feedbacks}
                                            canComment
                                            showFeedback
                                            onFeedbackChanged={setRefreshCurrent}
                                        />
                                    ) : (
                                        <p className="text-slate-600 text-sm">No code submitted yet.</p>
                                    )}
                                </div>

                                {/* Evaluation feedback */}
                                {hasEvaluation && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Sparkles className="w-5 h-5 text-blue-600" />
                                            <h3 className="text-lg font-semibold text-slate-900">{currentEvaluation?.evaluationType === 'AI' ? 'AI Feedback' : 'Teacher Feedback'}</h3>
                                            <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${currentEvaluation?.evaluationType === 'AI' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}>
                                                {currentEvaluation?.evaluationType || 'Manual'}
                                            </span>
                                        </div>
                                        <p className="text-slate-700 whitespace-pre-wrap">{currentEvaluation?.aiOutput || currentEvaluation?.feedback || 'No feedback provided'}</p>
                                    </div>
                                )}
                            </main>

                            {/* Evaluation summary and actions */}
                            <aside className="space-y-4 lg:sticky lg:top-20">
                                {/* Evaluation score */}
                                {hasEvaluation && (
                                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Sparkles className="w-5 h-5 text-amber-500" />
                                            <h3 className="font-semibold text-slate-900">{currentEvaluation?.evaluationType === 'AI' ? 'AI Score' : 'Teacher Score'}</h3>
                                        </div>
                                        <div className="mb-4">
                                            <div className="text-4xl font-bold text-slate-900">{currentEvaluation?.score}</div>
                                            <p className="text-sm text-slate-600">out of {assignment.maxScore} points</p>
                                        </div>
                                        {currentEvaluation?.penaltyScore && currentEvaluation.penaltyScore > 0 && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-xs font-semibold text-red-700">Penalty: -{currentEvaluation.penaltyScore}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Status Card */}
                                <div className="bg-white rounded-xl border border-slate-200 p-4">
                                    <h3 className="font-semibold text-slate-900 mb-3 text-sm uppercase tracking-wider">Override Score</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Score (Max {assignment.maxScore})</label>
                                            <input
                                                type="number"
                                                value={manualScore}
                                                onChange={(e) => setManualScore(Number(e.target.value))}
                                                max={assignment.maxScore}
                                                min={0}
                                                disabled={submissionDetail?.evaluation?.isApproved || isApproving}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">General Feedback</label>
                                            <textarea
                                                value={manualFeedback}
                                                onChange={(e) => setManualFeedback(e.target.value)}
                                                placeholder="Enter overall feedback..."
                                                disabled={submissionDetail?.evaluation?.isApproved || isApproving}
                                                rows={4}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm resize-none"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSaveGrade}
                                        disabled={isApproving || Boolean(submissionDetail?.evaluation?.isApproved)}
                                        className="w-full px-4 py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
                                    >
                                        {isApproving ? 'Saving...' : 'Save Score Changes'}
                                    </button>
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-3">
                                    {!hasEvaluation && selectedItem?.status !== "NOT_SUBMITTED" && (
                                        <button
                                            onClick={setRefreshCurrent}
                                            disabled={isApproving}
                                            type="button"
                                            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            {isApproving ? 'Refreshing...' : 'Refresh Evaluation'}
                                        </button>
                                    )}
                                    {hasEvaluation && !isApproved && (
                                        <button
                                            onClick={handleApproveSubmission}
                                            disabled={isApproving}
                                            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            {isApproving ? 'Posting...' : 'Approve & Post to Student'}
                                        </button>
                                    )}
                                    {isApproved && (
                                        <div className="w-full px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-center">
                                            <p className="text-sm font-semibold text-green-700">✓ Posted to Student</p>
                                        </div>
                                    )}
                                </div>
                            </aside>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full p-5">
            <BackButton />

            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-1">{assignment.title}</h1>
                        <p className="text-sm text-slate-600">Max Score: {assignment.maxScore} points</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-slate-200">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase mb-1">Total Students</p>
                        <p className="text-sm font-semibold text-slate-900">
                            {trackingData.length}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase mb-1">Submitted</p>
                        <p className="text-sm font-semibold text-slate-900">
                            {trackingData.filter((item) => {
                                return item.status !== "NOT_SUBMITTED";
                            }).length}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase mb-1">Graded</p>
                        <p className="text-sm font-semibold text-slate-900">
                            {trackingData.filter((item) => {
                                return item.status === "GRADED";
                            }).length}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase mb-1">Average Score</p>
                        <p className="text-sm font-semibold text-slate-900">
                            {(() => {
                                const students = trackingData;
                                const gradedStudents = students.filter((item) => item.score !== null);
                                return students.length > 0 && gradedStudents.length > 0
                                    ? (
                                        gradedStudents.reduce((sum, item) => sum + (item.score ?? 0), 0) / gradedStudents.length
                                    ).toFixed(2)
                                    : "—";
                            })()}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-900">Student Grades</h2>
                        <button
                            onClick={() => fetchData(true)}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
                            title="Refresh grades (auto-refreshes every 10s)"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                        />
                    </div>
                </div>

                {sortedData.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-slate-500">No students to display.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-left">
                                        <button
                                            onClick={() => {
                                                if (sortBy === "name") {
                                                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                                } else {
                                                    setSortBy("name");
                                                    setSortOrder("asc");
                                                }
                                            }}
                                            className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase hover:text-slate-900"
                                        >
                                            Student Name
                                            {sortBy === "name" && (sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">ID</th>
                                    <th className="px-6 py-4 text-left">
                                        <button
                                            onClick={() => {
                                                if (sortBy === "score") {
                                                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                                } else {
                                                    setSortBy("score");
                                                    setSortOrder("desc");
                                                }
                                            }}
                                            className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase hover:text-slate-900"
                                        >
                                            Score
                                            {sortBy === "score" && (sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.map((item) => {
                                    const studentId = "studentId" in item ? item.studentId : item.teamId;
                                    const isSubmitted = item.status !== "NOT_SUBMITTED";

                                    return (
                                        <tr
                                            key={studentId}
                                            onClick={() => isSubmitted && setSelectedStudentId(studentId)}
                                            className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${isSubmitted ? "cursor-pointer" : ""}`}
                                        >
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-slate-900">{item.name}</p>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 text-sm">
                                                {studentId}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-900">
                                                    {item.score !== null ? `${item.score}/${assignment.maxScore}` : "—"}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status)}`}>
                                                    {getStatusLabel(item.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
