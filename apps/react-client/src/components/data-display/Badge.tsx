/**
 * Badge - Displays a small pill badge with customizable accent color and variant.
 * Usage: <Badge label="Active" /> or <Badge label="New" variant="primary" />
 */

type BadgeVariant = "primary" | "accent" | "success" | "warning" | "custom";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  accentColor?: string;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: "bg-primary/10 text-primary border-primary/30",
  accent: "bg-accent/10 text-accent border-accent/30",
  success: "bg-green-100 text-green-700 border-green-300",
  warning: "bg-yellow-100 text-yellow-700 border-yellow-300",
  custom: "",
};

export default function Badge({
  label,
  variant = "primary",
  accentColor,
  className = "",
}: BadgeProps) {
  const baseClasses =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border";

  if (variant === "custom" && accentColor) {
    return (
      <span
        className={`badge-pill ${className}`.trim()}
        style={{ "--badge-accent": accentColor } as React.CSSProperties}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={`${baseClasses} ${variantClasses[variant]} ${className}`.trim()}
    >
      {label}
    </span>
  );
}
