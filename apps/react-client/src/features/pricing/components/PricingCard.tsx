import { CardBase, PrimaryButton, FeatureList } from "@/components/primitives";
import type { PricingTier } from "@/config";

interface PricingCardProps {
  tier: PricingTier;
}

/**
 * PricingCard - Standard pricing tier card.
 * Displays tier name, price, features, and CTA button.
 */
export default function PricingCard({ tier }: PricingCardProps) {
  return (
    <CardBase className="h-full flex flex-col">
      <div className="flex-1">
        <h3 className="text-lg font-bold text-slate-500 mb-2">{tier.name}</h3>
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-4xl font-black text-primary">{tier.price}</span>
          {tier.unit && (
            <span className="text-slate-400 text-sm font-medium">
              {tier.unit}
            </span>
          )}
        </div>
        <p className="text-slate-600 mb-8 text-sm">{tier.subtitle}</p>
      </div>

      <div className="space-y-8">
        <PrimaryButton variant="outline">{tier.cta}</PrimaryButton>
        <FeatureList features={tier.features} />
      </div>
    </CardBase>
  );
}
