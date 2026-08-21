import type { ReactNode } from "react";

interface SectionWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * SectionWrapper - Provides consistent section spacing and max-width container.
 * Use to wrap major page sections for uniform layout.
 */
export default function SectionWrapper({
  children,
  className = "",
}: SectionWrapperProps) {
  return (
    <section className={`py-20 sm:py-28 ${className}`.trim()}>
      <div className="section-container">{children}</div>
    </section>
  );
}
