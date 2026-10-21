"use client";

import { FileText, Download } from "lucide-react";

interface ReferenceMaterial {
  name: string;
  type: string;
}

interface ReferenceMaterialsProps {
  materials: ReferenceMaterial[];
}

/**
 * ReferenceMaterials - Section displaying downloadable reference materials
 */
export default function ReferenceMaterials({ materials }: ReferenceMaterialsProps) {
  if (!materials || materials.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900">Reference Materials</h2>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {materials.map((material, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-slate-900">{material.name}</span>
              </div>
              <Download className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
