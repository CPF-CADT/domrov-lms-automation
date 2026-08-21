"use client";

import { ClipboardIcon } from "../../icons";


interface GeneralTabProps {
  classId: string;
}

/**
 * GeneralTab - General feed showing quizzes and assignments.
 */
export default function GeneralTab({ classId: _classId }: GeneralTabProps) {
  // Mock data for assignments
  const assignments = [
    {
      id: "1",
      title: "WB-CHALLENGE-Weather",
      dueDate: "Due at 11:59 PM",
      module: "Module WB - List & Callbacks",
    },
    {
      id: "2",
      title: "WB-CHALLENGE-Weather",
      dueDate: "Due at 11:59 PM",
      module: "Module WB - List & Callbacks",
    },
    {
      id: "3",
      title: "WB-CHALLENGE-Weather",
      dueDate: "Due at 11:59 PM",
      module: "Module WB - List & Callbacks",
    },
    {
      id: "4",
      title: "WB-CHALLENGE-Weather",
      dueDate: "Due at 11:59 PM",
      module: "Module WB - List & Callbacks",
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Assignment Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardIcon className="w-5 h-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Assignment</h2>
        </div>
        
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              onClick={() => {}}
              className="border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
            >
              <h3 className="font-semibold text-slate-900 mb-2">{assignment.title}</h3>
              <p className="text-sm text-slate-600 mb-2">{assignment.dueDate}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ClipboardIcon className="w-4 h-4" />
                <span>{assignment.module}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
