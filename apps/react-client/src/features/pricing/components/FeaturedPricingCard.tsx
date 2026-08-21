import { CardBase, PrimaryButton, FeatureList } from "@/components/primitives";
import type { PricingTier } from "@/config";

interface FeaturedPricingCardProps {
  tier: PricingTier;
}

/**
 * FeaturedPricingCard - Highlighted pricing tier card with primary background.
 * Used for the "Best Value" or recommended tier.
 */
export default function FeaturedPricingCard({
  tier,
}: FeaturedPricingCardProps) {
  return (
    <CardBase className="h-full flex flex-col bg-primary text-white border-primary shadow-2xl transform md:-translate-y-4">
      <div className="relative flex-1">
        {tier.badge && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-400 text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
            {tier.badge}
          </div>
        )}
        <h3 className="text-lg font-bold text-blue-200 mb-2">{tier.name}</h3>
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-4xl font-black text-white">{tier.price}</span>
          {tier.unit && (
            <span className="text-blue-100 text-sm font-medium">
              {tier.unit}
            </span>
          )}
        </div>
        <p className="text-blue-100 mb-8 text-sm">{tier.subtitle}</p>
      </div>

      <div className="space-y-8">
        <PrimaryButton variant="light">{tier.cta}</PrimaryButton>
        <FeatureList features={tier.features} inverse />
      </div>
    </CardBase>
  );
}
