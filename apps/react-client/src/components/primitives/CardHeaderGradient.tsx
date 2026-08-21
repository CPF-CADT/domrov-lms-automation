interface CardHeaderGradientProps {
  gradientClass: string;
  label: string;
}

/**
 * CardHeaderGradient - Gradient header section for cards.
 * Displays a label centered on a gradient background.
 */
export default function CardHeaderGradient({
  gradientClass,
  label,
}: CardHeaderGradientProps) {
  return (
    <div
      className={`gradient-header bg-linear-to-br ${gradientClass}`}
      aria-hidden
    >
      <span className="uppercase">{label}</span>
    </div>
  );
}
