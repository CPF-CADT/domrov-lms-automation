import IconCard from "./IconCard";
import type { IconCard as IconCardType } from "@/config/Landing";

interface ProblemCardProps {
  item: IconCardType;
}

/**
 * ProblemCard - Thin wrapper around IconCard (size="md").
 * @deprecated Use IconCard directly.
 */
export default function ProblemCard({ item }: ProblemCardProps) {
  return <IconCard item={item} size="md" />;
}
