import type { CSSProperties } from "react";

interface CardStatusBadgeProps {
  accent: string;
  label?: string;
}

/**
 * CardStatusBadge - Status badge with dynamic accent color.
 * Uses CSS custom property for flexible color theming.
 */
export default function CardStatusBadge({
  accent,
  label = "Active",
}: CardStatusBadgeProps) {
  const style = {
    "--badge-accent": accent,
  } as CSSProperties;

  return (
    <span className="badge-pill" style={style}>
      {label}
    </span>
  );
}
