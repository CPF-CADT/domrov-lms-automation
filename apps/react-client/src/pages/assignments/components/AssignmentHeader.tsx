import { ChevronLeft, Clipboard } from "lucide-react";

/**
 * AssignmentHeader - Top header for assignment page with navigation and search
 */
interface AssignmentHeaderProps {
  onBack?: () => void;
}

export default function AssignmentHeader({ onBack }: AssignmentHeaderProps) {

  return (
    <div className="px-8 py-4 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack || (() => window.history.back())}
            className="p-2 transition-colors rounded-lg hover:bg-slate-100"
            title="Go back"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center justify-center w-10 h-10 bg-blue-600">
            <Clipboard className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Assignment</h1>
        </div>
      </div>
    </div>
  );
}
