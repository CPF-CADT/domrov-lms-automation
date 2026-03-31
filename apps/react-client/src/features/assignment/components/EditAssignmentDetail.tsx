import { useState, useEffect } from "react";
import { ArrowLeft, Upload, Link2, X, Eye, FileText, Video, Package, AlertTriangle, Loader2 } from "lucide-react";
import Dialog from "@/components/Dialog";
import { RubricEditor, type RubricItem } from "./RubricEditor";
import assessmentService from "@/services/assessmentService";
import { SubmissionType, SubmissionMethod } from "@/types/enums";
import type { AssessmentDetailDto, UpdateAssessmentDto } from "@/types/assessment";

interface EditAssignmentDetailProps {
  assignmentId: number | string;
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
  allowedSubmissionMethod: "GITHUB" | "ZIP" | "ANY";
  allowLateSubmissions: boolean;
  aiEvaluationEnabled: boolean;
  rubrics: RubricItem[];
}

function toLocalDatetime(raw: string | Date | undefined): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  // Format as YYYY-MM-DDTHH:MM for datetime-local input
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function mapDtoToForm(dto: AssessmentDetailDto): FormData {
  const method = String(dto.allowedSubmissionMethod ?? "GITHUB").toUpperCase();
  const type = String(dto.submissionType ?? "INDIVIDUAL").toLowerCase();
  const rubrics = dto.rubrics && dto.rubrics.length > 0 ? dto.rubrics : [{ definition: "Overall Score", totalScore: dto.maxScore ?? 100 }];
  return {
    title: dto.title ?? "",
    session: String(dto.session ?? "1"),
    submissionType: type === "team" ? "team" : "individual",
    instructions: dto.instruction ?? "",
    startDate: toLocalDatetime(dto.startDate),
    dueDate: toLocalDatetime(dto.dueDate),
    maxScore: Math.min(100, dto.maxScore ?? 100),
    allowedSubmissionMethod:
      method === "ZIP" ? "ZIP" : method === "ANY" ? "ANY" : "GITHUB",
    allowLateSubmissions: dto.allowLate ?? false,
    aiEvaluationEnabled: dto.aiEvaluationEnable ?? false,
    rubrics,
  };
}

function mapFormToDto(data: FormData): UpdateAssessmentDto {
  return {
    title: data.title,
    instruction: data.instructions,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    maxScore: data.maxScore,
    session: Number(data.session),
    allowLate: data.allowLateSubmissions,
    submissionType:
      data.submissionType === "team" ? SubmissionType.TEAM : SubmissionType.INDIVIDUAL,
    aiEvaluationEnable: data.aiEvaluationEnabled,
    allowedSubmissionMethod:
      data.allowedSubmissionMethod === "ZIP" ? SubmissionMethod.ZIP
        : data.allowedSubmissionMethod === "ANY" ? SubmissionMethod.ANY
          : SubmissionMethod.GITHUB,
    rubrics: data.rubrics.length > 0 ? data.rubrics : [{ definition: "Overall Score", totalScore: data.maxScore }],
  };
}

