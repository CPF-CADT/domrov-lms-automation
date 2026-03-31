"use client";
import { useState, useEffect } from "react";
import { Loader2, FileText, AlertCircle } from "lucide-react";
import assessmentService from "@/services/assessmentService";
import submissionService from "@/services/submissionService";
import classService from "@/services/classService";
import type { AssessmentListItemDto } from "@/types/assessment";
import type { IndividualRosterItemDto, TeamRosterItemDto, AssessmentStatsResponseDto } from "@/types/submission";

interface TeacherGradesTabProps {
    classId: string;
}

type RosterItem = IndividualRosterItemDto | TeamRosterItemDto;

const TeacherGradesTab = ({ classId }: TeacherGradesTabProps) => {
    const [assessments, setAssessments] = useState<AssessmentListItemDto[]>([]);
    const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);
    const [roster, setRoster] = useState<RosterItem[]>([]);
    const [stats, setStats] = useState<AssessmentStatsResponseDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [rosterLoading, setRosterLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAssessments = async () => {
            if (!classId) {
                console.warn("TeacherGradesTab: No classId provided");
                setLoading(false);
                return;
            }
            2
            setLoading(true);
            setError(null);
            try {
                const classIdNum = Number(classId);
                if (isNaN(classIdNum)) {
                    throw new Error("Invalid classId");
                }
                const data = await assessmentService.getAssessmentsByClass(classIdNum);
                setAssessments(data || []);
                // Auto-select first published assessment
                const publishedAssessments = (data || []).filter(a => a.isPublic);
                if (publishedAssessments.length > 0) {
                    setSelectedAssessmentId(publishedAssessments[0].id);
                } else if ((data || []).length > 0) {
                    // If no published, select first one (will show helpful message)
                    setSelectedAssessmentId(data[0].id);
                }
            } catch (err: any) {
                console.error("Failed to fetch assessments:", err);
                setError("Failed to load assessments. Please check your connection and try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchAssessments();
    }, [classId]);

    useEffect(() => {
        const fetchRosterAndStats = async () => {
            if (!selectedAssessmentId) return;

            setRosterLoading(true);
            setError(null);
            try {
                // Fetch student roster, stats, and all class students
                const [submissionRosterData, statsData, classStudentsData] = await Promise.all([
                    submissionService.getSubmissionRoster(selectedAssessmentId),
                    submissionService.getSubmissionStats(selectedAssessmentId),
                    classService.getClassStudents(Number(classId)),
                ]);

                // Create a map of submissions by user ID for quick lookup
                const submissionMap = new Map<number, (TeamRosterItemDto | IndividualRosterItemDto)>();
                submissionRosterData.forEach((item) => {
                    if (item.type === "INDIVIDUAL") {
                        const userItem = item as any as IndividualRosterItemDto;
                        submissionMap.set(userItem.userId, item);
                    }
                });

                // Build complete roster with all students
                const completeRoster: (TeamRosterItemDto | IndividualRosterItemDto)[] = [];

                const membersList = Array.isArray(classStudentsData) ? classStudentsData : [];
                membersList.forEach((member: any) => {
                    // Create roster items for all students
                    const submission = submissionMap.get(member.id);

                    if (submission) {
                        // Student has a submission, use it
                        completeRoster.push(submission);
                    } else {
                        // Student has no submission yet, create a roster item
                        const noSubmissionItem: IndividualRosterItemDto = {
                            type: "INDIVIDUAL",
                            userId: member.id,
                            fullName: `${member.firstName} ${member.lastName}`,
                            profileUrl: member.profilePictureUrl || null,
                            status: "NOT_SUBMITTED",
                            submissionId: null,
                            score: null,
                        };
                        completeRoster.push(noSubmissionItem);
                    }
                });

                setRoster(completeRoster);
                setStats(statsData);
            } catch (err: any) {
                console.error("Failed to fetch roster/stats:", err);
                setError("Failed to load submission data");
            } finally {
                setRosterLoading(false);
            }
        };

        fetchRosterAndStats();
    }, [selectedAssessmentId, assessments, classId]);

    const getStatusBadge = (status: string) => {
        switch (status?.toUpperCase()) {
            case "GRADED":
                return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">Graded</span>;
            case "EVALUATED":
                return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">Evaluated</span>;
            case "SUBMITTED":
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">Submitted</span>;
            case "NOT_SUBMITTED":
                return <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded">Not Submitted</span>;
            default:
                return <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded">{status}</span>;
        }
    };

    const getStudentName = (item: RosterItem): string => {
        if (item.type === "INDIVIDUAL") {
            const indItem = item as any as IndividualRosterItemDto;
            return indItem.fullName || "Unknown Student";
        } else {
            const teamItem = item as any as TeamRosterItemDto;
            return teamItem.name || "Unknown Team";
        }
    };

    const formatScore = (score: number | null, maxScore?: number): string => {
        if (score === null) return "--";
        return maxScore ? `${score}/${maxScore}` : String(score);
    };

    const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-slate-600">Loading assessments...</span>
            </div>
        );
    }

    if (!classId) {
        return (
            <div className="p-6 max-w-6xl mx-auto">
                <div className="bg-red-50 rounded-lg border border-red-200 p-6 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-red-900">Error: No Class Found</p>
                        <p className="text-sm text-red-800">Unable to load grading dashboard. Please go back and select a class.</p>
                    </div>
                </div>
            </div>
        );
    }

    const publishedAssessments = assessments.filter(a => a.isPublic);
    const draftAssessments = assessments.filter(a => !a.isPublic);

    if (assessments.length === 0 && error) {
        return (
            <div className="p-6 max-w-6xl mx-auto">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-900 mb-1">Error Loading Assignments</p>
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (assessments.length === 0) {
        return (
            <div className="p-6 max-w-6xl mx-auto">
                <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-slate-900 mb-2">No Assignments Yet</h2>
                    <p className="text-slate-600">Create assignments to start grading student submissions.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Grade Management</h2>
                <p className="text-slate-600 text-sm mb-4">View and manage student grades across your assignments.</p>

                {/* Assessment Selector */}
                <div className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-700">Select Assignment</label>
                    <select
                        value={selectedAssessmentId || ""}
                        onChange={(e) => setSelectedAssessmentId(Number(e.target.value))}
                        className="w-full max-w-md px-4 py-2.5 text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white hover:border-slate-400 transition-colors"
                    >
                        {publishedAssessments.length > 0 && (
                            <>
                                <optgroup label="📋 Published Assignments">
                                    {publishedAssessments.map((assessment) => (
                                        <option key={assessment.id} value={assessment.id}>
                                            {assessment.title} ({assessment.maxScore} pts)
                                        </option>
                                    ))}
                                </optgroup>
                            </>
                        )}
                        {draftAssessments.length > 0 && (
                            <>
                                <optgroup label="📝 Draft Assignments (Not yet published)">
                                    {draftAssessments.map((assessment) => (
                                        <option key={assessment.id} value={assessment.id}>
                                            {assessment.title} ({assessment.maxScore} pts) - DRAFT
                                        </option>
                                    ))}
                                </optgroup>
                            </>
                        )}
                    </select>
                    {publishedAssessments.length === 0 && draftAssessments.length > 0 && (
                        <p className="text-xs text-amber-600">💡 Publish an assignment first to start grading submissions.</p>
                    )}
                </div>
            </div>

            {/* Draft Assignment Warning */}
            {selectedAssessment && !selectedAssessment.isPublic && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-amber-900 mb-1">Draft Assignment</p>
                        <p className="text-sm text-amber-800">This assignment hasn't been published yet. Students cannot see it or submit work. Publish it in the <strong>Assignment</strong> tab when ready.</p>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <p className="text-sm text-slate-600 mb-1">Class Average</p>
                        <p className="text-2xl font-bold text-slate-900">
                            {stats.averageScore !== null && stats.averageScore !== undefined ? stats.averageScore.toFixed(1) : "--"}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <p className="text-sm text-slate-600 mb-1">Total Submissions</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.totalSubmissions ?? 0}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <p className="text-sm text-slate-600 mb-1">Graded</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.gradedSubmissions ?? 0}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <p className="text-sm text-slate-600 mb-1">Pending</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.pendingSubmissions ?? 0}</p>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Roster Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-900">Student Submissions</h3>
                </div>

                {rosterLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-slate-600">Loading submissions...</span>
                    </div>
                ) : roster.length === 0 ? (
                    <div className="px-6 py-12 text-center text-slate-600">
                        <p>No submissions yet for this assignment.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase min-w-[200px]">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Score</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roster.map((item, idx) => (
                                    <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900 min-w-[200px]" title={getStudentName(item)}>
                                            {getStudentName(item)}
                                        </td>
                                        <td className="px-6 py-4 text-sm">{getStatusBadge(item.status)}</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                                            {formatScore(item.score, selectedAssessment?.maxScore)}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {item.submissionId ? (
                                                <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200 transition-colors">
                                                    Grade
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-500">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherGradesTab;
