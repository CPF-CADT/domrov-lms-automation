import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  Sparkles,
  Trash2,
} from "lucide-react";
import MainNavigation from "@/components/navigation/MainNavigation";
import ClassSidebar from "@/pages/classes/components/ClassSidebar";
import { getAssessmentDetails, deleteAssessment } from "@/services/AssessmentService";
import type { AssessmentDetailDto } from "@/types/Assessment";
import { routes } from "@/lib/routes";

function formatDate(value?: string | Date) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return `${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}, ${date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function submissionMethodLabel(method?: string) {
  if (method === "GITHUB") return "GitHub repository";
  if (method === "ZIP") return "File upload";
  return "File upload or GitHub repository";
}

export default function TeacherAssignmentDetail() {
  const { id, classId: routeClassId, assignmentId } = useParams<{ id?: string; classId?: string; assignmentId?: string }>();
  const resolvedAssignmentId = assignmentId ?? id;
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<AssessmentDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const classId = routeClassId || assignment?.class?.id?.toString() || "";

  useEffect(() => {
    let cancelled = false;

    async function loadAssignment() {
      if (!resolvedAssignmentId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await getAssessmentDetails(Number(resolvedAssignmentId));
        if (!cancelled) setAssignment(data);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load assignment details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAssignment();
    return () => {
      cancelled = true;
    };
  }, [resolvedAssignmentId]);

  const handleEditAssignment = () => {
    if (classId && resolvedAssignmentId) navigate(routes.assignmentEdit(classId, resolvedAssignmentId));
  };

  const handleDeleteAssignment = async () => {
    if (!resolvedAssignmentId || !confirm("Are you sure you want to delete this assignment?")) return;
    try {
      await deleteAssessment(Number(resolvedAssignmentId));
      alert("Assignment deleted successfully");
      navigate(routes.classAssignments(classId));
    } catch (err: unknown) {
      alert("Failed to delete assignment: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const handleViewSubmissions = () => {
    if (classId && resolvedAssignmentId) {
      navigate(routes.assignmentSubmissions(classId, resolvedAssignmentId));
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <MainNavigation activeId="classes" />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
            <p className="mt-4 text-sm text-slate-600">Loading assignment details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <MainNavigation activeId="classes" />
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-center">
            <p className="text-red-600">{error || "Assignment not found"}</p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusLabel = assignment.isPublic ? "Published" : "Draft";
  const statusClass = assignment.isPublic ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <MainNavigation activeId="classes" />
      <ClassSidebar classId={classId} allowedTabs={["general", "assignment", "students"]} role="Teacher" />

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <button type="button" onClick={() => navigate(routes.classAssignments(classId))} className="inline-flex items-center gap-1 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" />
              Assignments
            </button>
            <span className="text-slate-300">/</span>
            <span className="truncate text-slate-900">{assignment.title}</span>
          </div>
        </div>

        <div className="w-full space-y-6 px-5 py-5">
          <section className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>{statusLabel}</span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Session {assignment.session}</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{assignment.title}</h1>
              <p className="mt-2 text-sm text-slate-600">Review assignment details, resources, and grading rules.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
              <button type="button" onClick={handleEditAssignment} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Edit className="h-4 w-4" />
                Edit assignment
              </button>
              <button type="button" onClick={handleViewSubmissions} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                <Eye className="h-4 w-4" />
                View submissions
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-600"><FileText className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Assignment overview</h2>
                <p className="text-sm text-slate-500">Instructions and requirements for students.</p>
              </div>
            </div>
            <p className="whitespace-pre-wrap leading-7 text-slate-700">{assignment.instruction || "No instructions provided."}</p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <h2 className="mb-5 text-lg font-semibold text-slate-900">Assignment details</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <DetailItem icon={<Calendar className="h-4 w-4" />} label="Due date" value={formatDate(assignment.dueDate)} />
              <DetailItem icon={<Clock className="h-4 w-4" />} label="Submission method" value={submissionMethodLabel(assignment.allowedSubmissionMethod)} />
              <DetailItem icon={<CheckCircle2 className="h-4 w-4" />} label="Maximum score" value={`${assignment.maxScore || 0} points`} />
              <DetailItem icon={<Clock className="h-4 w-4" />} label="Late submissions" value={assignment.allowLate ? "Allowed" : "Not allowed"} />
            </div>
          </section>

          {assignment.submissionType === "TEAM" && (
            <section className="rounded-xl border border-blue-200 bg-blue-50 p-6 sm:p-7">
              <h2 className="text-lg font-semibold text-slate-900">Allowed teams</h2>
              <p className="mt-1 text-sm text-slate-600">Only these teams can submit this assignment.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(assignment.teamAssessments ?? []).map((team) => (
                  <span key={team.team_id} className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-sm text-slate-700">
                    {team.team?.name ?? `Team ${team.team_id}`}
                  </span>
                ))}
                {(assignment.teamAssessments ?? []).length === 0 && <span className="text-sm text-red-600">No teams selected.</span>}
              </div>
            </section>
          )}

          {assignment.resources && assignment.resources.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Resources</h2>
                  <p className="mt-1 text-sm text-slate-500">Reference materials available to students.</p>
                </div>
                <span className="text-sm text-slate-500">{assignment.resources.length} file{assignment.resources.length === 1 ? "" : "s"}</span>
              </div>
              <div className="space-y-3">
                {assignment.resources.map((resource) => (
                  <div key={resource.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-slate-500"><FileText className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{resource.resource.title || "Untitled resource"}</p>
                      <p className="text-xs uppercase text-slate-500">{resource.resource.type || "FILE"}</p>
                    </div>
                    {resource.resource.url && <a href={resource.resource.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50"><Download className="h-4 w-4" />Open</a>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {assignment.aiEvaluationEnable && (
            <section className="rounded-xl border border-blue-200 bg-blue-50 p-6 sm:p-7">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-blue-600"><Sparkles className="h-5 w-5" /></div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">AI evaluation</h2>
                  <p className="mt-1 text-sm text-slate-700">Enabled · {assignment.aiModel?.name || "System evaluation model"}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">Submissions are evaluated automatically. Review the generated score and feedback before publishing results to students.</p>
                </div>
              </div>
            </section>
          )}

          {assignment.rubrics && assignment.rubrics.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Grading rubric</h2>
                  <p className="mt-1 text-sm text-slate-500">Criteria used to evaluate student work.</p>
                </div>
                <span className="text-lg font-bold text-blue-600">{assignment.maxScore} points</span>
              </div>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {assignment.rubrics.map((rubric) => (
                  <div key={rubric.id} className="flex items-center justify-between gap-4 p-4">
                    <span className="text-sm font-medium text-slate-800">{rubric.definition}</span>
                    <span className="shrink-0 text-sm font-semibold text-slate-600">{rubric.totalScore} pts</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-xl border border-red-200 bg-white p-6 sm:p-7">
            <button type="button" onClick={handleDeleteAssignment} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
              Delete assignment
            </button>
            <p className="mt-2 text-xs text-slate-500">This action cannot be undone.</p>
          </section>
        </div>
      </main>
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}
