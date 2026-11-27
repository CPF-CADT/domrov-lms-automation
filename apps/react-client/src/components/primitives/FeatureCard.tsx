import IconCard from "./IconCard";
import type { IconCard as IconCardType } from "@/config/landing";

interface FeatureCardProps {
  item: IconCardType;
}

/**
 * FeatureCard - Thin wrapper around IconCard (size="sm").
 * @deprecated Use IconCard directly.
 */
export default function FeatureCard({ item }: FeatureCardProps) {
  return <IconCard item={item} size="sm" />;
}
