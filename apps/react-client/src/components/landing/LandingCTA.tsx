import PrimaryLinkButton from "@/components/primitives/PrimaryLinkButton";

/**
 * LandingCTA - Call-to-action section for landing page.
 * Highlights Cambodian context and payment integration.
 */
export default function LandingCTA() {
  return (
    <section className="bg-primary py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-6">
          Built for the Cambodian Context
        </h2>
        <p className="text-blue-200 text-lg mb-8">
          Low-bandwidth optimization, Bakong payment integration, and localized
          support.
        </p>
        <PrimaryLinkButton href="/pricing" variant="light">
          View Token Plans
        </PrimaryLinkButton>
      </div>
    </section>
  );
}
