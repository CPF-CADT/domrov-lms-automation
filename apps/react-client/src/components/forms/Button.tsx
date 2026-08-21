import Icon from "@/components/data-display/Icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: string;
  iconPosition?: "left" | "right";
  children: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
}

const variantStyles = {
  primary:
    "bg-blue-600 hover:bg-blue-700 text-white",
  secondary:
    "bg-slate-200 hover:bg-slate-300 text-slate-900",
  danger:
    "bg-red-600 hover:bg-red-700 text-white",
  ghost:
    "bg-transparent hover:bg-slate-100 text-slate-700",
};

const sizeStyles = {
  sm: "px-3 py-1 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

export default function Button({
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  children,
  fullWidth = false,
  loading = false,
  disabled = false,
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles = "rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variantClass = variantStyles[variant];
  const sizeClass = sizeStyles[size];
  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${variantClass} ${sizeClass} ${widthClass} ${className}`.trim()}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon && iconPosition === "left" ? (
        <Icon name={icon} size="md" />
      ) : null}
      {children}
      {!loading && icon && iconPosition === "right" ? (
        <Icon name={icon} size="md" />
      ) : null}
    </button>
  );
}
