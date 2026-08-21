/**
 * EmptyState - Displays an empty state message with optional icon.
 * Usage: <EmptyState message="No classes for this term yet." icon="school" />
 */

import Icon from "./Icon";

interface EmptyStateProps {
  message: string;
  icon?: string;
  className?: string;
}

export default function EmptyState({
  message,
  icon,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-500 ${className}`.trim()}
    >
      {icon && <Icon name={icon} size="4xl" className="text-slate-300 mb-4" />}
      <p>{message}</p>
    </div>
  );
}
