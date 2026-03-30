import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, Clock, FileText, Trash2, Edit, Eye } from "lucide-react";
import MainNavigation from "@/components/navigation/Navigation";
import { ClassSidebar } from "@/features/classDashboard";
import { getAssessmentDetails, deleteAssessment } from "@/services/assessmentService";
import type { AssessmentDetailDto } from "@/types/assessment";

type TabId = "general" | "assignment" | "students" | "grades";

export default function TeacherAssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab] = useState<TabId>("assignment");
  const [assignment, setAssignment] = useState<AssessmentDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const classId = assignment?.class?.id?.toString() || "flutter";

  useEffect(() => {
    if (id) {
      fetchAssignmentDetails();
    }
  }, [id]);

  const fetchAssignmentDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAssessmentDetails(Number(id));
      console.log("Assignment data:", data);
      setAssignment(data);
    } catch (err: any) {
      console.error("Error fetching assignment:", err);
      setError(err.message || "Failed to load assignment details");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = () => {
    navigate(`/class/${classId}`);
  };

  const handleEditAssignment = () => {
    // Navigate to edit page or open edit modal
    console.log("Edit assignment:", id);
  };

  const handleDeleteAssignment = async () => {
    if (confirm("Are you sure you want to delete this assignment?")) {
      try {
        await deleteAssessment(Number(id));
        alert("Assignment deleted successfully");
        navigate(-1);
      } catch (err: any) {
        alert("Failed to delete assignment: " + err.message);
      }
    }
  };

  const handleViewSubmissions = () => {
    navigate(`/assignment/${id}/submissions`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <MainNavigation activeId="classes" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading assignment details...</p>
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
          <div className="text-center">
            <p className="text-red-600 text-lg">{error || "Assignment not found"}</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <MainNavigation activeId="classes" />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-screen bg-white flex overflow-hidden">
          <ClassSidebar classId={classId} activeTab={activeTab} onTabChange={handleTabChange} />

          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            {/* Breadcrumb */}
            <div className="px-8 py-4 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Assignments</span>
                <span>/</span>
                <span className="text-slate-900 font-medium">Assignment {id}</span>
              </div>
            </div>

            <div className="flex-1 bg-slate-50 p-8">
              <div className="max-w-7xl mx-auto space-y-6">
                {/* Header with Actions */}
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                      {assignment.title}
                    </h1>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${
                          assignment.isPublic
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {assignment.isPublic ? "PUBLIC" : "DRAFT"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleEditAssignment}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Assignment
                    </button>
                    <button
                      onClick={handleViewSubmissions}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Submissions
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
                  {/* Left Column - Main Content */}
                  <div className="space-y-6">
                    {/* Assignment Overview */}
                    <div className="bg-white rounded-lg border border-slate-200 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-5 h-5 text-slate-700" />
                        <h2 className="text-lg font-semibold text-slate-900">
                          Assignment Overview
                        </h2>
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap mb-6">
                        {assignment.instruction}
                      </p>

                      {/* Key Details - 4 columns */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 text-slate-400 mt-1" />
                          <div>
                            <p className="text-xs text-slate-500 uppercase">DUE DATE</p>
                            <p className="text-slate-900 font-medium">
                              {(() => {
                                const dueDate = new Date(assignment.dueDate);
                                if (isNaN(dueDate.getTime())) {
                                  return "No due date";
                                }
                                return `${dueDate.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}, ${dueDate.toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`;
                              })()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-slate-400 mt-1" />
                          <div>
                            <p className="text-xs text-slate-500 uppercase">METHOD</p>
                            <p className="text-slate-900 font-medium">
                              {assignment.allowedSubmissionMethod === "GITHUB" 
                                ? "GitHub Repository Submission" 
                                : assignment.allowedSubmissionMethod === "ZIP"
                                ? "File Upload"
                                : "Both Methods"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 flex items-center justify-center mt-1">
                            <span className="text-lg">📊</span>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase">MAX SCORE</p>
                            <p className="text-slate-900 font-medium">
                              {assignment.maxScore || 0} Points
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 flex items-center justify-center mt-1">
                            <span className="text-lg">⚠️</span>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase">LATE PENALTY</p>
                            <p className="text-slate-900 font-medium">
                              {assignment.penaltyCriteria || "10% off per day"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Resources */}
                    {assignment.resources && assignment.resources.length > 0 && (
                      <div className="bg-white rounded-lg border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            Resources
                          </h2>
                          <span className="text-sm text-slate-500">
                            {assignment.resources.length} File{assignment.resources.length !== 1 ? "s" : ""} attached
                          </span>
                        </div>
                        <div className="space-y-2">
                          {assignment.resources.map((resource) => (
                            <div
                              key={resource.id}
                              className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                            >
                              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-yellow-700" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-slate-900">
                                  {resource.resource.title || "Untitled Resource"}
                                </p>
                                <p className="text-xs text-slate-500 uppercase">
                                  {resource.resource.type || "FILE"}
                                </p>
                              </div>
                              <button className="p-2 hover:bg-yellow-100 rounded transition-colors">
                                <svg
                                  className="w-5 h-5 text-slate-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - AI Evaluation & Rubrics */}
                  <div className="space-y-6">
                    {/* AI Evaluation Card */}
                    <div className="bg-blue-600 rounded-lg p-6 text-white">
                      <div className="flex items-center gap-2 mb-4">
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                        <h2 className="text-lg font-semibold">AI Evaluation</h2>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-blue-100 text-sm mb-1">Status</p>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                assignment.aiEvaluationEnable ? "bg-green-400" : "bg-slate-400"
                              }`}
                            ></div>
                            <p className="font-semibold">
                              {assignment.aiEvaluationEnable
                                ? `Enabled (${assignment.aiModelSelectionMode === "SYSTEM" ? "System Mode" : "User Mode"})`
                                : "Disabled"}
                            </p>
                          </div>
                        </div>

                        {assignment.aiEvaluationEnable && (
                          <>
                            <div>
                              <p className="text-blue-100 text-sm mb-1">ASSIGNED MODEL</p>
                              <p className="font-semibold">
                                {assignment.aiModel?.name || "GPT-4o Educator"}
                              </p>
                              <p className="text-blue-100 text-xs">
                                {assignment.aiModel?.provider || "v2.1"}
                              </p>
                            </div>

                            <div>
                              <p className="text-blue-100 text-sm mb-1">EVALUATION FOCUS</p>
                              <p className="text-sm">
                                Logical structure, edge-case handling, and algorithmic complexity.
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Grading Rubrics */}
                    {assignment.rubrics && assignment.rubrics.length > 0 && (
                      <div className="bg-white rounded-lg border border-slate-200 p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <h2 className="text-lg font-semibold text-slate-900">
                            Grading Rubrics
                          </h2>
                        </div>
                        <div className="space-y-3">
                          {assignment.rubrics.map((rubric) => (
                            <div
                              key={rubric.id}
                              className="flex items-start justify-between py-3 border-b border-slate-100 last:border-0"
                            >
                              <div className="flex-1">
                                <p className="font-semibold text-slate-900">{rubric.definition}</p>
                                <p className="text-sm text-slate-500">
                                  {rubric.definition === "Code Quality" && "Readability, naming, structure"}
                                  {rubric.definition === "Correctness" && "Functionality & test cases"}
                                  {rubric.definition === "Documentation" && "Comments & README quality"}
                                </p>
                              </div>
                              <div className="ml-4 text-right">
                                <span className="text-2xl font-bold text-slate-900">
                                  {rubric.totalScore}
                                </span>
                                <span className="text-sm text-slate-500">pts</span>
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center justify-between pt-4 border-t-2 border-slate-200">
                            <p className="text-sm font-semibold text-slate-500 uppercase">TOTAL WEIGHT</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {assignment.maxScore} Points
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Delete Assignment */}
                    <div className="bg-white rounded-lg border border-red-200 p-6">
                      <button
                        onClick={handleDeleteAssignment}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                        <span className="font-medium">Delete Assignment</span>
                      </button>
                      <p className="text-xs text-slate-500 mt-2 text-center">
                        Warning: This action cannot be undone.
                      </p>
                    </div>
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
