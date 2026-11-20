// --- Types ---
interface FooterProps {
  variant?: "dark" | "primary" | "landing";
}

/**
 * Footer - Page footer with dark or primary variants.
 * Displays copyright information.
 */
export default function Footer({ variant = "dark" }: FooterProps) {
  if (variant === "landing") {
    return (
      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div>
            <a className="landing-footer-brand" href="/">Domrov <span>LMS</span></a>
            <p>Programming classes, assignments, and feedback in one place.</p>
            <p className="landing-footer-location">Made for educators in Cambodia.</p>
          </div>
          <nav aria-label="Footer navigation">
            <a href="/about">About</a>
            <a href="/pricing">Pricing</a>
            <a href="/docs">User Guide</a>
          </nav>
          <p className="landing-copyright">© {new Date().getFullYear()} Domrov LMS</p>
        </div>
      </footer>
    );
  }

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
