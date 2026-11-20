import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PricingHero from "@/pages/pricing/components/PricingHero";
import PricingGrid from "@/pages/pricing/components/PricingGrid";
import "@/pages/public-pages.css";

/**
 * Pricing - Pricing page component.
 * Displays pricing plans and features.
 */
export default function Pricing() {
    return (
        <div className="public-site-page public-pricing-page min-h-screen font-sans animate-in fade-in duration-500">
            <Header variant="landing" />
            <main className="public-main-container w-full max-w-7xl mx-auto px-4 sm:px-8 py-20">
                <PricingHero />
                <PricingGrid />
            </main>
            <Footer variant="landing" />
        </div>
    );
}
