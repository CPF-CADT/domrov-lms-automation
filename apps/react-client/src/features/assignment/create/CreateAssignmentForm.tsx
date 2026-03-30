import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/Toast";
import assessmentService from "@/services/assessmentService";
import axiosInstance from "@/lib/axiosInstance";
import { SubmissionType, SubmissionMethod } from "@/types/enums";

interface CreateAssignmentData {
  title: string;
  session: string;
  submissionType: "individual" | "team";
  instructions: string;
  startDate: string;
  dueDate: string;
  maxScore: number;
  allowedSubmissionMethod: "zip" | "github" | "any";
  allowLateSubmissions: boolean;
  aiEvaluationEnabled: boolean;
  learningResources: File[];
}

const DEFAULT_FORM: CreateAssignmentData = {
  title: "",
  session: "1",
  submissionType: "individual",
  instructions: "",
  startDate: "",
  dueDate: "",
  maxScore: 100,
  allowedSubmissionMethod: "github",
  allowLateSubmissions: false,
  aiEvaluationEnabled: false,
  learningResources: [],
};

function mapToFormData(data: CreateAssignmentData): FormData {
  let submissionType: SubmissionType = SubmissionType.INDIVIDUAL;
  if (data.submissionType === "team") submissionType = SubmissionType.TEAM;

  let allowedSubmissionMethod: SubmissionMethod = SubmissionMethod.ANY;
  if (data.allowedSubmissionMethod === "zip") allowedSubmissionMethod = SubmissionMethod.ZIP;
  else if (data.allowedSubmissionMethod === "github") allowedSubmissionMethod = SubmissionMethod.GITHUB;

  const dto = {
    title: data.title,
    instruction: data.instructions,
    startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
    dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
    maxScore: String(data.maxScore),
    session: String(Number(data.session)),
    allowLate: String(data.allowLateSubmissions),
    submissionType,
    aiEvaluationEnable: String(data.aiEvaluationEnabled),
    allowedSubmissionMethod,
  };

  const form = new FormData();
  Object.entries(dto).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, value);
    }
  });
  data.learningResources.forEach((file) => {
    form.append("files", file);
  });

  return form;
}

