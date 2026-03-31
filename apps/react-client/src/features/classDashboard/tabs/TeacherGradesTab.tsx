"use client";
import { useState, useEffect } from "react";
import { Loader2, FileText, AlertCircle, X, BookOpen, Search, Filter, RotateCcw, Sparkles, CheckCircle2, FileClock } from "lucide-react";
import assessmentService from "@/services/assessmentService";
import submissionService from "@/services/submissionService";
import type { AssessmentListItemDto } from "@/types/assessment";
import type { IndividualRosterItemDto, TeamRosterItemDto } from "@/types/submission";

interface TeacherGradesTabProps {
    classId: string;
}

type RosterItem = IndividualRosterItemDto | TeamRosterItemDto;

interface GradeFormData {
    score: string;
    feedback: string;
}

interface TeacherStatsSummary {
    averageScore: number | null;
    totalSubmissions: number;
    gradedSubmissions: number;
    pendingSubmissions: number;
}

interface LocalManualGrade {
    score: number;
    feedback?: string;
}

const TeacherGradesTab = ({ classId }: TeacherGradesTabProps) => {
    const [assessments, setAssessments] = useState<AssessmentListItemDto[]>([]);
    const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);
    const [roster, setRoster] = useState<RosterItem[]>([]);
    const [stats, setStats] = useState<TeacherStatsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [rosterLoading, setRosterLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<RosterItem | null>(null);
    const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);
    const [isPublishingAI, setIsPublishingAI] = useState(false);
    const [modalMessage, setModalMessage] = useState<string | null>(null);
    const [gradeFormData, setGradeFormData] = useState<GradeFormData>({
        score: "",
        feedback: "",
    });
    const [assignmentSearch, setAssignmentSearch] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [studentSearch, setStudentSearch] = useState<string>("");
    // Cache for saved scores - key is submissionId, value is score
    const [gradeCache, setGradeCache] = useState<Map<number, number>>(new Map());
    const [manualGradeCache, setManualGradeCache] = useState<Map<string, LocalManualGrade>>(new Map());

    useEffect(() => {
        const fetchAssessments = async () => {
            if (!classId) {
                console.warn("TeacherGradesTab: No classId provided");
                setLoading(false);
                return;
            }

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

                // Load cached grades from localStorage
                try {
                    const cachedGrades = localStorage.getItem(`gradeCache_${classIdNum}`);
                    if (cachedGrades) {
                        const parsed = JSON.parse(cachedGrades);
                        const newCache = new Map(Object.entries(parsed).map(([k, v]) => [Number(k), v as number]));
                        setGradeCache(newCache);
                        console.log("[INIT] Loaded grades from localStorage:", parsed, "Map entries:", Array.from(newCache.entries()));
                    } else {
                        console.log("[INIT] No cached grades found in localStorage for classId:", classIdNum);
                    }
                } catch (e) {
                    console.error("Failed to load grades from localStorage:", e);
                }

                try {
                    const cachedManualGrades = localStorage.getItem(`manualGradeCache_${classIdNum}`);
                    if (cachedManualGrades) {
                        const parsed = JSON.parse(cachedManualGrades) as Record<string, LocalManualGrade>;
                        const cache = new Map<string, LocalManualGrade>(Object.entries(parsed));
                        setManualGradeCache(cache);
                    }
                } catch (e) {
                    console.error("Failed to load manual grades from localStorage:", e);
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

    const normalizeRosterItem = (item: any): RosterItem => {
        let score = item.score ?? item.evaluation?.score ?? null;

        // Get submissionId for cache lookup (store in variable for consistent access)
        const submissionId = item.submissionId ?? null;

        // If backend didn't return score but we have it cached, use the cached value
        if (score === null && submissionId) {
            const hasCached = gradeCache.has(submissionId);
            if (hasCached) {
                score = gradeCache.get(submissionId) || null;
                console.log(`[CACHE HIT] Using cached score for submissionId ${submissionId}: ${score}`);
            } else {
                console.log(`[CACHE MISS] submissionId ${submissionId} not in cache. Cache keys: ${Array.from(gradeCache.keys()).join(', ')}`);
            }
        }

        if (item.type === "TEAM") {
            console.log(`[TEAM] ${item.name}: score=${score}, submissionId=${submissionId}, status=${item.status}, cached=${gradeCache.has(submissionId)}`);
            return {
                type: "TEAM",
                id: item.id,
                name: item.name || "Unknown Team",
                members: item.members || [],
                status: item.status || "NOT_SUBMITTED",
                submissionId: submissionId,
                score: score,
                aiScore: item.aiScore ?? item.evaluation?.score ?? null,
                aiFeedback: item.aiFeedback ?? item.evaluation?.feedback ?? item.feedback ?? null,
                isApproved: item.isApproved ?? item.evaluation?.isApproved ?? false,
            } as TeamRosterItemDto;
        }

        // Map backend field names to frontend types
        // Backend returns: id, name, email, profileUrl
        // Frontend expects: userId, fullName, profileUrl
        const fullName = item.fullName || item.name || "Unknown Student";
        const userId = item.userId ?? item.id;
        const manualGradeKey = `${selectedAssessmentId ?? 0}:${userId}`;
        const manualGrade = manualGradeCache.get(manualGradeKey);

        if (score === null && !submissionId && manualGrade) {
            score = manualGrade.score;
        }

        const resolvedStatus = manualGrade && (item.status || "NOT_SUBMITTED") === "NOT_SUBMITTED"
            ? "GRADED"
            : item.status || "NOT_SUBMITTED";

        console.log(`[INDIVIDUAL] ${fullName}: score=${score}, submissionId=${submissionId}, status=${item.status}, cached=${gradeCache.has(submissionId)}`);
        return {
            type: "INDIVIDUAL",
            userId: userId,
            fullName: fullName,
            profileUrl: item.profileUrl || null,
            status: resolvedStatus,
            submissionId: submissionId,
            score: score,
            aiScore: item.aiScore ?? item.evaluation?.score ?? null,
            aiFeedback: item.aiFeedback ?? item.evaluation?.feedback ?? item.feedback ?? null,
            isApproved: item.isApproved ?? item.evaluation?.isApproved ?? false,
        } as IndividualRosterItemDto;
    };

    const deriveStatsFromRoster = (items: RosterItem[]): TeacherStatsSummary => {
        const submittedItems = items.filter((item) => item.status !== "NOT_SUBMITTED");
        const gradedItems = submittedItems.filter((item) => item.status === "GRADED" || item.status === "EVALUATED" || item.score !== null);
        const gradedScores = gradedItems
            .map((item) => item.score)
            .filter((score): score is number => score !== null && score !== undefined && Number.isFinite(score));

        const averageScore = gradedScores.length > 0
            ? gradedScores.reduce((sum, score) => sum + score, 0) / gradedScores.length
            : null;

        return {
            averageScore,
            totalSubmissions: submittedItems.length,
            gradedSubmissions: gradedItems.length,
            pendingSubmissions: Math.max(submittedItems.length - gradedItems.length, 0),
        };
    };

    const normalizeStats = (rawStats: any, normalizedRoster: RosterItem[]): TeacherStatsSummary => {
        const fallback = deriveStatsFromRoster(normalizedRoster);

        const parsedAverage = Number(rawStats?.averageScore);
        const averageScore = Number.isFinite(parsedAverage) ? parsedAverage : fallback.averageScore;

        const parsedTotalSubmissions = Number(rawStats?.totalSubmissions ?? rawStats?.submittedCount);
        const parsedGradedSubmissions = Number(rawStats?.gradedSubmissions ?? rawStats?.gradedCount);
        const parsedPendingSubmissions = Number(rawStats?.pendingSubmissions);
        const parsedPendingCount = Number(rawStats?.pendingCount);

        return {
            averageScore,
            totalSubmissions: Number.isFinite(parsedTotalSubmissions) ? parsedTotalSubmissions : fallback.totalSubmissions,
            gradedSubmissions: Number.isFinite(parsedGradedSubmissions) ? parsedGradedSubmissions : fallback.gradedSubmissions,
            pendingSubmissions: Number.isFinite(parsedPendingSubmissions)
                ? parsedPendingSubmissions
                : Number.isFinite(parsedPendingCount)
                    ? parsedPendingCount
                    : fallback.pendingSubmissions,
        };
    };

    const fetchRosterAndStats = async (withLoading = true) => {
        if (!selectedAssessmentId) return;

        if (withLoading) {
            setRosterLoading(true);
        }
        setError(null);
        try {
            console.log("[FETCH ROSTER] Current gradeCache:", Array.from(gradeCache.entries()));

            const [submissionRosterData, statsData] = await Promise.all([
                submissionService.getSubmissionRoster(selectedAssessmentId),
                submissionService.getSubmissionStats(selectedAssessmentId),
            ]);

            console.log("Raw roster data from backend:", submissionRosterData);

            const normalizedRoster = (submissionRosterData || []).map(normalizeRosterItem);
            console.log("Normalized roster:", normalizedRoster);
            const normalizedStats = normalizeStats(statsData, normalizedRoster);
            console.log("Normalized stats:", normalizedStats, "Raw stats:", statsData);

            setRoster(normalizedRoster);
            setStats(normalizedStats);
        } catch (err: any) {
            console.error("Failed to fetch roster/stats:", err);
            setError("Failed to load submission data");
        } finally {
            if (withLoading) {
                setRosterLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchRosterAndStats();
    }, [selectedAssessmentId, assessments]);

    useEffect(() => {
        if (!selectedAssessmentId) return;

        const interval = window.setInterval(() => {
            if (!isGradeModalOpen && !isSubmittingGrade) {
                fetchRosterAndStats(false);
            }
        }, 10000);

        return () => window.clearInterval(interval);
    }, [selectedAssessmentId, isGradeModalOpen, isSubmittingGrade, gradeCache]);

    // Persist grade cache to localStorage whenever it changes
    useEffect(() => {
        if (classId && gradeCache.size > 0) {
            const cacheObj = Object.fromEntries(gradeCache);
            localStorage.setItem(`gradeCache_${classId}`, JSON.stringify(cacheObj));
            console.log("[CACHE PERSIST] Saved grades to localStorage:", cacheObj);
        }
    }, [gradeCache, classId]);

    useEffect(() => {
        if (classId && manualGradeCache.size > 0) {
            const cacheObj = Object.fromEntries(manualGradeCache);
            localStorage.setItem(`manualGradeCache_${classId}`, JSON.stringify(cacheObj));
        }
    }, [manualGradeCache, classId]);

    const getDerivedStatus = (item: RosterItem): string => {
        const baseStatus = (item.status || "").toUpperCase();
        const isApproved = Boolean((item as any).isApproved ?? (item as any).evaluation?.isApproved);
        const hasAIResult = baseStatus === "EVALUATED" || getAIRecommendedScore(item) !== null || getAIRecommendedFeedback(item).trim().length > 0;

        if (isApproved) return "PUBLISHED";
        if (hasAIResult && (baseStatus === "SUBMITTED" || baseStatus === "RESUBMITTED" || baseStatus === "LATE" || baseStatus === "EVALUATED")) {
            return "AI_EVALUATED";
        }
        if (!hasAIResult && (baseStatus === "SUBMITTED" || baseStatus === "RESUBMITTED" || baseStatus === "LATE")) {
            return "AI_PENDING";
        }
        return baseStatus || "NOT_SUBMITTED";
    };

    const getStatusBadge = (item: RosterItem) => {
        switch (getDerivedStatus(item)) {
            case "PUBLISHED":
                return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded">Published</span>;
            case "AI_EVALUATED":
                return <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded">AI Evaluated</span>;
            case "AI_PENDING":
                return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded">Submitted (AI Pending)</span>;
            case "GRADED":
                return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">Graded</span>;
            case "EVALUATED":
                return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">Evaluated</span>;
            case "SUBMITTED":
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">Submitted</span>;
            case "RESUBMITTED":
                return <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded">Resubmitted</span>;
            case "LATE":
                return <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs font-semibold rounded">Late</span>;
            case "NOT_SUBMITTED":
                return <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded">Not Submitted</span>;
            default:
                return <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded">{item.status}</span>;
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
        if (score === null || score === undefined) return "--";
        const scoreValue = typeof score === "string" ? parseFloat(score) : score;
        if (isNaN(scoreValue)) return "--";
        return maxScore ? `${scoreValue}/${maxScore}` : String(scoreValue);
    };

    const getAIRecommendedScore = (item: RosterItem): number | null => {
        const raw = (item as any).aiScore ?? (item as any).evaluation?.score ?? item.score;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const getAIRecommendedFeedback = (item: RosterItem): string => {
        const raw = (item as any).aiFeedback ?? (item as any).evaluation?.feedback ?? (item as any).feedback;
        return typeof raw === "string" ? raw : "";
    };

    const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId);

    const openGradeModal = (student: RosterItem) => {
        const aiScore = getAIRecommendedScore(student);
        const aiFeedback = getAIRecommendedFeedback(student);
        setSelectedStudent(student);
        setGradeFormData({
            score: aiScore !== null ? String(aiScore) : "",
            feedback: aiFeedback,
        });
        setModalMessage(null);
        setError(null);
        setIsGradeModalOpen(true);
    };

    const closeGradeModal = () => {
        setIsGradeModalOpen(false);
        setSelectedStudent(null);
        setGradeFormData({ score: "", feedback: "" });
        setModalMessage(null);
    };

    const handlePublishAIEvaluation = async () => {
        if (!selectedStudent) return;

        const submissionId = Number(selectedStudent.submissionId);
        if (!selectedStudent.submissionId || Number.isNaN(submissionId) || submissionId <= 0) {
            setError("Cannot publish AI result because this row has no submission ID yet.");
            return;
        }

        setIsPublishingAI(true);
        setError(null);
        setModalMessage("Publishing AI score and feedback to student...");

        try {
            await submissionService.approveSubmission(submissionId);
            setModalMessage("AI score and feedback were published successfully.");
            await fetchRosterAndStats(false);
        } catch (err: any) {
            const backendMessage = err?.response?.data?.message;
            if (Array.isArray(backendMessage)) {
                setError(backendMessage.join(", "));
            } else if (typeof backendMessage === "string") {
                setError(backendMessage);
            } else {
                setError("Failed to publish AI result. Please try again.");
            }
            setModalMessage(null);
        } finally {
            setIsPublishingAI(false);
        }
    };

    const handleGradeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;

        if (!gradeFormData.score || gradeFormData.score.trim() === "") {
            setError("Score is required");
            return;
        }

        const scoreNum = parseFloat(gradeFormData.score);
        if (isNaN(scoreNum) || scoreNum < 0) {
            setError("Please enter a valid score");
            return;
        }

        if (selectedAssessment && scoreNum > selectedAssessment.maxScore) {
            setError(`Score cannot exceed ${selectedAssessment.maxScore}`);
            return;
        }

        const canManualGradeWithoutSubmission = selectedStudent.type === "INDIVIDUAL" && !selectedStudent.submissionId;
        const submissionId = Number(selectedStudent.submissionId);
        if (!canManualGradeWithoutSubmission && (!selectedStudent.submissionId || Number.isNaN(submissionId) || submissionId <= 0)) {
            setError("Cannot save grade for this row because it has no valid submission ID.");
            return;
        }

        console.log("=== BEFORE GRADE SUBMIT ===");
        console.log("Selected Student:", selectedStudent);
        console.log("Score to submit:", scoreNum);
        console.log("Status to submit:", "GRADED");

        setIsSubmittingGrade(true);
        setError(null);
        try {
            const gradingPayload = {
                score: scoreNum,
                feedback: gradeFormData.feedback || undefined,
            };

            const response = canManualGradeWithoutSubmission
                ? { score: scoreNum, feedback: gradeFormData.feedback || undefined }
                : await submissionService.gradeSubmission(submissionId, gradingPayload);
            console.log("=== GRADE SUBMISSION RESPONSE ===");
            console.log("Backend response:", response);

            if (!canManualGradeWithoutSubmission) {
                const updatedGradeCache = new Map(gradeCache).set(submissionId, scoreNum);
                setGradeCache(updatedGradeCache);
                console.log(`[CACHE SAVE] Stored score ${scoreNum} for submissionId ${submissionId}`);
            }

            if (canManualGradeWithoutSubmission && selectedAssessmentId) {
                const student = selectedStudent as IndividualRosterItemDto;
                const cacheKey = `${selectedAssessmentId}:${student.userId}`;
                const nextManualCache = new Map(manualGradeCache).set(cacheKey, {
                    score: scoreNum,
                    feedback: gradeFormData.feedback || undefined,
                });
                setManualGradeCache(nextManualCache);
                setRoster((prevRoster) => {
                    const updated = prevRoster.map((item) => {
                        if (item.type === "INDIVIDUAL" && item.userId === student.userId) {
                            return { ...item, score: scoreNum, status: "GRADED" };
                        }
                        return item;
                    });
                    setStats(deriveStatsFromRoster(updated));
                    return updated;
                });
            }

            if (!canManualGradeWithoutSubmission) {
                setRoster((prevRoster) => {
                    const updated = prevRoster.map((item) => {
                        if (item.submissionId === submissionId) {
                            console.log("Updating roster item - before:", item);
                            const updated = { ...item, score: scoreNum, status: "GRADED" };
                            console.log("Updating roster item - after:", updated);
                            return updated;
                        }
                        return item;
                    });
                    console.log("Updated roster:", updated);
                    setStats(deriveStatsFromRoster(updated));
                    return updated;
                });
            }

            closeGradeModal();
            setError(null);

            console.log("Scheduling background refresh...");
            window.setTimeout(() => {
                fetchRosterAndStats(false);
            }, 1200);
            window.setTimeout(() => {
                fetchRosterAndStats(false);
            }, 3500);
        } catch (err: any) {
            console.error("Failed to submit grade:", err);
            const backendMessage = err?.response?.data?.message;
            if (Array.isArray(backendMessage)) {
                setError(backendMessage.join(", "));
            } else if (typeof backendMessage === "string") {
                setError(backendMessage);
            } else {
                setError("Failed to save grade. Please try again.");
            }
        } finally {
            setIsSubmittingGrade(false);
        }
    };

    const getStudentDisplayName = (student: RosterItem | null): string => {
        if (!student) return "";
        if (student.type === "INDIVIDUAL") {
            const indStudent = student as any as IndividualRosterItemDto;
            return indStudent.fullName || "Unknown Student";
        } else {
            const teamStudent = student as any as TeamRosterItemDto;
            return teamStudent.name || "Unknown Team";
        }
    };

    const getTeamMembers = (item: RosterItem): string[] => {
        if (item.type !== "TEAM") return [];
        const teamItem = item as TeamRosterItemDto;
        return (teamItem.members || []).map((member) => member.fullName).filter(Boolean);
    };

    const getRosterRowKey = (item: RosterItem): string => {
        if (item.type === "TEAM") {
            const teamItem = item as TeamRosterItemDto;
            return `team-${teamItem.id}`;
        }
        const indItem = item as IndividualRosterItemDto;
        return `individual-${indItem.userId}`;
    };

    const getActionLabel = (item: RosterItem): string => {
        const status = (item.status || "").toUpperCase();
        const isApproved = Boolean((item as any).isApproved ?? (item as any).evaluation?.isApproved);
        const hasAIResult = status === "EVALUATED" || getAIRecommendedScore(item) !== null || getAIRecommendedFeedback(item).trim().length > 0;

        if (status === "NOT_SUBMITTED") return item.type === "INDIVIDUAL" ? "Grade" : "View";
        if (isApproved || status === "GRADED") return "Edit Grade";
        if (hasAIResult) return "Review AI";
        return "Edit";
    };

    const matchesStudentSearch = (item: RosterItem, query: string): boolean => {
        if (!query) return true;

        const normalizedQuery = query.toLowerCase();
        const mainName = getStudentName(item).toLowerCase();
        if (mainName.includes(normalizedQuery)) return true;

        if (item.type === "TEAM") {
            const memberNames = getTeamMembers(item).map((name) => name.toLowerCase());
            return memberNames.some((name) => name.includes(normalizedQuery));
        }

        return false;
    };

    const filteredRoster = roster.filter((item) => {
        const statusMatches = statusFilter === "ALL" || getDerivedStatus(item) === statusFilter;
        const searchMatches = matchesStudentSearch(item, studentSearch.trim());
        return statusMatches && searchMatches;
    });

    const studentSearchSuggestions = Array.from(
        new Set(
            roster.flatMap((item) => {
                const names = [getStudentName(item)];
                if (item.type === "TEAM") {
                    names.push(...getTeamMembers(item));
                }
                return names.filter(Boolean);
            })
        )
    ).sort((a, b) => a.localeCompare(b));

    const statusFilterOptions = [
        { value: "ALL", label: "All Statuses", count: roster.length },
        { value: "AI_PENDING", label: "Submitted (AI Pending)", count: roster.filter((item) => getDerivedStatus(item) === "AI_PENDING").length },
        { value: "AI_EVALUATED", label: "AI Evaluated", count: roster.filter((item) => getDerivedStatus(item) === "AI_EVALUATED").length },
        { value: "PUBLISHED", label: "Published", count: roster.filter((item) => getDerivedStatus(item) === "PUBLISHED").length },
        { value: "GRADED", label: "Graded", count: roster.filter((item) => getDerivedStatus(item) === "GRADED").length },
        { value: "NOT_SUBMITTED", label: "Not Submitted", count: roster.filter((item) => getDerivedStatus(item) === "NOT_SUBMITTED").length },
    ];

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
    const normalizedAssignmentSearch = assignmentSearch.trim().toLowerCase();
    const filteredPublishedAssessments = publishedAssessments.filter((assessment) =>
        assessment.title.toLowerCase().includes(normalizedAssignmentSearch)
    );
    const filteredDraftAssessments = draftAssessments.filter((assessment) =>
        assessment.title.toLowerCase().includes(normalizedAssignmentSearch)
    );

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

    const selectedStudentAIScore = selectedStudent ? getAIRecommendedScore(selectedStudent) : null;
    const selectedStudentAIFeedback = selectedStudent ? getAIRecommendedFeedback(selectedStudent) : "";
    const selectedStudentHasAIResult = selectedStudent
        ? selectedStudent.status === "EVALUATED" || selectedStudentAIScore !== null || selectedStudentAIFeedback.trim().length > 0
        : false;
    const selectedStudentIsApproved = selectedStudent ? Boolean((selectedStudent as any).isApproved) : false;

    return (
        <>
            <div className="p-6 max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Grade Management</h2>
                    <p className="text-slate-600 text-sm mb-4">View and manage student grades across your assignments.</p>

                    {/* Assessment Selector */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-blue-600" />
                                Select Assignment
                            </label>
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                {publishedAssessments.length} published
                                <FileClock className="w-3.5 h-3.5 text-amber-600" />
                                {draftAssessments.length} draft
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-3 max-w-3xl">
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={assignmentSearch}
                                    onChange={(e) => setAssignmentSearch(e.target.value)}
                                    placeholder="Search assignment"
                                    className="w-full pl-9 pr-3 py-2.5 text-sm text-slate-900 border border-slate-300 rounded-lg placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <select
                                value={selectedAssessmentId || ""}
                                onChange={(e) => setSelectedAssessmentId(Number(e.target.value))}
                                className="w-full px-4 py-2.5 text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white hover:border-slate-400 transition-colors"
                            >
                                {filteredPublishedAssessments.length > 0 && (
                                    <optgroup label={`Published (${filteredPublishedAssessments.length})`}>
                                        {filteredPublishedAssessments.map((assessment) => (
                                            <option key={assessment.id} value={assessment.id}>
                                                {assessment.title} ({assessment.maxScore} pts)
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                                {filteredDraftAssessments.length > 0 && (
                                    <optgroup label={`Draft (${filteredDraftAssessments.length})`}>
                                        {filteredDraftAssessments.map((assessment) => (
                                            <option key={assessment.id} value={assessment.id}>
                                                {assessment.title} ({assessment.maxScore} pts) - DRAFT
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                                {filteredPublishedAssessments.length === 0 && filteredDraftAssessments.length === 0 && (
                                    <option value="" disabled>
                                        No assignments found
                                    </option>
                                )}
                            </select>
                        </div>

                        {selectedAssessment && (
                            <div className="max-w-3xl p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-slate-600" />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{selectedAssessment.title}</p>
                                        <p className="text-xs text-slate-600">Max score: {selectedAssessment.maxScore} points</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${selectedAssessment.isPublic ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                    {selectedAssessment.isPublic ? "Published" : "Draft"}
                                </span>
                            </div>
                        )}
                        {publishedAssessments.length === 0 && draftAssessments.length > 0 && (
                            <p className="text-xs text-amber-600 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Publish an assignment first to start grading.
                            </p>
                        )}
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            AI runs automatically after submission. Review and publish from each row.
                        </p>
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
                        {/* <div className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
                            <Filter className="w-3.5 h-3.5" />
                            Quick filters for student lookup and AI review.
                        </div> */}
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-[260px_1fr_auto] gap-3 items-end">
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                                    <Filter className="w-3.5 h-3.5" />
                                    Filter by status
                                </label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                    {statusFilterOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label} ({option.count})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                                    <Search className="w-3.5 h-3.5" />
                                    Search student or team
                                </label>
                                <div className="relative">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={studentSearch}
                                        onChange={(e) => setStudentSearch(e.target.value)}
                                        list="student-search-suggestions"
                                        placeholder="Type student, team, or member"
                                        className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <datalist id="student-search-suggestions">
                                    {studentSearchSuggestions.map((name) => (
                                        <option key={name} value={name} />
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter("ALL");
                                        setStudentSearch("");
                                    }}
                                    className="px-3 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors inline-flex items-center gap-1.5"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    {rosterLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                            <span className="ml-2 text-slate-600">Loading submissions...</span>
                        </div>
                    ) : filteredRoster.length === 0 ? (
                        <div className="px-6 py-12 text-center text-slate-600">
                            <p>No matching students for the current filter.</p>
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
                                    {filteredRoster.map((item) => (
                                        <tr
                                            key={getRosterRowKey(item)}
                                            className="border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                                            onClick={() => openGradeModal(item)}
                                        >
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900 min-w-[200px]" title={getStudentName(item)}>
                                                <div className="space-y-1">
                                                    <p>{getStudentName(item)}</p>
                                                    {item.type === "TEAM" && (
                                                        <p className="text-xs font-normal text-slate-600">
                                                            Members: {getTeamMembers(item).join(", ") || "No members"}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm">{getStatusBadge(item)}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                                                {formatScore(item.score, selectedAssessment?.maxScore)}
                                                <p className="text-[11px] font-normal text-slate-500 mt-1">
                                                    {item.submissionId ? `Linked #${item.submissionId}` : "Not linked"}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openGradeModal(item);
                                                    }}
                                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200 transition-colors"
                                                >
                                                    {getActionLabel(item)}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Grade Modal */}
            {isGradeModalOpen && selectedStudent && (
                <div className="fixed inset-0 bg-slate-900/25 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">Grade Submission</h2>
                            <button
                                onClick={closeGradeModal}
                                className="text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-600">{selectedStudent.type === "TEAM" ? "Team" : "Student"}</p>
                            <p className="text-sm font-semibold text-slate-900">{getStudentDisplayName(selectedStudent)}</p>
                            {selectedStudent.type === "TEAM" && (
                                <p className="text-xs text-slate-600 mt-1">
                                    Members: {getTeamMembers(selectedStudent).join(", ") || "No members"}
                                </p>
                            )}
                            <p className="text-xs text-slate-500 mt-2">Current status: {getDerivedStatus(selectedStudent).replace(/_/g, " ")}</p>
                            <p className="text-xs text-slate-500">Submission ID: {selectedStudent.submissionId ?? "N/A"}</p>
                            {selectedStudentHasAIResult && (
                                <p className="text-xs text-blue-700 mt-1">AI result detected for this submission.</p>
                            )}
                            {selectedStudentIsApproved && (
                                <p className="text-xs text-green-700 mt-1">AI result already published to student.</p>
                            )}
                        </div>

                        {!selectedStudent.submissionId && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800">
                                    {selectedStudent.type === "INDIVIDUAL"
                                        ? "No submission found yet. Saving will store a manual grade in teacher view only."
                                        : "No backend submission ID found for this team row yet."}
                                </p>
                            </div>
                        )}

                        <form onSubmit={handleGradeSubmit} className="space-y-4">
                            {modalMessage && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-800">{modalMessage}</p>
                                </div>
                            )}

                            {selectedStudentHasAIResult && (
                                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                    <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wide">AI Recommendation</p>
                                    <p className="text-sm text-indigo-900">Score: {selectedStudentAIScore !== null ? formatScore(selectedStudentAIScore, selectedAssessment?.maxScore) : "--"}</p>
                                    <p className="text-sm text-indigo-900 mt-1 whitespace-pre-wrap">{selectedStudentAIFeedback || "No AI feedback available"}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Score
                                    {selectedAssessment && (
                                        <span className="text-slate-500 font-normal ml-1">
                                            (Max: {selectedAssessment.maxScore})
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={selectedAssessment?.maxScore}
                                    value={gradeFormData.score}
                                    onChange={(e) => setGradeFormData({ ...gradeFormData, score: e.target.value })}
                                    placeholder="Enter score"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Result Status</p>
                                <p className="text-sm font-semibold text-blue-900">This submission will be marked as GRADED after save.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Feedback <span className="font-normal text-slate-500">(Optional)</span>
                                </label>
                                <textarea
                                    value={gradeFormData.feedback}
                                    onChange={(e) => setGradeFormData({ ...gradeFormData, feedback: e.target.value })}
                                    placeholder="Add comments or feedback for the student"
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handlePublishAIEvaluation}
                                    disabled={isPublishingAI || isSubmittingGrade || !selectedStudent.submissionId || !selectedStudentHasAIResult || selectedStudentIsApproved}
                                    className="flex-1 px-4 py-2 text-indigo-700 bg-indigo-100 rounded-lg font-semibold hover:bg-indigo-200 transition-colors disabled:bg-indigo-50 disabled:text-indigo-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isPublishingAI ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Publishing...
                                        </>
                                    ) : (
                                        "Publish AI"
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={closeGradeModal}
                                    className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
                                    disabled={isSubmittingGrade || isPublishingAI}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingGrade || isPublishingAI || (selectedStudent.type === "TEAM" && !selectedStudent.submissionId)}
                                    className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmittingGrade ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Grade"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default TeacherGradesTab;
