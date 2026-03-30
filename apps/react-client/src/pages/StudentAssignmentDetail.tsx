"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import MainNavigation from "@/components/navigation/Navigation";
import { useZipExtractor } from "@/hooks";
import { useAuth } from "@/context/AuthContext";
import { ClassSidebar } from "@/features/classDashboard";
import AssignmentHeader from "@/features/assignment/AssignmentHeader";
import AssignmentInstructions from "@/features/assignment/AssignmentInstructions";
import CodeEditorView from "@/features/assignment/CodeEditorView";
import ReferenceMaterials from "@/features/assignment/ReferenceMaterials";
import StudentPortal from "@/features/assignment/StudentPortal";
import type { UploadedFile } from "@/features/assignment/UploadSection";
import { UserRole } from "@/types/enums";
import assessmentService from "@/services/assessmentService";
import submissionService from "@/services/submissionService";
import type { AssessmentDetailDto } from "@/types/assessment";
import type { MySubmissionResponseDto } from "@/types/submission";

type StudentTabId = "general" | "assignment" | "posts" | "files" | "grades";

export default function StudentAssignmentDetail() {
  const { classId, assignmentId } = useParams<{ classId: string; assignmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const id = assignmentId || "";
  const cId = classId || "";

  const [activeTab] = useState<StudentTabId>("assignment");
  const [assignment, setAssignment] = useState<AssessmentDetailDto | null>(null);
  const [submission, setSubmission] = useState<MySubmissionResponseDto | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { editorFiles, showCodeEditor, extractAndOpen, openFileInEditor, closeEditor } = useZipExtractor();

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
          setSubmission(submissionData);
          // Map API resources to UploadedFile format
          if (submissionData.resources && Array.isArray(submissionData.resources)) {
            const files: UploadedFile[] = submissionData.resources.map((resource) => ({
              id: resource.id?.toString() || Math.random().toString(),
              name: resource.title || "Untitled",
              path: resource.url || "",
              size: "0 KB",
              uploadedAt: new Date().toISOString(),
            }));
            setUploadedFiles(files);
          }
        }
      } catch (err: any) {
        console.error("Error fetching assignment or submission:", err);
        setError(err.message || "Failed to load assignment details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleTabChange = (tab: StudentTabId | string) => {
    if (tab !== "students") {
      navigate(`/student-class/${cId}`, { state: { activeTab: tab } });
    }
  };

  const handleUploadComplete = useCallback((data: unknown) => {
    console.log("Upload complete:", data);
  }, []);

  const handleFileClick = useCallback(async (file: UploadedFile) => {
    if (!file.path) return;

    if (file.name.toLowerCase().endsWith(".zip")) {
      try {
        await extractAndOpen();
      } catch {
        alert("Could not extract ZIP file.");
      }
    } else {
      try {
        await openFileInEditor(file.path, file.name);
      } catch {
        alert("Could not preview file. The file might not be accessible.");
      }
    }
  }, [extractAndOpen, openFileInEditor]);

  const handleAddFiles = useCallback((files: UploadedFile[]) => {
    setUploadedFiles((prev) => [...prev, ...files]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
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
      <div className="flex min-h-screen bg-slate-50">
        <MainNavigation activeId="classes" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <p className="text-red-500 font-medium">{error || "Failed to load assignment"}</p>
            <button
              onClick={() => navigate(`/student-class/${cId}`)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              Back to Class
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allowedTabs: StudentTabId[] = ["general", "assignment", "posts", "files", "grades"];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <MainNavigation activeId="classes" />
      <div className="flex-1 flex flex-col min-w-0">
        {showCodeEditor && (
          <CodeEditorView
            files={editorFiles}
            onClose={closeEditor}
          />
        )}

        <div className={`h-screen bg-white flex overflow-hidden ${showCodeEditor ? 'hidden' : ''}`}>
          <ClassSidebar
            classId={cId}
            activeTab={activeTab}
            onTabChange={handleTabChange as any}
            allowedTabs={allowedTabs}
            role={UserRole.Student}
          />

          <div className="flex-1 flex flex-col min-w-0">
            <AssignmentHeader />

            <div className="flex-1 overflow-y-auto bg-slate-50">
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
                  <div className="space-y-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">{assignment.title || "Untitled Assignment"}</h1>
                        <p className="text-slate-600 whitespace-pre-wrap">{assignment.instruction || "No instruction provided"}</p>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {assignment.isPublic !== undefined && (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${assignment.isPublic
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                            }`}>
                            {assignment.isPublic ? 'Published' : 'Draft'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Assignment Details Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                      <h2 className="text-xl font-bold text-slate-900 mb-4">Assignment Details</h2>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Start Date</p>
                          <p className="font-semibold text-slate-900">
                            {assignment.startDate ? new Date(assignment.startDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            }) : 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Due Date</p>
                          <p className="font-semibold text-slate-900">
                            {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            }) : 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Max Score</p>
                          <p className="font-semibold text-slate-900">{assignment.maxScore || 0} points</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Submission Type</p>
                          <p className="font-semibold text-slate-900">{assignment.submissionType || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Late Submissions</p>
                          <p className="font-semibold text-slate-900">
                            {typeof assignment.allowLate === 'boolean' ? (assignment.allowLate ? 'Allowed' : 'Not Allowed') : 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Session Number</p>
                          <p className="font-semibold text-slate-900">{assignment.session || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Submission Guidelines */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                      <h2 className="text-xl font-bold text-slate-900 mb-4">Submission Guidelines</h2>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-700 mb-2">Allowed Submission Method</p>
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            {assignment.allowedSubmissionMethod || 'ANY'}
                          </span>
                        </div>

                        {assignment.user_include_files && assignment.user_include_files.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-slate-700 mb-2">Required Files</p>
                            <div className="space-y-1">
                              {assignment.user_include_files.map((file, idx) => (
                                <p key={idx} className="text-sm text-slate-600 ml-2">• {file}</p>
                              ))}
                            </div>
                          </div>
                        )}

                        {assignment.user_exclude_files && assignment.user_exclude_files.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-slate-700 mb-2">Exclude Files</p>
                            <div className="space-y-1">
                              {assignment.user_exclude_files.map((file, idx) => (
                                <p key={idx} className="text-sm text-slate-600 ml-2">• {file}</p>
                              ))}
                            </div>
                          </div>
                        )}

                        {assignment.penaltyCriteria && (
                          <div>
                            <p className="text-sm font-semibold text-slate-700 mb-2">Penalty Criteria</p>
                            <p className="text-sm text-slate-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
                              {assignment.penaltyCriteria}
                            </p>
                          </div>
                        )}

                        {assignment.aiEvaluationEnable && (
                          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                            <p className="text-sm font-semibold text-purple-900">
                              AI Evaluation Enabled
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <AssignmentInstructions
                      dueDate={assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }) : 'No due date'}
                      objective={assignment.instruction || 'No objective provided'}
                    />

                    {/* Grading Rubric Details */}
                    {assignment.rubrics && assignment.rubrics.length > 0 && (
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Grading Rubric</h2>
                        <div className="space-y-3">
                          {assignment.rubrics.map((rubric) => (
                            <div key={rubric.id} className="flex justify-between items-start p-3 bg-slate-50 rounded-lg">
                              <div className="flex-1">
                                <p className="font-semibold text-slate-900">{rubric.definition}</p>
                              </div>
                              <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold whitespace-nowrap">
                                {rubric.totalScore} pts
                              </span>
                            </div>
                          ))}
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <p className="text-sm text-slate-600">Total Points Available:</p>
                            <p className="text-2xl font-bold text-slate-900">{assignment.maxScore || 0} points</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <ReferenceMaterials materials={assignment.resources?.map(r => ({
                      name: r.resource?.title || 'Untitled',
                      type: r.resource?.type || 'OTHER'
                    })) || []} />
                  </div>

                  <div className="space-y-6">
                    <StudentPortal
                      status={submission?.status || "PENDING"}
                      progress={{ current: Math.floor(Math.random() * 100), total: 100 }}
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
                      assignmentId={id}
                      userId={user?.id.toString() || ""}
                      onUploadComplete={handleUploadComplete}
                      onFileClick={handleFileClick}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
