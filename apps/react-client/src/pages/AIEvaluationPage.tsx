import MainNavigation from "@/components/navigation/Navigation";
import AIEvaluationSettings from "@/features/aiEvaluation/components/AIEvaluationSettings";

/**
 * AIEvaluationPage - Configure AI evaluation settings for the system.
 * Uses portal layout with sidebar navigation.
 */
export default function AIEvaluationPage() {
  const handleSave = (config: any) => {
    console.log("AI Config saved:", config);
    // You can add additional save logic here, such as API calls
  };

  const handleCancel = () => {
    console.log("AI Config cancelled");
    // You can add navigation logic here if needed
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <MainNavigation activeId="ai-evaluation" />
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              AI Evaluation Settings
            </h1>
            <p className="text-slate-600">
              Configure the AI models and API settings used for automated grading and feedback.
            </p>
          </div>
          
          <AIEvaluationSettings onSave={handleSave} onCancel={handleCancel} />
        </div>
      </div>
    </div>
  );
}
