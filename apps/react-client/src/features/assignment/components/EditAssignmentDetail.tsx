import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Upload, Link2, FileText, Eye, AlertTriangle, Sparkles, ChevronDown, Info, Trash } from "lucide-react";
import Dialog from "@/components/Dialog";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { RubricEditor, type RubricItem } from "./RubricEditor";
import assessmentService from "@/services/assessmentService";
import fileUploadService from "@/services/fileUploadService";
import { SubmissionType, SubmissionMethod } from "@/types/enums";
import type { UpdateAssessmentDto } from "@/types/assessment";

interface UploadedFile {
  id?: string;
  name: string;
  size: string;
  uploadedAt: string;
  path?: string;
  type?: 'file' | 'link';
  url?: string;
  resourceId?: number;
}

interface EditAssignmentDetailProps {
  assignmentId?: number | string;
  classId?: string;
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
  allowedSubmissionMethod: "GITHUB" | "ANY" | "ZIP";
  allowLateSubmissions: boolean;
  aiEvaluationEnabled: boolean;
  rubrics: RubricItem[];
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
  rubrics: [{ definition: "Overall Score", totalScore: 100 }],
};

function mapDtoToFormWithMethods(dto: any): FormData {
  const rubrics = dto.rubrics && dto.rubrics.length > 0 ? dto.rubrics : [{ definition: "Overall Score", totalScore: dto.maxScore ?? 100 }];
  return {
    title: dto.title ?? "",
    session: String(dto.session ?? "1"),
    submissionType: dto.submissionType?.toLowerCase() === "team" ? "team" : "individual",
    instructions: dto.instruction ?? "",
    startDate: dto.startDate ? new Date(dto.startDate).toISOString().slice(0, 16) : "",
    dueDate: dto.dueDate ? new Date(dto.dueDate).toISOString().slice(0, 16) : "",
    maxScore: Math.min(100, dto.maxScore ?? 100),
    allowedSubmissionMethod:
      dto.allowedSubmissionMethod === SubmissionMethod.ZIP ? "ZIP"
        : dto.allowedSubmissionMethod === SubmissionMethod.GITHUB ? "GITHUB"
          : "ANY",
    allowLateSubmissions: dto.allowLate ?? false,
    aiEvaluationEnabled: dto.aiEvaluationEnable ?? false,
    rubrics,
  };
}

function mapToDto(data: FormData, uploadedFiles: UploadedFile[]): UpdateAssessmentDto {
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
      data.allowedSubmissionMethod === "ANY" ? SubmissionMethod.ZIP
        : data.allowedSubmissionMethod === "ZIP" ? SubmissionMethod.ZIP
          : SubmissionMethod.GITHUB,
    rubrics: data.rubrics.length > 0 ? data.rubrics : [
      { definition: "Overall Score", totalScore: data.maxScore }
    ],
    resources: uploadedFiles
      .filter(file => file.resourceId)
      .map(file => ({ resourceId: file.resourceId! })),
  };
}

