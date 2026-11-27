import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainNavigation from "@/components/navigation/MainNavigation";
import AIEvaluationSettings from "@/pages/ai-evaluation/components/AIEvaluationSettings";
import ProfileDropdown from "@/components/data-display/ProfileDropdown";
import evaluationService from "@/services/evaluationService";

type FreeQuota = { model: string; limit: number; used: number; remaining: number };

/**
 * AIEvaluationPage - Configure AI evaluation settings for the system.
 * Uses portal layout with sidebar navigation.
 */
export default function AIEvaluationPage() {
  const navigate = useNavigate();
  const [freeQuota, setFreeQuota] = useState<FreeQuota | null>(null);

  useEffect(() => {
    evaluationService.getFreeEvaluationQuota().then(setFreeQuota).catch(() => setFreeQuota(null));
  }, []);

  const handleSave = (config: any) => {
    console.log("AI Config saved:", config);
    // You can add additional save logic here, such as API calls
  };

  const handleCancel = () => {
    console.log("AI Config cancelled");
    // You can add navigation logic here if needed
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <MainNavigation activeId="ai-evaluation" />
      <div className="flex-1 flex flex-col">
        <header className="bg-primary text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="p-2 hover:bg-blue-700 rounded-lg transition-colors" title="Go back to dashboard">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <p className="text-xs text-blue-100">Dashboard</p>
              <h1 className="text-xl font-semibold">AI Evaluation</h1>
            </div>
          </div>
          <ProfileDropdown buttonClassName="h-10 w-10 rounded-lg bg-primary-600 hover:bg-primary-700 flex items-center justify-center text-white font-bold transition-colors border-2 border-white" />
        </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="w-full">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                AI Evaluation Settings
              </h1>
              <p className="text-slate-600">
                Configure options for automated grading and feedback.
              </p>
            </div>

            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
              <p className="font-semibold">Included local model: Qwen2.5 7B Instruct via Ollama</p>
              {freeQuota && <p className="mt-1">Free evaluations this month: {freeQuota.remaining} of {freeQuota.limit} remaining.</p>}
              <p className="mt-1 text-blue-800">The shared local model is used for grading. Saved personal provider settings are not yet selected by assignment evaluations.</p>
            </div>

            <AIEvaluationSettings onSave={handleSave} onCancel={handleCancel} />
          </div>
        </div>
      </div>
    </div>
  );
}
