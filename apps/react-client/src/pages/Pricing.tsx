import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
    PricingHero,
    PricingGrid,
} from "@/features/pricing";

/**
 * Pricing - Pricing page component.
 * Displays pricing plans and features.
 */
export default function Pricing() {
    return (
        <div className="min-h-screen bg-white font-sans text-slate-800 animate-in fade-in duration-500">
            <Header />
            <main className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-20">
                <PricingHero />
                <PricingGrid />
            </main>
            <Footer />
        </div>
    );
}