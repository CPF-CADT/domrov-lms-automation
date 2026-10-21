import SectionWrapper from "@/components/primitives/SectionWrapper";

/**
 * DocsHero - Hero section for documentation page.
 * Displays main heading and subtitle for user guidelines.
 */
export default function DocsHero() {
  return (
    <section className="bg-linear-to-br from-blue-50 to-white border-b border-slate-200">
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-black text-primary mb-4">
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
