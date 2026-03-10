"use client";

import React from "react";
import AIEvaluationSettings from "@/ui/features/aiEvaluation/components/AIEvaluationSettings";

export default function AIEvaluationPage() {
  const handleSave = (config: any) => {
    console.log("Configuration saved:", config);
    // TODO: Send to backend API
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-10 py-8">
          <h1 className="text-4xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 text-base mt-2">
            Manage your educator profile and AI-assisted grading configurations.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-10 py-12">
        <AIEvaluationSettings onSave={handleSave} />
      </div>
    </div>
  );
}
