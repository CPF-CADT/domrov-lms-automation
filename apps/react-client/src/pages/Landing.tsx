import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  LandingHero,
  ProblemSolutionSection,
  CoreFeaturesSection,
  HowItWorksSection,
  LandingCTA,
} from "@/components/landing";

/**
 * Landing - Main landing page component that combines all landing sections.
 * This serves as the root route (/) of the application.
 */
export default function Landing() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 animate-in fade-in duration-500">
      <Header />
      <main>
        <LandingHero />
        <ProblemSolutionSection />
        <CoreFeaturesSection />
        <HowItWorksSection />
        <LandingCTA />
      </main>
      <Footer />
    </div>
  );
}