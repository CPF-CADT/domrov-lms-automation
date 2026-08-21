/**
 * Icon - Wrapper for Material Symbols Outlined icons.
 * Usage: <Icon name="check_circle" size="lg" className="text-primary" />
 */

type IconSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";

interface IconProps {
  name: string;
  size?: IconSize;
  className?: string;
}

const sizeClasses: Record<IconSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
};

export default function Icon({ name, size = "md", className = "" }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${sizeClasses[size]} ${className}`.trim()}
    >
      {name}
    </span>
  );
}
