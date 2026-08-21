import { Link } from "react-router-dom";
import type { ReactNode } from "react";

// --- Types ---
type LinkVariant = "solid" | "outline" | "light";

interface PrimaryLinkButtonProps {
  href: string;
  children: ReactNode;
  variant?: LinkVariant;
}

// --- Constants ---
const BASE_CLASSES =
  "inline-block font-bold rounded-lg px-4 py-3 transition-all duration-200 shadow-primary";

const VARIANT_CLASSES: Record<LinkVariant, string> = {
  solid: "bg-primary text-white hover:bg-primary-dark",
  outline:
    "border-2 border-primary text-primary hover:bg-primary hover:!text-white",
  light: "bg-white text-primary hover:bg-primary-light hover:!text-white",
};

/**
 * PrimaryLinkButton - Primary action link styled as button.
 * Supports solid, outline, and light variants.
 */
export default function PrimaryLinkButton({
  href,
  children,
  variant = "solid",
}: PrimaryLinkButtonProps) {
  return (
    <Link
      to={href}
      className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]}`.trim()}
    >
      {children}
    </Link>
  );
}
