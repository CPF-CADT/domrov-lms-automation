import type { ReactNode } from "react";

interface CardBaseProps {
  children: ReactNode;
  className?: string;
}

/**
 * CardBase - Base card component with shadow and hover effects.
 * Use for content cards throughout the application.
 */
export default function CardBase({ children, className = "" }: CardBaseProps) {
  return (
    <div
      className={`bg-white border border-slate-100 shadow-xl rounded-2xl p-8 hover:-translate-y-1 hover:shadow-2xl transition-all ${className}`.trim()}
    >
      {children}
    </div>
  );
}
