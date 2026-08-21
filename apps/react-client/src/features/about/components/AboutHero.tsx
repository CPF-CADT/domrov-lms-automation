import { SectionHeader } from "@/components/data-display";
import SectionWrapper from "@/components/primitives/SectionWrapper";

/**
 * AboutHero - Hero section for the About page.
 * Displays vision statement and main value proposition.
 */
export default function AboutHero() {
  return (
    <section className="relative overflow-hidden bg-linear-to-br from-primary-light to-white">
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_top_left,#80bfff,transparent_60%)]" />
      <SectionWrapper>
        <div className="relative text-center max-w-4xl mx-auto">
          <SectionHeader
            label="Our Vision"
            title="Empowering Cambodian Students With Future-Ready Coding Skills"
            subtitle="Domrov aims to become the first AI-driven educational tool built specifically for Cambodia—enabling schools to teach coding more efficiently, more accurately, and with modern standards."
            centered
          />
        </div>
      </SectionWrapper>
    </section>
  );
}
