import { useState, useEffect } from "react";
import { ArrowLeft, Upload, Link2, FileText, Video, Package, X, Eye, AlertTriangle } from "lucide-react";
import Dialog from "@/components/Dialog";
import assessmentService from "@/services/assessmentService";
import { SubmissionType, SubmissionMethod } from "@/types/enums";
import type { UpdateAssessmentDto } from "@/types/assessment";

interface CreateAssignmentDetailProps {
  classId: string;
  onBack: () => void;
}

interface FormData {
  title: string;
  session: string;
  submissionType: "individual" | "team";
  instructions: string;
  startDate: string;
  dueDate: string;
  maxScore: number;
  allowedSubmissionMethod: "GITHUB" | "UPLOAD" | "LINK";
  allowLateSubmissions: boolean;
  aiEvaluationEnabled: boolean;
}

const DEFAULT_FORM: FormData = {
  title: "",
  session: "1",
  submissionType: "individual",
  instructions: "",
  startDate: "",
  dueDate: "",
  maxScore: 100,
  allowedSubmissionMethod: "GITHUB",
  allowLateSubmissions: false,
  aiEvaluationEnabled: false,
};

function mapToDto(data: FormData): UpdateAssessmentDto {
  return {
    title: data.title,
    instruction: data.instructions,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    maxScore: data.maxScore,
    session: Number(data.session),
    allowLate: data.allowLateSubmissions,
    submissionType: data.submissionType === "team"
      ? SubmissionType.TEAM
      : SubmissionType.INDIVIDUAL,
    aiEvaluationEnable: data.aiEvaluationEnabled,
    allowedSubmissionMethod:
      data.allowedSubmissionMethod === "UPLOAD" ? SubmissionMethod.ZIP
      : data.allowedSubmissionMethod === "LINK"   ? SubmissionMethod.GITHUB
      : SubmissionMethod.ANY,
    rubrics: [
      { definition: "Overall Score", totalScore: data.maxScore }
    ],
  };
}

