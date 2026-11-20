import SectionWrapper from "@/components/primitives/SectionWrapper";

/**
 * DocsHero - Hero section for documentation page.
 * Displays main heading and subtitle for user guidelines.
 */
export default function DocsHero() {
  return (
    <section className="public-page-hero border-b border-slate-200">
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <p className="landing-eyebrow">Domrov help center</p>
          <h1 className="text-4xl sm:text-5xl font-black text-primary mb-4">
            Domrov User Guidelines
          </h1>
          <p className="text-lg text-slate-600">
            Learn how to use Domrov effectively — for Students, Teachers,
            Admins, and Quiz Operators.
          </p>
        </div>
      </SectionWrapper>
    </section>
  );
}
