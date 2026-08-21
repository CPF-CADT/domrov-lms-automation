import { SectionHeader } from "@/components/data-display";
import FeatureCard from "@/components/primitives/FeatureCard";
import SectionWrapper from "@/components/primitives/SectionWrapper";
import { CORE_FEATURES, type IconCard } from "@/config/landing";

/**
 * CoreFeaturesSection - Displays the core platform features in a grid.
 * Uses FeatureCard for each feature item.
 */
export default function CoreFeaturesSection() {
  return (
    <SectionWrapper>
      <SectionHeader
        title="Core Features"
        subtitle="Discover the powerful tools that make Domrov the ultimate LMS for programming education."
        className="mb-12"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {CORE_FEATURES.map((item: IconCard) => (
          <FeatureCard key={item.id} item={item} />
        ))}
      </div>
    </SectionWrapper>
  );
}
