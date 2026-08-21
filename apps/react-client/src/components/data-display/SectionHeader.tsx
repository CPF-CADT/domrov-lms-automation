/**
 * SectionHeader - Reusable section header with optional label, title, and subtitle.
 * Usage: <SectionHeader label="Features" title="Core Features" subtitle="Description" />
 */

interface SectionHeaderProps {
  label?: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
}

export default function SectionHeader({
  label,
  title,
  subtitle,
  centered = false,
  className = "",
}: SectionHeaderProps) {
  const alignment = centered ? "text-center mx-auto" : "";

  return (
    <div
      className={`flex flex-col gap-4 max-w-3xl ${alignment} ${className}`.trim()}
    >
      {label && (
        <span className="text-accent font-bold uppercase tracking-wide text-sm block">
          {label}
        </span>
      )}
      <h2 className="text-primary text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-slate-600 text-lg sm:text-xl leading-normal">
          {subtitle}
        </p>
      )}
    </div>
  );
}
