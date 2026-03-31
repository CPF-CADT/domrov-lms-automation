import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit2, Eye, Trash2, Loader2, AlertTriangle } from "lucide-react";
import AnimatedPage from "@/components/AnimatedPage";
import ViewAssignmentDetail from "@/features/assignment/components/ViewAssignmentDetail";
import assessmentService from "@/services/assessmentService";
import type { AssessmentListItemDto } from "@/types/assessment";

/**
 * TeacherAssignmentTab - TEACHER-SPECIFIC
 * Teacher interface for creating, editing, publishing, and managing assignment lifecycle
 * Includes assignment creation, draft/publish management, and grading tools
 * NOT shared with student dashboard
 */

function getStatusColor(isPublic: boolean): string {
  return isPublic ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700";
}

function getStatusLabel(isPublic: boolean): string {
  return isPublic ? "Published" : "Draft";
}

function formatDueDate(raw: string | Date): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatDueTime(raw: string | Date): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function TeacherAssignmentTab({ classId }: { classId: string }) {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<AssessmentListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<"all" | "published" | "drafts">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [creatingDraft, setCreatingDraft] = useState(false);

  // Session dialog state
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionMode, setSessionMode] = useState<"existing" | "new">("existing");
  const [selectedSession, setSelectedSession] = useState("1");

  const itemsPerPage = 4;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await assessmentService.getAssessmentsByClass(Number(classId));
      setAssignments(Array.isArray(response) ? response : []);
    } catch (err: any) {
      console.error("Failed to load assignments:", err);
      setError("Could not load assignments. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (assignmentId: number) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;
    setDeletingId(assignmentId);
    try {
      await assessmentService.deleteAssessment(assignmentId);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Publish: fetch full details, patch ALL required fields, then publish ───
  const handlePublish = async (assignmentId: number) => {
    setPublishingId(assignmentId);
    setPublishError(null);
    try {
      // Step 1 — fetch full details to check what's missing
      console.log(`Fetching details for #${assignmentId}...`);
      const details = await assessmentService.getAssessmentDetails(assignmentId);
      const maxScore = details.maxScore ?? 100;
      console.log("Current details:", {
        instruction: details.instruction,
        dueDate: details.dueDate,
        maxScore,
        rubrics: details.rubrics,
      });

      // Step 2 — patch all required fields that may be missing on old drafts
      // Backend requires: instruction, dueDate, rubric totalScore == maxScore
      await assessmentService.updateAssessment(assignmentId, {
        instruction: details.instruction?.trim()
          ? details.instruction
          : "No instructions provided.",
        dueDate: details.dueDate
          ? new Date(details.dueDate)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        rubrics: [{ definition: "Overall Score", totalScore: maxScore }],
      });
      console.log("Required fields patched");

      // Step 3 — publish
      console.log(`Publishing #${assignmentId}...`);
      await assessmentService.publishAssessment(assignmentId);
      console.log("Published");

      setAssignments((prev) =>
        prev.map((a) => a.id === assignmentId ? { ...a, isPublic: true } : a)
      );
    } catch (err: any) {
      console.error("Full error:", JSON.stringify(err?.response?.data, null, 2));
      const msg = err?.response?.data?.message ?? err?.message ?? "Failed to publish.";
      setPublishError(`Assignment #${assignmentId}: ${msg}`);
    } finally {
      setPublishingId(null);
    }
  };

  // Create new assignment draft and navigate to create page
  const handleCreateAssignment = async () => {
    setCreatingDraft(true);
    try {
      const sessionToUse = Number(selectedSession);
      console.log("📝 Creating draft with session:", sessionToUse);

      // Create draft with selected session
      const draftRes = await assessmentService.createAssessmentDraft(
        Number(classId),
        sessionToUse
      );

      const draftId = draftRes?.assessmentId;
      console.log("✅ Draft created, ID:", draftId);

      if (!draftId) throw new Error("No assessmentId returned");

      // Close dialog and reset state
      setSessionDialogOpen(false);
      setSessionMode("existing");
      setSelectedSession("1");

      // Navigate to create page with the new assignment ID
      navigate(`/class/${classId}/assignment/${draftId}/create`);
    } catch (err: any) {
      console.error("Failed to create draft:", err);
      alert(err?.message ?? "Failed to create assignment draft");
    } finally {
      setCreatingDraft(false);
    }
  };

  // Open session selection dialog
  const handleOpenSessionDialog = () => {
    // Get existing sessions
    const existingSessions = [...new Set(assignments.map(a => a.session || 1))].sort((a, b) => a - b);

    if (existingSessions.length > 0) {
      setSelectedSession(String(existingSessions[0]));
    } else {
      setSelectedSession("1");
    }

    setSessionMode("existing");
    setSessionDialogOpen(true);
  };

  const filteredAssignments = assignments.filter((a) => {
    if (activeFilter === "published") return a.isPublic === true;
    if (activeFilter === "drafts") return a.isPublic === false;
    return true;
  });

  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAssignments = filteredAssignments.slice(startIndex, startIndex + itemsPerPage);

  // ─── Sub-views ───────────────────────────────────────────────────────────────

  if (selectedAssignmentId !== null) {
    return (
      <div className="p-8 mx-auto max-w-7xl">
        <AnimatedPage>
          <ViewAssignmentDetail
            assignmentId={selectedAssignmentId}
            onBack={() => setSelectedAssignmentId(null)}
          />
        </AnimatedPage>
      </div>
    );
  }

  // ─── Main list ───────────────────────────────────────────────────────────────

  return (
    <div className="p-8 mx-auto max-w-7xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Assignment</h1>
          <p className="mt-2 text-slate-600">Create, monitor, and grade your student assignments in one place.</p>
        </div>
        <button
          onClick={handleOpenSessionDialog}
          disabled={creatingDraft}
          className="flex items-center gap-2 px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {creatingDraft ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          Create New Assignment
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-8 mb-6 border-b border-slate-200">
        {[
          { id: "all", label: "All Assignments" },
          { id: "published", label: "Published" },
          { id: "drafts", label: "Drafts" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveFilter(tab.id as typeof activeFilter); setCurrentPage(1); }}
            className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeFilter === tab.id ? "text-blue-600" : "text-slate-600 hover:text-slate-900"
              }`}
          >
            {tab.label}
            {activeFilter === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        ))}
      </div>

      {/* Publish error */}
      {publishError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <p className="text-sm text-red-600">{publishError}</p>
          <button onClick={() => setPublishError(null)} className="text-red-400 hover:text-red-600 ml-4 text-lg leading-none">×</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-sm text-slate-500">Loading assignments...</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={load} className="text-sm text-red-600 underline">Retry</button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="mb-8 overflow-hidden bg-white border rounded-lg border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-xs font-semibold text-left uppercase text-slate-600">Assignment Title</th>
                  <th className="px-6 py-4 text-xs font-semibold text-left uppercase text-slate-600">Session</th>
                  <th className="px-6 py-4 text-xs font-semibold text-left uppercase text-slate-600">Due Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-left uppercase text-slate-600">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-left uppercase text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                      No {activeFilter === "all" ? "" : activeFilter} assignments yet.
                    </td>
                  </tr>
                ) : (
                  paginatedAssignments.map((assignment) => (
                    <tr key={assignment.id} className="transition-colors border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{assignment.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {assignment.submissionType} · {assignment.allowedSubmissionMethod}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{assignment.session}</td>
                      <td className="px-6 py-4 text-slate-700">
                        <p>{formatDueDate(assignment.dueDate)}</p>
                        <p className="text-sm text-slate-500">· {formatDueTime(assignment.dueDate)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(assignment.isPublic)}`}>
                          · {getStatusLabel(assignment.isPublic)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {!assignment.isPublic && (
                            <button
                              onClick={() => handlePublish(assignment.id)}
                              disabled={publishingId === assignment.id}
                              className="px-2 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
                            >
                              {publishingId === assignment.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : "Publish"
                              }
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/class/${classId}/assignment/${assignment.id}/edit`)}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setSelectedAssignmentId(assignment.id); }}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(assignment.id)}
                            disabled={deletingId === assignment.id}
                            className="p-2 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600 disabled:opacity-50 transition-colors"
                            title="Delete"
                          >
                            {deletingId === assignment.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 text-sm border-t border-slate-200 text-slate-600">
            <p>Showing {filteredAssignments.length === 0 ? 0 : startIndex + 1} of {filteredAssignments.length} assignments</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded-lg border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1 border rounded-lg border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Selection Dialog */}
      {sessionDialogOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Create Assignment</h2>
            </div>

            <p className="text-sm text-slate-600 mb-6">
              Which session do you want to create this assignment for?
            </p>

            <div className="space-y-4 mb-6">
              {/* Existing Session Option */}
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors"
                style={{ borderColor: sessionMode === "existing" ? "#2563eb" : "#e2e8f0", backgroundColor: sessionMode === "existing" ? "#eff6ff" : "transparent" }}>
                <input
                  type="radio"
                  name="session-mode"
                  value="existing"
                  checked={sessionMode === "existing"}
                  onChange={() => setSessionMode("existing")}
                  className="mr-3"
                />
                <div>
                  <p className="font-semibold text-slate-900">Existing Session</p>
                  <p className="text-xs text-slate-500">Add to an existing session</p>
                </div>
              </label>

              {sessionMode === "existing" && (
                <div className="ml-7 mb-4">
                  <select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[...new Set(assignments.map(a => a.session || 1))].sort((a, b) => a - b).map((session) => (
                      <option key={session} value={session}>
                        Session {session}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* New Session Option */}
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors"
                style={{ borderColor: sessionMode === "new" ? "#2563eb" : "#e2e8f0", backgroundColor: sessionMode === "new" ? "#eff6ff" : "transparent" }}>
                <input
                  type="radio"
                  name="session-mode"
                  value="new"
                  checked={sessionMode === "new"}
                  onChange={() => {
                    setSessionMode("new");
                    const maxSession = assignments.length > 0
                      ? Math.max(...assignments.map(a => a.session || 1))
                      : 0;
                    setSelectedSession(String(maxSession + 1));
                  }}
                  className="mr-3"
                />
                <div>
                  <p className="font-semibold text-slate-900">New Session</p>
                  <p className="text-xs text-slate-500">
                    Create a new session {assignments.length > 0 ? `(Session ${Math.max(...assignments.map(a => a.session || 1)) + 1})` : "(Session 1)"}
                  </p>
                </div>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setSessionDialogOpen(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAssignment}
                disabled={creatingDraft}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {creatingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}