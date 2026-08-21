type StatusVariant = "active" | "submitted" | "feedback" | "inactive" | "draft" | "archived";

interface StatusBadgeProps {
  status: StatusVariant;
  className?: string;
}

const STATUS_CONFIG: Record<StatusVariant, { icon: string; text: string; className: string }> = {
  active: { icon: "●", text: "Active", className: "bg-green-100 text-green-700" },
  submitted: { icon: "✓", text: "Submitted", className: "bg-green-500 text-white" },
  feedback: { icon: "💬", text: "Feedback", className: "bg-blue-500 text-white" },
  inactive: { icon: "🔒", text: "Inactive", className: "bg-slate-800 text-white" },
  draft: { icon: "✎", text: "Draft", className: "bg-yellow-100 text-yellow-700" },
  archived: { icon: "📦", text: "Archived", className: "bg-slate-100 text-slate-600" },
};

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${config.className} ${className}`.trim()}
    >
      <span>{config.icon}</span>
      {config.text}
    </span>
  );
}