export default function CreateAssignmentDetail({ classId, onBack }: CreateAssignmentDetailProps) {
  const draftKey = `draft_assignment_detail_${classId}`;

  const [formData, setFormData] = useState<FormData>(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      return saved ? { ...DEFAULT_FORM, ...JSON.parse(saved) } : DEFAULT_FORM;
    } catch {
      return DEFAULT_FORM;
    }
  });

  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(formData));
  }, [formData, draftKey]);

  // ─── Input handlers ──────────────────────────────────────────────────────

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.currentTarget;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.currentTarget as HTMLInputElement).checked
          : name === "maxScore"
            // ✅ Clamp maxScore between 1 and 100
            ? Math.min(100, Math.max(1, Number(value)))
            : value,
    }));
  };

  const handleToggleLateSubmissions = () => {
    setFormData((prev) => ({
      ...prev,
      allowLateSubmissions: !prev.allowLateSubmissions,
    }));
  };

  const handleToggleAIEvaluation = () => {
    setFormData((prev) => ({
      ...prev,
      aiEvaluationEnabled: !prev.aiEvaluationEnabled,
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles((prev) => [
      ...prev,
      ...files.map((f) => ({ name: f.name, type: f.type })),
    ]);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Shared: Step 1 + Step 2 ─────────────────────────────────────────────

  async function createAndUpdate(): Promise<number> {
    const draftRes = await assessmentService.createAssessmentDraft(
      Number(classId),
      Number(formData.session)
    );
    const draftId = draftRes.data.assessmentId;
    console.log("✅ Step 1 - Draft created, ID:", draftId);
    if (!draftId) throw new Error("No assessmentId returned from createAssessmentDraft");

    const dto = mapToDto(formData);
    console.log("📤 Step 2 - Updating with:", dto);
    await assessmentService.updateAssessment(draftId, dto);
    console.log("✅ Step 2 - Updated");
    return draftId;
  }

  // ─── Publish ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dueDate) {
      setError("Please set a due date before publishing.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const draftId = await createAndUpdate();
      await assessmentService.publishAssessment(draftId);
      console.log("✅ Step 3 - Published:", draftId);
      localStorage.removeItem(draftKey);
      setTimeout(() => onBack(), 500);
    } catch (err: any) {
      console.error("❌ Publish error:", err);
      setError(err?.message ?? "Failed to publish assignment. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Save as Draft ────────────────────────────────────────────────────────

  const handleSaveDraft = async () => {
    if (!formData.title.trim()) {
      setError("Please enter a title before saving.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await createAndUpdate();
      console.log("✅ Draft saved");
      localStorage.removeItem(draftKey);
      setTimeout(() => onBack(), 500);
    } catch (err: any) {
      console.error("❌ Save draft error:", err);
      setError(err?.message ?? "Failed to save draft. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => setResetDialogOpen(true);
  const handleCancel = () => setCancelDialogOpen(true);
  const handlePreview = () => console.log("Preview:", formData);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={handleCancel}
          className="flex items-center justify-center transition-colors rounded-lg w-9 h-9 hover:bg-slate-100 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Create Assignment</h1>
          <p className="mt-2 text-slate-600">Set up a new assignment with instructions, resources, and grading rules.</p>
        </div>
      </div>

      {/* API Error */}
      {error && (
        <div className="flex items-center justify-between px-4 py-3 mb-6 border border-red-200 rounded-lg bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => setError(null)} className="ml-4 text-lg leading-none text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Grid */}
        <div className="grid grid-cols-3 gap-6">

          {/* General Information */}
          <div className="p-6 bg-white border rounded-lg border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold tracking-wider uppercase text-slate-900">General Information</h2>
              <span className="px-3 py-1 text-xs font-semibold text-blue-600 rounded-full bg-blue-50">REQUIRED</span>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block mb-2 text-xs font-semibold tracking-wide uppercase text-slate-700">
                  Assignment Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Advanced Database Systems Project"
                  className="w-full px-3 py-2.5 text-sm bg-white text-slate-900 border border-slate-200 rounded-lg placeholder-slate-400 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-2 text-xs font-semibold tracking-wide uppercase text-slate-700">
                    Session # <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="session"
                    value={formData.session}
                    onChange={handleInputChange}
                    placeholder="1"
                    min="1"
                    className="w-full px-3 py-2.5 text-sm bg-white text-slate-900 border border-slate-200 rounded-lg placeholder-slate-400 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="mt-1 text-xs text-slate-400">Session number e.g. 1, 2, 3</p>
                </div>
                <div>
                  <label className="block mb-2 text-xs font-semibold tracking-wide uppercase text-slate-700">Type</label>
                  <select
                    name="submissionType"
                    value={formData.submissionType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 text-sm bg-white text-slate-900 border border-slate-200 rounded-lg appearance-none cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="individual">Individual</option>
                    <option value="team">Team</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Scheduling */}
          <div className="p-6 bg-white border rounded-lg border-slate-200">
            <h2 className="mb-6 text-sm font-bold tracking-wider uppercase text-slate-900">Scheduling</h2>
            <div className="space-y-5">
              <div>
                <label className="block mb-2 text-xs font-semibold tracking-wide uppercase text-slate-700">Start Date</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2.5 text-sm bg-white text-slate-900 border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block mb-2 text-xs font-semibold tracking-wide uppercase text-slate-700">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2.5 text-sm bg-white text-slate-900 border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Grading & Rules */}
          <div className="p-6 bg-white border rounded-lg border-slate-200">
            <h2 className="mb-6 text-sm font-bold tracking-wider uppercase text-slate-900">Grading & Rules</h2>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-2 text-xs font-semibold tracking-wide uppercase text-slate-700">
                    Max Score
                    <span className="ml-1 font-normal normal-case text-slate-400">(max 100)</span>
                  </label>
                  <input
                    type="number"
                    name="maxScore"
                    value={formData.maxScore}
                    onChange={handleInputChange}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2.5 text-sm bg-white text-slate-900 border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  {/* ✅ Show warning if somehow over 100 */}
                  {formData.maxScore > 100 && (
                    <p className="mt-1 text-xs text-red-500">Maximum score is 100</p>
                  )}
                </div>
                <div>
                  <label className="block mb-2 text-xs font-semibold tracking-wide uppercase text-slate-700">Method</label>
                  <select
                    name="allowedSubmissionMethod"
                    value={formData.allowedSubmissionMethod}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 text-sm bg-white text-slate-900 border border-slate-200 rounded-lg appearance-none cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="GITHUB">GitHub</option>
                    <option value="UPLOAD">File Upload</option>
                    <option value="LINK">Link</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm font-medium text-slate-900">Late Submissions</p>
                <button
                  type="button"
                  onClick={handleToggleLateSubmissions}
                  className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${
                    formData.allowLateSubmissions ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      formData.allowLateSubmissions ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm font-medium text-slate-900">AI Evaluation</p>
                <button
                  type="button"
                  onClick={handleToggleAIEvaluation}
                  className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${
                    formData.aiEvaluationEnabled ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      formData.aiEvaluationEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-2 gap-6">

          {/* Instructions */}
          <div className="p-6 bg-white border rounded-lg border-slate-200">
            <h2 className="mb-4 text-sm font-bold tracking-wider uppercase text-slate-900">
              Instructions <span className="text-red-500">*</span>
            </h2>
            <div className="overflow-hidden border rounded-lg border-slate-200">
              <div className="flex items-center gap-2 p-3 border-b border-slate-200 bg-slate-50">
                <button type="button" className="p-1 text-sm font-bold transition-colors rounded text-slate-700 hover:bg-slate-200">B</button>
                <button type="button" className="p-1 text-sm italic transition-colors rounded text-slate-700 hover:bg-slate-200">I</button>
                <button type="button" className="p-1 transition-colors rounded text-slate-700 hover:bg-slate-200">≡</button>
                <button type="button" className="p-1 transition-colors rounded text-slate-700 hover:bg-slate-200"><Link2 className="w-4 h-4" /></button>
              </div>
              <textarea
                name="instructions"
                value={formData.instructions}
                onChange={handleInputChange}
                placeholder="Outline expectations and deliverables..."
                className="w-full h-40 px-4 py-3 text-sm bg-white resize-none text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Resources */}
          <div className="p-6 bg-white border rounded-lg border-slate-200">
            <h2 className="mb-4 text-sm font-bold tracking-wider uppercase text-slate-900">Resources</h2>
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center p-8 mb-4 text-center transition-all border-2 border-dashed rounded-lg cursor-pointer border-slate-300 hover:border-blue-400 hover:bg-blue-50 group"
            >
              <Upload className="w-10 h-10 mx-auto mb-3 transition-colors text-slate-400 group-hover:text-blue-500" />
              <p className="text-sm font-medium transition-colors text-slate-700 group-hover:text-blue-700">Drop files to upload</p>
              <input type="file" multiple onChange={handleFileUpload} className="hidden" id="file-upload" accept=".pdf,.docx,.zip,.mp4" />
            </label>
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 transition-colors border rounded-lg border-slate-200 bg-slate-50 hover:bg-slate-100">
                    <div className="flex items-center flex-1 min-w-0 gap-3">
                      {file.type.includes("pdf") ? <FileText className="w-5 h-5 text-red-500 shrink-0" />
                        : file.type.includes("video") ? <Video className="w-5 h-5 text-blue-500 shrink-0" />
                        : <Package className="w-5 h-5 text-slate-500 shrink-0" />}
                      <span className="text-sm font-medium truncate text-slate-900">{file.name}</span>
                    </div>
                    <button type="button" onClick={() => handleRemoveFile(index)} className="flex-shrink-0 p-1 ml-2 transition-colors text-slate-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <button type="button" onClick={handlePreview} className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors text-slate-600 hover:text-slate-900">
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <div className="flex gap-3">
            <button type="button" onClick={handleReset} disabled={isSaving} className="px-4 py-2 text-sm font-medium transition-colors border rounded-lg text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-50">
              Reset
            </button>
            <button type="button" onClick={handleCancel} disabled={isSaving} className="px-4 py-2 text-sm font-medium transition-colors border rounded-lg text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving || !formData.title}
              className="px-4 py-2 text-sm font-medium transition-colors border rounded-lg text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save as Draft"}
            </button>
            <button
              type="submit"
              disabled={isSaving || !formData.title || formData.maxScore > 100}
              className="px-6 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {isSaving ? "Publishing..." : "Publish & Notify"}
            </button>
          </div>
        </div>
      </form>

      {/* Cancel Dialog */}
      <Dialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        title="Unsaved Changes"
        description="Are you sure you want to cancel? Unsaved changes will be lost."
        icon={<AlertTriangle className="w-6 h-6 text-yellow-600" />}
        iconBgColor="bg-yellow-100"
        buttons={[
          { label: "Keep Creating", onClick: () => setCancelDialogOpen(false), variant: "secondary" },
          { label: "Discard", onClick: () => { setCancelDialogOpen(false); localStorage.removeItem(draftKey); onBack(); }, variant: "danger" },
        ]}
      />

      {/* Reset Dialog */}
      <Dialog
        isOpen={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        title="Clear All Fields"
        description="Are you sure you want to clear all fields? This action cannot be undone."
        icon={<AlertTriangle className="w-6 h-6 text-orange-600" />}
        iconBgColor="bg-orange-100"
        buttons={[
          { label: "Keep Editing", onClick: () => setResetDialogOpen(false), variant: "secondary" },
          {
            label: "Clear Fields",
            onClick: () => {
              setFormData(DEFAULT_FORM);
              setUploadedFiles([]);
              localStorage.removeItem(draftKey);
              setResetDialogOpen(false);
            },
            variant: "danger",
          },
        ]}
      />
    </div>
  );
}