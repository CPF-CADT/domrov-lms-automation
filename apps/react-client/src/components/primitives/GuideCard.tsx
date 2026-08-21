import { type ReactNode } from "react";

interface GuideCardProps {
  children: ReactNode;
}

/**
 * GuideCard - Card wrapper for documentation guide sections.
 * Features a left border accent for visual emphasis.
 */
export default function GuideCard({ children }: GuideCardProps) {
  return (
    <div className="bg-white border-l-4 border-blue-500 p-6 rounded-r-xl shadow-sm">
      {children}
    </div>
  );
}
