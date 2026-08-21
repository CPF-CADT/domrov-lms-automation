import type { ButtonHTMLAttributes, ReactNode } from "react";

// --- Types ---
type ButtonVariant = "solid" | "outline" | "light";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

// --- Constants ---
const BASE_CLASSES =
  "font-bold rounded-lg px-4 py-3 transition-all duration-200";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  solid: "bg-primary text-white hover:bg-primary-dark",
  outline:
    "border-2 border-primary text-primary hover:bg-primary hover:!text-white",
  light: "bg-white text-primary hover:bg-primary-light hover:!text-white",
};

/**
 * PrimaryButton - Primary action button component.
 * Supports solid, outline, and light variants.
 */
export default function PrimaryButton({
  children,
  variant = "solid",
  fullWidth = true,
  className = "",
  ...props
}: PrimaryButtonProps) {
  const width = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${BASE_CLASSES} ${width} ${VARIANT_CLASSES[variant]} ${className}`.trim()}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
