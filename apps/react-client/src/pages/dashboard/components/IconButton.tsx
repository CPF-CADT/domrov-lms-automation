import type { ReactNode } from "react";

interface IconButtonProps {
  ariaLabel: string;
  children: ReactNode;
}

/**
 * IconButton - Circular icon button for dashboard actions.
 * Uses the global .icon-btn class for consistent styling.
 */
export default function IconButton({ ariaLabel, children }: IconButtonProps) {
  return (
    <button className="icon-btn" aria-label={ariaLabel}>
      {children}
    </button>
  );
}
