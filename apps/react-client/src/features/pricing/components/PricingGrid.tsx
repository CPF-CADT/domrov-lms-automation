import { PRICING_TIERS } from "@/config";
import FeaturedPricingCard from "./FeaturedPricingCard";
import PricingCard from "./PricingCard";

/**
 * PricingGrid - Displays all pricing tiers in a responsive grid.
 * Uses FeaturedPricingCard for highlighted tier, PricingCard for others.
 */
export default function PricingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
      {PRICING_TIERS.map((tier) =>
        tier.featured ? (
          <FeaturedPricingCard key={tier.id} tier={tier} />
        ) : (
          <PricingCard key={tier.id} tier={tier} />
        ),
      )}
    </div>
  );
}