export default function CreateAssignmentForm({ classId }: { classId: string }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const draftKey = `draft_assignment_${classId}`;

  const [formData, setFormData] = useState<CreateAssignmentData>(DEFAULT_FORM);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string }[]>([]);
  const [loading, setLoading] = useState<"draft" | "publish" | null>(null);

  // Load saved draft on mount (exclude File objects — they can't survive JSON)
  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData({ ...DEFAULT_FORM, ...parsed, learningResources: [] });
      } catch {
        // ignore corrupt draft
      }
    }
  }, [draftKey]);

  // Auto-save text fields to localStorage on every change
  useEffect(() => {
    const { learningResources: _files, ...rest } = formData;
    localStorage.setItem(draftKey, JSON.stringify(rest));
  }, [formData, draftKey]);

  // ─── Input handlers ────────────────────────────────────────────────────────

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.currentTarget;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox"
        ? (e.currentTarget as HTMLInputElement).checked
        : value,
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData((prev) => ({
      ...prev,
      learningResources: [...prev.learningResources, ...files],
    }));
    setUploadedFiles((prev) => [
      ...prev,
      ...files.map((f) => ({ name: f.name, type: f.type })),
    ]);
  };

  const handleRemoveFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      learningResources: prev.learningResources.filter((_, i) => i !== index),
    }));
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setFormData(DEFAULT_FORM);
    setUploadedFiles([]);
    localStorage.removeItem(draftKey);
  };

  // ─── Shared: create draft + update ────────────────────────────────────────

  async function createAndUpdate(): Promise<number> {
    const draftRes = await assessmentService.createAssessmentDraft(
      Number(classId),
      Number(formData.session)
    );
    const draftId = draftRes.assessmentId;
    const form = mapToFormData(formData);
    await axiosInstance.patch(`/assessments/${draftId}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return draftId;
  }

  // ─── Save as Draft: create + update, NO publish call ──────────────────────

  const handleSaveDraft = async () => {
    if (!formData.title.trim()) {
      showToast("Please enter a title before saving.", "error", 3000);
      return;
    }
    setLoading("draft");
    try {
      await createAndUpdate();
      showToast("✅ Draft saved!", "success", 3000);
      localStorage.removeItem(draftKey);
      handleReset();
    } catch (err) {
      console.error("Save draft error:", err);
      showToast("❌ Failed to save draft.", "error", 3000);
    }
    setLoading(null);
  };

  // ─── Publish: create + update + publish ───────────────────────────────────

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dueDate) {
      showToast("Please set a due date before publishing.", "error", 3000);
      return;
    }
    setLoading("publish");
    try {
      const draftId = await createAndUpdate();
      await assessmentService.publishAssessment(draftId);
      showToast("✅ Assignment published!", "success", 3000);
      localStorage.removeItem(draftKey);
      setTimeout(() => {
        navigate(`/class/${classId}`, { state: { activeTab: "assignment" } });
      }, 500);
    } catch (err) {
      console.error("Publish error:", err);
      showToast("❌ Failed to publish assignment.", "error", 3000);
    }
    setLoading(null);
  };

  // ─── Create: create draft and navigate to assignment detail ────────────────

  const handleCreate = async () => {
    setLoading("publish");
    try {
      const response = await assessmentService.createAssessmentDraft(Number(classId), Number(formData.session));

      // Use the correct property for assignment ID
      const assignmentId = response.assessmentId;
      navigate(`/class/${classId}/assignment/${assignmentId}`);

      showToast("Assignment created successfully.", "success");
    } catch (error) {
      console.error("Failed to create assignment:", error);
      showToast("Failed to create assignment. Please try again.", "error");
    } finally {
      setLoading(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-4 bg-slate-50 min-h-screen">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-5">
        <form onSubmit={handlePublish} className="space-y-4">

          {/* Header */}
          <div>
            <h1 className="text-xl font-bold text-slate-900">Create Assignment</h1>
            <p className="text-xs text-slate-500 mt-0.5">Class {classId}</p>
          </div>

          {/* General Information */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">General Information</h2>

            <div>
              <label className="block mb-1 text-xs font-medium text-slate-700">
                Assignment Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. WB-CHALLENGE-Weather"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block mb-1 text-xs font-medium text-slate-700">
                  Session # <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="session"
                  value={formData.session}
                  onChange={handleChange}
                  placeholder="1"
                  min="1"
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
                <p className="mt-0.5 text-xs text-slate-400">Session number e.g. 1, 2, 3</p>
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-slate-700">
                  Submission Type
                </label>
                <select
                  name="submissionType"
                  value={formData.submissionType}
                  onChange={handleChange}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none"
                >
                  <option value="individual">Individual</option>
                  <option value="team">Team</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-1 text-xs font-medium text-slate-700">
                Instructions <span className="text-red-500">*</span>
              </label>
              <textarea
                name="instructions"
                value={formData.instructions}
                onChange={handleChange}
                placeholder="Outline expectations and deliverables..."
                className="w-full h-20 px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                required
              />
            </div>
          </section>

          {/* Scheduling & Grading */}
          <section className="pt-3 border-t border-slate-200 space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">Scheduling & Grading</h2>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block mb-1 text-xs font-medium text-slate-700">Start Date</label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-slate-700">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block mb-1 text-xs font-medium text-slate-700">Max Score</label>
                <input
                  type="number"
                  name="maxScore"
                  value={formData.maxScore}
                  onChange={handleChange}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-slate-700">Submission Method</label>
                <select
                  name="allowedSubmissionMethod"
                  value={formData.allowedSubmissionMethod}
                  onChange={handleChange}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none"
                >
                  <option value="github">GitHub</option>
                  <option value="zip">ZIP Upload</option>
                  <option value="any">Any</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-900">Late Submissions</p>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="allowLateSubmissions"
                    checked={formData.allowLateSubmissions}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-5 bg-slate-300 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                </label>
              </div>
              <div className="flex items-center justify-between p-2 border border-purple-200 rounded bg-purple-50">
                <div>
                  <p className="text-xs font-medium text-slate-900">AI Evaluation</p>
                  <p className="text-xs text-slate-500">Auto-analyze submissions</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    name="aiEvaluationEnabled"
                    checked={formData.aiEvaluationEnabled}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-5 bg-slate-300 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                </label>
              </div>
            </div>
          </section>

          {/* Learning Resources */}
          <section className="pt-3 border-t border-slate-200">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Learning Resources</h2>
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center p-3 text-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 group transition-colors"
            >
              <p className="text-xs font-medium text-slate-900 group-hover:text-blue-700">Click to upload files</p>
              <p className="text-xs text-slate-500 mt-0.5">PDF, DOCX, ZIP or MP4</p>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept=".pdf,.docx,.zip,.mp4"
              />
            </label>
            {uploadedFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border border-slate-200 rounded-lg bg-slate-50">
                    <span className="text-xs font-medium truncate text-slate-900">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="text-xs text-red-500 hover:text-red-700 ml-2 shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleReset}
              disabled={!!loading}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium disabled:opacity-50"
            >
              Reset
            </button>
            <div className="flex gap-2">
              {/*
                DRAFT button:
                - Calls createAssessmentDraft + updateAssessment
                - Does NOT call publishAssessment
                - Assignment stays in draft state in the backend
              */}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={!!loading}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium disabled:opacity-50"
              >
                {loading === "draft" ? "Saving..." : "Save Draft"}
              </button>

              {/*
                PUBLISH button:
                - Calls createAssessmentDraft + updateAssessment + publishAssessment
                - Assignment is immediately live for students
                - Navigates back to assignments tab after success
              */}
              <button
                type="submit"
                disabled={!!loading}
                className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {loading === "publish" ? "Publishing..." : "Publish"}
              </button>
            </div>
          </div>

          {/* Create Assignment button */}
          <div className="pt-3">
            <button
              onClick={handleCreate}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={loading === "publish"}
            >
              {loading === "publish" ? "Creating..." : "Create Assignment"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}