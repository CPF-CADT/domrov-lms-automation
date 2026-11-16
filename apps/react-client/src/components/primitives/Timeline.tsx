import type { GradingStep } from "@/config/documentation";

interface TimelineProps {
  steps: GradingStep[];
}

/**
 * Timeline - Vertical timeline component for displaying sequential steps.
 * Used in TeacherGuide for grading workflow visualization.
 */
export default function Timeline({ steps }: TimelineProps) {
  return (
    <ol className="relative border-l border-blue-200 ml-3 space-y-8">
      {steps.map((step) => (
        <li key={step.step} className="pl-6 relative">
          <span className="absolute -left-3 top-1 w-6 h-6 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center">
            {step.step}
          </span>
          <h4 className="font-bold text-slate-800">{step.title}</h4>
          <p className="text-sm text-slate-600 mt-1">{step.desc}</p>
        </li>
      ))}
    </ol>
  );
}
