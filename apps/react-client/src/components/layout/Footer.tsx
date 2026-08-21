// --- Types ---
interface FooterProps {
  variant?: "dark" | "primary";
}

/**
 * Footer - Page footer with dark or primary variants.
 * Displays copyright information.
 */
export default function Footer({ variant = "dark" }: FooterProps) {
  if (variant === "primary") {
    return (
      <footer className="bg-primary-dark text-white py-12 text-center">
        <p className="opacity-70 text-sm">Domrov Capstone Project © 2025.</p>
      </footer>
    );
  }

  return (
    <footer className="bg-slate-900 py-12 text-center px-4">
      <p className="text-slate-500 text-sm">
        © 2025 Domrov LMS. Designed in Phnom Penh.
      </p>
    </footer>
  );
}