export default function EditAssignmentDetail({ assignmentId, classId, onBack }: EditAssignmentDetailProps) {
  const id = assignmentId ? Number(assignmentId) : 0;
  const isNewDraft = !assignmentId || id === 0 || isNaN(id);
  const draftKey = classId ? `draft_assignment_detail_${classId}` : "draft_assignment_detail";

  const [formData, setFormData] = useState<FormData>(() => {
    if (!isNewDraft) return DEFAULT_FORM;
    try {
      const saved = localStorage.getItem(draftKey);
      return saved ? { ...DEFAULT_FORM, ...JSON.parse(saved) } : DEFAULT_FORM;
    } catch {
      return DEFAULT_FORM;
    }
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(!isNewDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ index: number; file: UploadedFile } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(formData));
  }, [formData, draftKey]);

  useEffect(() => {
    if (isNewDraft) return;

    let cancelled = false;
    async function loadAssignment() {
      setLoading(true);
      setError(null);
      try {
        const dto = await assessmentService.getAssessmentDetails(id);
        console.log("✅ Assignment details loaded:", dto);
        const mapped = mapDtoToFormWithMethods(dto);
        if (!cancelled) {
          setFormData(mapped);

          // Load resources from the assignment
          if (dto.resources && Array.isArray(dto.resources)) {
            const files: UploadedFile[] = dto.resources.map((res: any) => ({
              id: String(res.id),
              name: res.resource?.title || "Untitled",
              size: "N/A",
              uploadedAt: res.created_at ? new Date(res.created_at).toLocaleString() : "Unknown",
              path: res.resource?.url || "",
              type: 'file' as const,
              url: res.resource?.url || "",
              resourceId: res.resource?.id,
            }));
            setUploadedFiles(files);
            console.log("✅ Resources loaded:", files);
          }
        }
      } catch (err: any) {
        console.error("❌ Failed to load assignment:", err);
        if (!cancelled) setError("Could not load assignment details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAssignment();
    return () => { cancelled = true; };
  }, [id, isNewDraft]);

  useEffect(() => {
    setFormData((prev) => {
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
  }, [formData.maxScore]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.currentTarget;
    const isCheckbox = type === "checkbox";
    const checkedValue = isCheckbox ? (e.currentTarget as HTMLInputElement).checked : false;

    setFormData((prev) => ({
      ...prev,
      [name]:
        isCheckbox
          ? checkedValue
          : name === "maxScore"
            ? Math.min(100, Math.max(1, Number(value)))
            : value,
    }));
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // Determine resourceType and resourceId based on mode
      const resourceType = isNewDraft ? 'class' : 'assessment';
      const resourceId = isNewDraft ? parseInt(classId || '0') : id;

      const uploadedFilesList: UploadedFile[] = [];

      for (const file of files) {
        const uploadResponse = await fileUploadService.uploadFileFlow(
          file,
          resourceType,
          resourceId,
          (progress) => {
            console.log(`Upload progress for ${file.name}: ${progress}%`);
          }
        );

        uploadedFilesList.push({
          name: file.name,
          size: formatFileSize(file.size),
          uploadedAt: 'Just now',
          path: uploadResponse.key,
          type: 'file',
          url: uploadResponse.key,
          resourceId: uploadResponse.resourceId,
        });
      }

      setUploadedFiles((prev) => [...prev, ...uploadedFilesList]);
      setSuccessMessage(`Successfully uploaded ${uploadedFilesList.length} file(s).`);
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddLink = async () => {
    if (!linkInput.trim()) return;

    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const notifyResponse = await fileUploadService.notifyBackendOfUpload({
        key: linkInput,
        filename: linkInput,
      });

      const newLink: UploadedFile = {
        name: linkInput,
        size: 'Link',
        uploadedAt: 'Just now',
        type: 'link',
        url: linkInput,
        resourceId: notifyResponse.resourceId,
      };

      setUploadedFiles((prev) => [...prev, newLink]);
      setLinkInput('');
      setSuccessMessage('Link added successfully.');
    } catch (error: any) {
      console.error('Link addition error:', error);
      setError(error.message || 'Failed to add link. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = (index: number, file: UploadedFile) => {
    setFileToDelete({ index, file });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;

    setIsDeleting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      setUploadedFiles((prev) => prev.filter((_, idx) => idx !== fileToDelete.index));
      setSuccessMessage(`"${fileToDelete.file.name}" has been deleted successfully.`);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    } catch (error: any) {
      console.error('Delete error:', error);
      setError(error.message || 'Failed to delete file. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleBrowseFiles = () => {
    fileInputRef.current?.click();
  }

  async function updateAssignmentData(): Promise<number> {
    const dto = mapToDto(formData, uploadedFiles);
    console.log("📤 Updating assignment:", id, dto);
    await assessmentService.updateAssessment(id, dto);
    console.log("✅ Assignment updated");
    return id;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dueDate) {
      setError("Please set a due date before publishing.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await assessmentService.publishAssessment(id);
      console.log("✅ Published:", id);
      setTimeout(() => onBack(), 500);
    } catch (err: any) {
      console.error("❌ Publish error:", err);
      setError(err?.message ?? "Failed to publish assignment. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.title.trim()) {
      setError("Please enter a title before saving.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await updateAssignmentData();
      console.log("✅ Changes saved");
      if (isNewDraft) localStorage.removeItem(draftKey);
      setTimeout(() => onBack(), 500);
    } catch (err: any) {
      console.error("❌ Save error:", err);
      setError(err?.message ?? "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => setResetDialogOpen(true);
  const handleCancel = () => setCancelDialogOpen(true);
  const handlePreview = () => console.log("Preview:", formData);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin inline-block">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
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
          <h1 className="text-3xl font-bold text-slate-900">{isNewDraft ? "Create Assignment" : "Edit Assignment"}</h1>
          <p className="mt-2 text-slate-600">{isNewDraft ? "Set up a new assignment with instructions, resources, and grading rules." : "Update assignment details and settings"}</p>
        </div>
      </div>

      {/* API Error */}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4 text-lg leading-none">×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Grid */}
        <div className="grid grid-cols-3 gap-6">

          {/* General Information */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold tracking-wider uppercase text-slate-900">General Information</h2>
              <span className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full">REQUIRED</span>
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
          <div className="bg-white border border-slate-200 rounded-lg p-6">
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
          <div className="bg-white border border-slate-200 rounded-lg p-6">
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
                    <option value="ZIP">ZIP File</option>
                    <option value="GITHUB">GitHub Repository</option>
                    <option value="ANY">Any (ZIP or GitHub)</option>
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
                  <input
                    type="checkbox"
                    name="aiEvaluationEnabled"
                    checked={formData.aiEvaluationEnabled}
                    onChange={(e) => {
                      const isChecked = (e.target as HTMLInputElement).checked;
                      handleInputChange(e);
                      if (isChecked) {
                        setAiExpanded(true);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* AI Evaluation Info Section */}
        {formData.aiEvaluationEnabled && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => setAiExpanded(!aiExpanded)}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wider uppercase text-slate-900">AI Evaluation Enabled</h3>
                  <p className="text-xs text-slate-600 mt-0.5">Automated grading with AI</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-600 transition-transform ${aiExpanded ? 'rotate-180' : ''}`} />
            </div>

            {aiExpanded && (
              <div className="space-y-4 pt-4 border-t border-blue-200">
                <div className="flex gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">How AI Evaluation Works:</p>
                    <ul className="space-y-1 list-disc list-inside text-blue-800">
                      <li>Students submit code or assignments</li>
                      <li>AI automatically analyzes and grades submissions</li>
                      <li>You review and adjust AI feedback & scores</li>
                      <li>Approved grades become visible to students</li>
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-lg border border-blue-100">
                    <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Status</p>
                    <p className="text-sm font-semibold text-green-600 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Enabled
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-blue-100">
                    <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Max Score</p>
                    <p className="text-sm font-semibold text-slate-900">{formData.maxScore} points</p>
                  </div>
                </div>

                <div className="p-3 bg-amber-100 text-amber-900 rounded-lg border border-amber-200 text-xs">
                  <strong>⚠️ Before Publishing:</strong> Make sure you've configured an AI provider in Dashboard → AI Evaluation settings.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Grid */}
        <div className="grid grid-cols-2 gap-6">

          {/* Instructions */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="mb-4 text-sm font-bold tracking-wider uppercase text-slate-900">
              Instructions <span className="text-red-500">*</span>
            </h2>
            <div className="overflow-hidden border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2 p-3 border-b border-slate-200 bg-slate-50">
                <button type="button" className="p-1 text-sm font-bold text-slate-700 rounded hover:bg-slate-200 transition-colors">B</button>
                <button type="button" className="p-1 text-sm italic text-slate-700 rounded hover:bg-slate-200 transition-colors">I</button>
                <button type="button" className="p-1 text-slate-700 rounded hover:bg-slate-200 transition-colors">≡</button>
                <button type="button" className="p-1 text-slate-700 rounded hover:bg-slate-200 transition-colors"><Link2 className="w-4 h-4" /></button>
              </div>
              <textarea
                name="instructions"
                value={formData.instructions}
                onChange={handleInputChange}
                placeholder="Outline expectations and deliverables..."
                className="w-full h-40 px-4 py-3 text-sm bg-white text-slate-900 resize-none placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Resources */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="mb-4 text-sm font-bold tracking-wider uppercase text-slate-900">Resources</h2>

            {/* Error Message Display */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-red-900 mb-1">Error</h4>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="shrink-0 text-red-600 hover:text-red-800 font-bold"
                >
                  ×
                </button>
              </div>
            )}

            {/* Success Message Display */}
            {successMessage && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-green-900 mb-1">Success</h4>
                  <p className="text-sm text-green-800">{successMessage}</p>
                </div>
                <button
                  onClick={() => setSuccessMessage(null)}
                  className="shrink-0 text-green-600 hover:text-green-800 font-bold"
                >
                  ×
                </button>
              </div>
            )}

            {/* File Upload Area */}
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-2xl p-8 text-center transition-all mb-6
                ${isDragging ? 'border-blue-500 bg-blue-50 cursor-pointer' : ''}
                ${!isDragging ? 'border-slate-300 hover:border-blue-400 hover:bg-slate-50 cursor-pointer' : ''}
              `}
              onClick={handleBrowseFiles}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileInput}
                className="hidden"
                accept=".pdf,.docx,.zip,.mp4,.ppt,.pptx"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-1">Drag and drop resources here</p>
                  <p className="text-xs text-slate-500">or <span className="text-blue-600 font-medium underline">browse from computer</span></p>
                </div>
                <p className="text-xs text-slate-400 mt-2">SUPPORTED: .PDF, .DOCX, .ZIP, .MP4, .PPT</p>
                {isUploading && (
                  <p className="text-sm text-blue-600 font-medium mt-2">Uploading...</p>
                )}
              </div>
            </div>

            {/* Link Input Area */}
            <div className="border-2 border-slate-300 rounded-2xl p-6 mb-6">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-slate-700">
                  Or Add a Link to External Resources
                </label>
                <input
                  type="url"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://example.com or https://drive.google.com/..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isUploading}
                />
                <button
                  onClick={handleAddLink}
                  disabled={!linkInput.trim() || isUploading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
                >
                  {isUploading ? 'Adding...' : 'Add Link'}
                </button>
                <p className="text-xs text-slate-500">
                  Add relevant links to help students: textbooks, documentation, tutorials, repositories, etc.
                </p>
              </div>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
                  Added Resources
                </h4>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-all group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${file.type === 'link' ? 'bg-green-100' : 'bg-blue-100'}`}>
                          {file.type === 'link' ? (
                            <span className="text-lg">🔗</span>
                          ) : (
                            <FileText className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {file.type === 'link' ? (
                              <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                {file.name}
                              </a>
                            ) : (
                              file.name
                            )}
                          </p>
                          <p className="text-xs text-slate-500">{file.size} • Added {file.uploadedAt}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(index, file);
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rubrics Section */}
        <div className="bg-white text-black border border-slate-200 rounded-lg p-6">
          <RubricEditor
            rubrics={formData.rubrics}
            maxScore={formData.maxScore}
            onRubricsChange={(rubrics) => setFormData({ ...formData, rubrics })}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <button type="button" onClick={handlePreview} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <div className="flex gap-3">
            <button type="button" onClick={handleReset} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg transition-colors hover:bg-slate-50 disabled:opacity-50">
              Reset
            </button>
            <button type="button" onClick={handleCancel} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg transition-colors hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving || !formData.title}
              className="px-6 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="submit"
              disabled={isSaving || !formData.title || formData.maxScore > 100}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {isSaving ? "Publishing..." : "Publish"}
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
          { label: isNewDraft ? "Keep Creating" : "Keep Editing", onClick: () => setCancelDialogOpen(false), variant: "secondary" },
          { label: "Discard", onClick: () => { setCancelDialogOpen(false); if (isNewDraft) localStorage.removeItem(draftKey); onBack(); }, variant: "danger" },
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
              if (isNewDraft) localStorage.removeItem(draftKey);
              setResetDialogOpen(false);
            },
            variant: "danger",
          },
        ]}
      />

      {/* Delete File Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        title="Delete Resource"
        message={`Are you sure you want to delete "${fileToDelete?.file.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setFileToDelete(null);
        }}
      />
    </div>
  );
}