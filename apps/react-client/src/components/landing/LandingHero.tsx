import { Badge } from "@/components/data-display";
import InteractiveHeroDemo from "@/components/landing/InteractiveHeroDemo";
import PrimaryLinkButton from "@/components/primitives/PrimaryLinkButton";

/**
 * LandingHero - Main hero section for the landing page.
 * Displays headline, value proposition, CTAs, and interactive demo.
 */
export default function LandingHero() {
  return (
    <section className="py-20 sm:py-28 section-container">
      <div className="flex flex-col lg:flex-row items-center gap-16">
        <div className="lg:w-1/2 flex flex-col gap-6 text-center lg:text-left">
          <Badge
            label="Bridging the Coding Gap"
            variant="primary"
            className="w-fit mx-auto lg:mx-0 !bg-primary !text-white"
          />
          <h1 className="text-5xl sm:text-6xl font-black text-primary leading-tight tracking-tight">
            Automated Grading <br />
            <span className="text-blue-400">Human Oversight.</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Reduce manual grading workload by <strong>80%</strong>. Domrov
            integrates assignment management, secure code execution, and
            AI-driven feedback into one unified platform for Cambodia.
          </p>
          <div className="flex gap-4 justify-center lg:justify-start pt-4">
            <PrimaryLinkButton href="/pricing">
              Start Teaching Free
            </PrimaryLinkButton>
            <PrimaryLinkButton href="/docs" variant="outline">
              How it Works
            </PrimaryLinkButton>
          </div>
        </div>

        <div className="lg:w-1/2 w-full">
          <InteractiveHeroDemo />
        </div>
      </div>
    </section>
  );
}
