"use client";

import { AlertCircle } from "lucide-react";

interface AssignmentInstructionsProps {
  dueDate: string;
  objective: string;
}

/**
 * AssignmentInstructions - Card displaying assignment instructions and objectives
 * Student view - no edit capability
 */
export default function AssignmentInstructions({
  dueDate,
  objective,
}: AssignmentInstructionsProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900">Assignment Instructions</h2>
          <span className="text-sm font-semibold text-red-600 flex items-center gap-2 whitespace-nowrap">
            <AlertCircle className="w-4 h-4" />
            Due: {dueDate}
          </span>
        </div>
      </div>

      <div className="p-6">
        {/* Objective Section */}
        <div className="mb-6">
          <h3 className="text-base font-bold text-slate-900 mb-3">Objective</h3>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{objective}</p>
        </div>
      </div>
    </div>
  );
}