export default function EditAssignmentDetail({ assignmentId, onBack }: EditAssignmentDetailProps) {
  const id = Number(assignmentId);

  const [formData, setFormData] = useState<FormData | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<FormData | null>(null);

  // ─── Fetch assignment details ─────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const dto = await assessmentService.getAssessmentDetails(id);
        console.log("✅ Assignment details loaded:", dto);
        const mapped = mapDtoToForm(dto);
        if (!cancelled) {
          setFormData(mapped);
          setOriginalData(mapped);
        }
      } catch (err: any) {
        console.error("❌ Failed to load assignment:", err);
        if (!cancelled) setError("Could not load assignment details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  // Track changes
  useEffect(() => {
    if (!formData || !originalData) return;
    setHasChanges(JSON.stringify(formData) !== JSON.stringify(originalData));
  }, [formData, originalData]);

  // Auto-sync rubric totalScore when maxScore changes
  useEffect(() => {
    if (!formData) return;
    setFormData((prev) => {
      if (!prev) return prev;
      // Only auto-sync if there's a single "Overall Score" rubric
      if (
        prev.rubrics.length === 1 &&
        prev.rubrics[0].definition === "Overall Score" &&
        prev.rubrics[0].totalScore !== prev.maxScore
      ) {
        return {
          ...prev,
          rubrics: [{ definition: "Overall Score", totalScore: prev.maxScore }],
        };
      }
      return prev;
    });
  }, [formData?.maxScore]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    if (!formData) return;
    const { name, value, type } = e.currentTarget;
    setFormData((prev) => ({
      ...prev!,
      [name]:
        type === "checkbox"
          ? (e.currentTarget as HTMLInputElement).checked
          : name === "maxScore"
            ? Math.min(100, Math.max(1, Number(value)))
            : value,
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

  // ─── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    setIsSaving(true);
    setError(null);
    try {
      const dto = mapFormToDto(formData);
      console.log("📤 Updating assignment:", id, dto);
      await assessmentService.updateAssessment(id, dto);
      console.log("✅ Assignment updated");
      setTimeout(() => onBack(), 300);
    } catch (err: any) {
      console.error("❌ Update failed:", err);
      setError(err?.message ?? "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      setCancelDialogOpen(true);
    } else {
      onBack();
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-sm text-slate-500">Loading assignment...</span>
      </div>
    );
  }

  if (error && !formData) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 text-sm">{error}</p>
        <button onClick={onBack} className="mt-3 text-slate-600 text-sm underline">
          Go back
        </button>
      </div>
    );
  }

  if (!formData) return null;

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
          <h1 className="text-3xl font-bold text-slate-900">Edit Assignment</h1>
          <p className="mt-2 text-slate-600">Update assignment details and settings</p>
        </div>
      </div>

      {/* API Error */}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4 text-lg leading-none">×</button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
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
                    min="1"
                    className="w-full px-3 py-2.5 text-sm bg-white text-slate-900 border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
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
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-white text-slate-900 border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block mb-2 text-xs font-semibold tracking-wide uppercase text-slate-700">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-white text-slate-900 border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                    <span className="ml-1 text-slate-400 font-normal normal-case">(max 100)</span>
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
                    <option value="ZIP">ZIP Upload</option>
                    <option value="ANY">Any Method</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm font-medium text-slate-900">Late Submissions</p>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="allowLateSubmissions" checked={formData.allowLateSubmissions} onChange={handleInputChange} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm font-medium text-slate-900">AI Evaluation</p>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="aiEvaluationEnabled" checked={formData.aiEvaluationEnabled} onChange={handleInputChange} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </label>
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
              htmlFor="edit-file-upload"
              className="flex flex-col items-center justify-center p-8 mb-4 text-center transition-all border-2 border-dashed rounded-lg cursor-pointer border-slate-300 hover:border-blue-400 hover:bg-blue-50 group"
            >
              <Upload className="w-10 h-10 mx-auto mb-3 transition-colors text-slate-400 group-hover:text-blue-500" />
              <p className="text-sm font-medium transition-colors text-slate-700 group-hover:text-blue-700">Drop files to upload</p>
              <input type="file" multiple onChange={handleFileUpload} className="hidden" id="edit-file-upload" accept=".pdf,.docx,.zip,.mp4" />
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

        {/* Rubrics Section */}
        {formData && (
          <div className="p-6 bg-white text-black border rounded-lg border-slate-200">
            <RubricEditor
              rubrics={formData.rubrics}
              maxScore={formData.maxScore}
              onRubricsChange={(rubrics) => setFormData({ ...formData, rubrics })}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <button type="button" onClick={() => console.log("Preview:", formData)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors text-slate-600 hover:text-slate-900">
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <div className="flex gap-3">
            <button type="button" onClick={handleCancel} disabled={isSaving} className="px-4 py-2 text-sm font-medium transition-colors border rounded-lg text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !hasChanges}
              className="px-6 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save Changes"}
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
          { label: "Keep Editing", onClick: () => setCancelDialogOpen(false), variant: "secondary" },
          { label: "Discard Changes", onClick: () => { setCancelDialogOpen(false); onBack(); }, variant: "danger" },
        ]}
      />
    </div>
  );
}