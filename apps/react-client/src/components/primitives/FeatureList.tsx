import { Icon } from "../data-display";

interface FeatureListProps {
  features: string[];
  inverse?: boolean;
}

/**
 * FeatureList - Displays a list of features with check icons.
 * Used in pricing cards to show included features.
 */
export default function FeatureList({
  features,
  inverse = false,
}: FeatureListProps) {
  const textClass = inverse ? "text-white" : "text-slate-700";
  const iconClass = inverse ? "text-blue-200" : "text-green-500";

  return (
    <ul className={`space-y-3 text-sm ${textClass}`}>
      {features.map((feature) => (
        <li key={feature} className="flex items-center gap-3">
          <Icon name="check_circle" className={iconClass} />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}
