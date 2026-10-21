import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/Toast";
import assessmentService from "@/services/AssessmentService";
import teamService from "@/services/TeamService";
import type { TeamResponseDto } from "@/types/Team";
import { SubmissionType, SubmissionMethod } from "@/types/Enums";
import type { UpdateAssessmentDto } from "@/types/Assessment";
import { storage } from "@/lib/Storage";
import { routes } from "@/lib/routes";

interface CreateAssignmentData {
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
  allowedTeamIds: number[];
}

const DEFAULT_FORM: CreateAssignmentData = {
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
  allowedTeamIds: [],
};

/**
 * Maps form data to UpdateAssessmentDto — matching exact types the backend expects.
 */
function mapToDto(data: CreateAssignmentData): UpdateAssessmentDto {
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
    allowedTeamIds: data.submissionType === "team" ? data.allowedTeamIds : [],
    allowedSubmissionMethod:
      data.allowedSubmissionMethod === "UPLOAD" ? SubmissionMethod.ANY
      : data.allowedSubmissionMethod === "LINK"   ? SubmissionMethod.ANY
      : SubmissionMethod.GITHUB,
  };
}

export default function CreateAssignmentForm({ classId }: { classId: string }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const draftKey = `draft_assignment_${classId}`;

  const [formData, setFormData] = useState<CreateAssignmentData>(DEFAULT_FORM);
  const [loading, setLoading] = useState<null | "draft" | "publish">(null);
  const [teams, setTeams] = useState<TeamResponseDto[]>([]);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  useEffect(() => {
    if (formData.submissionType !== "team") return;
    teamService.getTeamsByClass(Number(classId)).then(setTeams).catch(() => setTeamsError("Unable to load class teams."));
  }, [classId, formData.submissionType]);

  // Load local draft on mount
  useEffect(() => {
    const saved = storage.get(draftKey);
    if (saved) {
      try {
        setFormData({ ...DEFAULT_FORM, ...JSON.parse(saved) });
      } catch {
        // ignore corrupt data
      }
    }
  }, [draftKey]);

  // Auto-save to localStorage on every change
  useEffect(() => {
    storage.setJson(draftKey, formData);
  }, [formData, draftKey]);

  // ─── Shared: step 1 + step 2 ──────────────────────────────────────────────

  async function createAndUpdate(): Promise<number> {
    // Step 1 — create draft (only needs classId + session)
    const draftRes = await assessmentService.createAssessmentDraft(
      Number(classId),
      Number(formData.session)
    );

    console.log("✅ Step 1 - Draft created:", draftRes);
    const draftId = draftRes.assessmentId;
    console.log("✅ Draft ID:", draftId);

    if (!draftId) throw new Error("No assessmentId returned from createAssessmentDraft");

    // Step 2 — update draft with all form fields as JSON (matches UpdateAssessmentDto)
    const dto = mapToDto(formData);
    console.log("📤 Step 2 - Updating with:", dto);

    const updateRes = await assessmentService.updateAssessment(draftId, dto);
    console.log("✅ Step 2 - Updated:", updateRes);

    return draftId;
  }

  // ─── Save as Draft ─────────────────────────────────────────────────────────

  const handleSaveDraft = async () => {
    if (!formData.title.trim()) {
      showToast("Please enter a title before saving.", "error", 3000);
      return;
    }
    setLoading("draft");
    try {
      await createAndUpdate();
      // Step 3 intentionally skipped — stays as draft
      showToast("✅ Draft saved!", "success", 3000);
      storage.remove(draftKey);
      setFormData(DEFAULT_FORM);
    } catch (err: any) {
      console.error("❌ Save draft error:", err);
      showToast(`❌ Failed to save draft: ${err?.message ?? "Unknown error"}`, "error", 4000);
    }
    setLoading(null);
  };

  // ─── Publish ───────────────────────────────────────────────────────────────

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dueDate) {
      showToast("Please set a due date before publishing.", "error", 3000);
      return;
    }
    if (formData.submissionType === "team" && formData.allowedTeamIds.length === 0) {
      showToast("Select at least one team before publishing.", "error", 3000);
      return;
    }
    setLoading("publish");
    try {
      const draftId = await createAndUpdate();

      // Step 3 — publish
      console.log("📤 Step 3 - Publishing:", draftId);
      const publishRes = await assessmentService.publishAssessment(draftId);
      console.log("✅ Step 3 - Published:", publishRes);

      showToast("✅ Assignment published!", "success", 3000);
      storage.remove(draftKey);
      setTimeout(() => {
        navigate(routes.classAssignments(classId));
      }, 500);
    } catch (err: any) {
      console.error("❌ Publish error:", err);
      showToast(`❌ Failed to publish: ${err?.message ?? "Unknown error"}`, "error", 4000);
    }
    setLoading(null);
  };

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

  const handleReset = () => {
    setFormData(DEFAULT_FORM);
    storage.remove(draftKey);
  };

  const toggleTeam = (teamId: number) => {
    setFormData((prev) => ({
      ...prev,
      allowedTeamIds: prev.allowedTeamIds.includes(teamId)
        ? prev.allowedTeamIds.filter((id) => id !== teamId)
        : [...prev.allowedTeamIds, teamId],
    }));
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
                <label className="block mb-1 text-xs font-medium text-slate-700">Submission Type</label>
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

            {formData.submissionType === "team" && (
              <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                <label className="block mb-2 text-xs font-semibold text-slate-700">Allowed teams</label>
                {teamsError && <p className="text-xs text-red-600">{teamsError}</p>}
                {!teamsError && teams.length === 0 && <p className="text-xs text-slate-500">No teams are available in this class.</p>}
                <div className="space-y-2">
                  {teams.map((team) => (
                    <label key={team.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={formData.allowedTeamIds.includes(team.id)} onChange={() => toggleTeam(team.id)} />
                      <span>{team.name}</span>
                      <span className="text-xs text-slate-500">({team.members?.length ?? 0} members)</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

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
                  <option value="GITHUB">GitHub</option>
                  <option value="UPLOAD">File Upload</option>
                  <option value="LINK">Link</option>
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
                SAVE AS DRAFT:
                Step 1 (createDraft) + Step 2 (updateAssessment)
                NO publishAssessment call → stays draft in backend
              */}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={!!loading}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium disabled:opacity-50"
              >
                {loading === "draft" ? "Saving..." : "Save as Draft"}
              </button>

              {/*
                PUBLISH:
                Step 1 (createDraft) + Step 2 (updateAssessment) + Step 3 (publishAssessment)
                → assignment is live for students immediately
              */}
              <button
                type="submit"
                disabled={!!loading}
                className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {loading === "publish" ? "Publishing..." : "Publish & Notify"}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
