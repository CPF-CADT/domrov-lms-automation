"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import MainNavigation from "@/components/navigation/MainNavigation";
import ClassSidebar from "@/pages/classes/components/ClassSidebar";
import AssignmentHeader from "@/pages/assignments/components/AssignmentHeader";
import StudentPortal from "@/pages/assignments/components/StudentPortal";
import SubmissionResources from "@/pages/assignments/components/SubmissionResources";
import ResourceViewer from "@/pages/assignments/components/ResourceViewer";
import type { UploadedFile } from "@/pages/assignments/components/UploadSection";
import { UserRole } from "@/types/Enums";
import assessmentService from "@/services/AssessmentService";
import submissionService from "@/services/SubmissionService";
import type { AssessmentDetailDto } from "@/types/Assessment";
import type { SubmissionViewerResponseDto } from "@/types/Submission";
import StudentEvaluationFeedback from "@/pages/assignments/components/StudentEvaluationFeedback";
import SubmissionCodeViewer from "@/pages/assignments/components/SubmissionCodeViewer";
import { routes } from "@/lib/routes";

type StudentTabId = "general" | "assignment";

export default function StudentAssignmentDetail() {
  const { classId, assignmentId } = useParams<{ classId: string; assignmentId: string }>();
  const navigate = useNavigate();

  const id = assignmentId || "";
  const cId = classId || "";

  const [assignment, setAssignment] = useState<AssessmentDetailDto | null>(null);
  const [submission, setSubmission] = useState<SubmissionViewerResponseDto | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftSyncError, setDraftSyncError] = useState<string | null>(null);
  const [isSyncingResources, setIsSyncingResources] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any | null>(null);
  const [resourceViewerOpen, setResourceViewerOpen] = useState(false);

  // Helper function to update submission resources on backend
  const updateSubmissionResources = useCallback(async (resources: { resourceId?: number }[]) => {
    if (!submission?.id) return;

    setIsSyncingResources(true);
    setDraftSyncError(null);

    try {
      // Save resources to backend
      await submissionService.saveDraftAssignment(Number(id), {
        resources,
      });

      // Fetch detailed submission to get actual saved resources
      const detailedSubmission = await submissionService.getSubmissionDetails(submission.id);
      setSubmission(detailedSubmission);

      // Map updated resources to UploadedFile format
      if (detailedSubmission.resources && Array.isArray(detailedSubmission.resources)) {
        const files: UploadedFile[] = detailedSubmission.resources.map((r) => ({
          resourceId: r.resource?.id,
          name: r.resource?.title || "Untitled",
          path: r.resource?.url || "",
          size: "0 KB",
          uploadedAt: new Date().toISOString(),
          type: "file",
          url: r.resource?.url || "",
        }));
        setUploadedFiles(files);
      }
    } catch (err: any) {
      console.error("Error updating submission resources:", err);
      setDraftSyncError(err.message || "Failed to save submission changes.");
    } finally {
      setIsSyncingResources(false);
    }
  }, [id, submission?.id]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError("Assignment ID is missing");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch assignment details
        const assignmentData = await assessmentService.getAssessmentDetails(Number(id));
        setAssignment(assignmentData);

        // Fetch submission status
        const submissionData = await submissionService.getMySubmissionStatus(Number(id));

        if (submissionData) {
          // Merge basic status data immediately
          setSubmission(submissionData as any);

          // Map resources from basic submission if available
          if (submissionData.resources && Array.isArray(submissionData.resources)) {
            const files: UploadedFile[] = submissionData.resources.map((resource: any) => ({
              resourceId: resource.id,
              name: resource.title || "Untitled",
              path: resource.url || "",
              size: "0 KB",
              uploadedAt: new Date().toISOString(),
              type: "file",
              url: resource.url || "",
            }));
            setUploadedFiles(files);
          }

          // STOP LOADING IMMEDIATELY if we have any submission info (status/id)
          setLoading(false);

          // Fetch detailed submission data if we have a submission ID
          if (submissionData.id) {
            try {
              const detailedSubmission = await submissionService.getSubmissionDetails(submissionData.id);
              // Merge detailed data with existing submission for full context
              setSubmission(detailedSubmission);

              // Map resources from detailed submission (has the actual structure)
              if (detailedSubmission.resources && Array.isArray(detailedSubmission.resources)) {
                const files: UploadedFile[] = detailedSubmission.resources.map((r: any) => ({
                  resourceId: r.resource?.id,
                  name: r.resource?.title || "Untitled",
                  path: r.resource?.url || "",
                  size: "0 KB",
                  uploadedAt: new Date().toISOString(),
                  type: "file",
                  url: r.resource?.url || "",
                }));
                setUploadedFiles(files);
              }
            } catch (err: any) {
              console.warn("Could not fetch detailed submission:", err);
            }
          }
        } else {
          // No submission data at all, we're done loading
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Error fetching assignment or submission:", err);
        setError(err.message || "Failed to load assignment details");
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleUploadComplete = useCallback((data: unknown) => {
    console.log("Upload complete:", data);
  }, []);

  const handleViewResourceDetails = useCallback((resource: any) => {
    setSelectedResource(resource);
    setResourceViewerOpen(true);
  }, []);

  const handleAddFiles = useCallback((files: UploadedFile[]) => {
    setUploadedFiles((prev) => {
      const updated = [...prev, ...files];
      return updated;
    });
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setUploadedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);

      // Trigger backend sync with remaining resources
      const resources = updated.map(f => ({ resourceId: f.resourceId }));
      updateSubmissionResources(resources);

      return updated;
    });
  }, [updateSubmissionResources]);

  // Handler for when resources are changed (e.g., delete confirmation)
  const handleResourcesChanged = useCallback((resources: { resourceId?: number }[]) => {
    updateSubmissionResources(resources);
  }, [updateSubmissionResources]);

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <MainNavigation activeId="classes" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-slate-600">Loading assignment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <MainNavigation activeId="classes" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <p className="text-red-500 font-medium">{error || "Failed to load assignment"}</p>
            <button
              onClick={() => navigate(routes.classAssignments(cId))}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              Back to Class
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allowedTabs: StudentTabId[] = ["general", "assignment"];
  const evaluation = submission?.evaluation;
  const isGraded = Boolean(evaluation?.isApproved);
  const isEvaluationPending = Boolean(evaluation && !evaluation.isApproved && submission?.status !== "GRADED");
  const scorePercent = isGraded && evaluation ? Math.round((evaluation.score / Math.max(assignment.maxScore || 1, 1)) * 100) : 0;
  const gradeLetter = scorePercent >= 90 ? "A" : scorePercent >= 80 ? "B" : scorePercent >= 70 ? "C" : scorePercent >= 60 ? "D" : "F";
  const formatMetaDate = (value?: string | Date) => value
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Not specified";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <MainNavigation activeId="classes" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 w-full flex-1 bg-slate-50">
          <ClassSidebar
            classId={cId}
            allowedTabs={allowedTabs}
            role={UserRole.Student}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <AssignmentHeader />

            <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
              <div className="mx-auto w-full max-w-[1440px] space-y-4 px-4 py-4">
                <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${assignment.isPublic ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{assignment.isPublic ? "Published" : "Draft"}</span>
                      <span className="text-sm text-slate-500">Session {assignment.session}</span>
                    </div>
                    <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{assignment.title || "Untitled Assignment"}</h1>
                    <p className="mt-1 text-sm text-slate-600">Due {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "No due date"}</p>
                  </div>
                  <section className={`w-full rounded-xl border p-4 shadow-sm lg:max-w-xs ${isGraded ? "border-green-200 bg-green-50" : isEvaluationPending ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
                    <p className="text-sm text-slate-600">Your score</p>
                    {isGraded ? <><div className="mt-1 flex items-baseline gap-2"><span className="text-5xl font-bold text-slate-900">{evaluation?.score}</span><span className="text-lg text-slate-600">/ {assignment.maxScore || 0}</span></div><p className="mt-1 flex items-center gap-2 text-sm font-semibold text-green-700"><CheckCircle2 className="h-4 w-4" /> {gradeLetter} · {scorePercent}%</p></> : <><p className="mt-2 text-xl font-bold text-slate-900">{isEvaluationPending ? "Evaluation in progress" : submission ? "Submitted" : "Not submitted"}</p><p className="mt-1 text-sm text-slate-600">{isEvaluationPending ? "Waiting for teacher approval." : submission ? "Your score will appear after grading." : "Submit your work before the due date."}</p></>}
                  </section>
                </section>

                <nav className="flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm" aria-label="Assignment sections">
                  {[['overview', 'Overview'], ['instructions', 'Instructions'], ['rubric', 'Rubric'], ['submission', 'Submission'], ['feedback', 'Feedback']].map(([id, label]) => <a key={id} href={`#${id}`} className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700">{label}</a>)}
                </nav>

                <div className="grid items-start gap-4 lg:grid-cols-1">
                  <div className="space-y-4">
                    <section id="overview" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <h2 className="text-lg font-bold text-slate-900">Assignment instructions</h2>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{assignment.instruction || "No instructions provided."}</p>
                      <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 xl:grid-cols-4">
                        {[['Start date', formatMetaDate(assignment.startDate)], ['Due date', formatMetaDate(assignment.dueDate)], ['Submission type', assignment.submissionType || 'Not specified'], ['Late submissions', assignment.allowLate ? 'Allowed' : 'Not allowed']].map(([label, value]) => <div key={label}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-900">{value}</p></div>)}
                      </div>
                    </section>

                    <section id="instructions" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <h2 className="text-lg font-bold text-slate-900">Submission requirements</h2>
                      <div className="mt-4 space-y-4 text-sm text-slate-700">
                        <p>Allowed method: <strong>{assignment.allowedSubmissionMethod || 'Any'}</strong></p>
                        {assignment.user_include_files?.length ? <div><p className="font-semibold text-slate-900">Required files</p><ul className="mt-2 list-disc space-y-1 pl-5">{assignment.user_include_files.map((file) => <li key={file}>{file}</li>)}</ul></div> : null}
                        {assignment.user_exclude_files?.length ? <div><p className="font-semibold text-slate-900">Files to exclude</p><ul className="mt-2 list-disc space-y-1 pl-5">{assignment.user_exclude_files.map((file) => <li key={file}>{file}</li>)}</ul></div> : null}
                        {assignment.penaltyCriteria ? <p className="rounded-lg border border-orange-200 bg-orange-50 p-3">{assignment.penaltyCriteria}</p> : null}
                      </div>
                    </section>

                    {assignment.rubrics?.length ? <details id="rubric" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between text-lg font-bold text-slate-900"><span>Grading rubric</span><span className="text-sm font-semibold text-slate-500">{assignment.maxScore} points</span></summary><div className="mt-3 space-y-2">{assignment.rubrics.map((rubric, index) => <div key={rubric.id} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3"><div><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">{index + 1}</span><span className="font-semibold text-slate-900">{rubric.definition}</span></div><span className="shrink-0 rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">{rubric.totalScore} pts</span></div>)}</div></details> : null}

                    {assignment.aiEvaluationEnable ? <section className="rounded-xl border border-purple-200 bg-purple-50 p-4"><h2 className="text-base font-bold text-purple-900">AI evaluation enabled</h2><p className="mt-1 text-sm text-purple-800">Your submission may be automatically evaluated before teacher approval.</p></section> : null}

                    {assignment.resources?.length ? <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-lg font-bold text-slate-900">Resources</h2><div className="mt-3 space-y-2">{assignment.resources.map((resource) => <a key={resource.id} href={resource.resource?.url || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm hover:border-blue-300 hover:bg-blue-50"><span className="font-semibold text-slate-800">{resource.resource?.title || 'Untitled resource'}</span><span className="text-blue-600">Open</span></a>)}</div></section> : null}

                    {draftSyncError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><strong>Sync error:</strong> {draftSyncError}</div> : null}

                    {submission?.id ? <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Submitted code</h2><p className="mt-1 text-xs text-slate-500">Browse your submitted files in read-only mode.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Read-only</span></div><div className="mt-3"><SubmissionCodeViewer submissionId={submission.id} feedbacks={isGraded ? (evaluation?.feedbacks || []) : []} canComment={false} showFeedback={isGraded && Boolean(evaluation?.feedbacks?.length)} /></div></section> : null}
                  </div>

                  <aside className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-4 lg:space-y-0">
                    <section id="submission" className="rounded-xl border border-slate-200 bg-white shadow-sm">
                      <StudentPortal
                      status={submission?.status || "PENDING"}
                      progress={{ current: submission?.status === "GRADED" ? 100 : submission ? 50 : 0, total: 100 }}
                      progressPercent={0}
                      submittedAt={submission?.submissionTime ? new Date(submission.submissionTime).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : undefined}
                      uploadedFiles={uploadedFiles}
                      onFilesAdded={handleAddFiles}
                      onFileRemoved={handleRemoveFile}
                      onResourcesChanged={handleResourcesChanged}
                      assignmentId={id}
                      submissionId={submission?.id}
                      submissionMethod={assignment.allowedSubmissionMethod || "ANY"}
                      onUploadComplete={handleUploadComplete}
                      evaluationStatus={submission?.evaluation?.isApproved}
                      isEditDisabled={submission?.evaluation?.isApproved || submission?.status === "GRADED"}
                      isLoading={isSyncingResources}
                      onSubmissionStateChange={() => {
                        // Refresh submission data after unsubmit
                        const refreshSubmission = async () => {
                          const submissionData = await submissionService.getMySubmissionStatus(Number(id));
                          if (submissionData?.id) {
                            try {
                              // Fetch detailed submission to get actual resources
                              const detailedSubmission = await submissionService.getSubmissionDetails(submissionData.id);
                              setSubmission(detailedSubmission);

                              // Map resources from detailed submission
                              if (detailedSubmission.resources && Array.isArray(detailedSubmission.resources)) {
                                const files: UploadedFile[] = detailedSubmission.resources.map((r) => ({
                                  resourceId: r.resource?.id,
                                  name: r.resource?.title || "Untitled",
                                  path: r.resource?.url || "",
                                  size: "0 KB",
                                  uploadedAt: new Date().toISOString(),
                                  type: "file",
                                  url: r.resource?.url || "",
                                }));
                                setUploadedFiles(files);
                              }
                            } catch (err: any) {
                              console.warn("Could not fetch detailed submission:", err);
                              // Fallback to basic submission data
                              setSubmission(submissionData as unknown as SubmissionViewerResponseDto);
                              if (submissionData.resources && Array.isArray(submissionData.resources)) {
                                const files: UploadedFile[] = submissionData.resources.map((resource) => ({
                                  resourceId: resource.id,
                                  name: resource.title || "Untitled",
                                  path: resource.url || "",
                                  size: "0 KB",
                                  uploadedAt: new Date().toISOString(),
                                  type: "file",
                                  url: resource.url || "",
                                }));
                                setUploadedFiles(files);
                              }
                            }
                          }
                        };
                        refreshSubmission();
                      }}
                      />
                    </section>

                    {submission?.resources?.length ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-900">Submitted files</h2><div className="mt-4"><SubmissionResources resources={submission.resources.map((r: any) => ({ id: r.resource?.id || r.id, title: r.resource?.title || "Untitled", type: r.resource?.type || "OTHER", url: r.resource?.url }))} isViewOnly={Boolean(submission.evaluation?.isApproved || submission.status === "GRADED")} onViewDetails={handleViewResourceDetails} /></div></section> : null}

                    <section id="feedback" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      {submission?.evaluation?.isApproved ? <StudentEvaluationFeedback submission={submission} maxScore={assignment.maxScore || 0} assignmentTitle={assignment.title || "Assignment"} showSummary={false} /> : <><h2 className="text-lg font-bold text-slate-900">Score & feedback</h2><p className="mt-2 text-sm text-slate-600">Feedback will appear here after your assignment is reviewed.</p></>}
                    </section>
                  </aside>
                </div>
              </div>
            </main>
          </div>
        </div>

        {/* Resource Viewer Modal */}
        <ResourceViewer
          isOpen={resourceViewerOpen}
          onClose={() => setResourceViewerOpen(false)}
          resource={selectedResource}
        />
      </div>
    </div>
  );
}
