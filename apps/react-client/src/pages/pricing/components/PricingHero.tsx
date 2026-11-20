/**
 * PricingHero - Hero section for pricing page.
 * Displays title, subtitle, and Bakong payment mention.
 */
export default function PricingHero() {
  return (
    <div className="public-page-hero text-center max-w-3xl mx-auto mb-12">
      <p className="landing-eyebrow">Straightforward pricing</p>
      <h1 className="text-4xl font-black text-primary mb-4">
        Flexible &quot;Token-Based&quot; Pricing
      </h1>
      <p className="text-base sm:text-lg text-slate-600">
        Pay only for what you use. No subscriptions. <br />
        <span className="text-sm font-bold text-accent">
          We accept Bakong KHQR.
        </span>
      </p>
    </div>
  );
}
