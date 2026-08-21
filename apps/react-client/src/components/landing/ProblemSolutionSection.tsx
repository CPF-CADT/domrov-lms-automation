import { SectionHeader } from "@/components/data-display";
import ProblemCard from "@/components/primitives/ProblemCard";
import SectionWrapper from "@/components/primitives/SectionWrapper";
import { PROBLEM_SOLUTION, type IconCard } from "@/config/landing";

/**
 * ProblemSolutionSection - Displays challenge and solution cards.
 * Shows the problem Domrov solves and the outcomes.
 */
export default function ProblemSolutionSection() {
  return (
    <SectionWrapper className="bg-primary-light/40">
      <SectionHeader
        title="The Challenge and The Solution"
        centered
        className="mb-12"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PROBLEM_SOLUTION.map((item: IconCard) => (
          <ProblemCard key={item.id} item={item} />
        ))}
      </div>
    </SectionWrapper>
  );
}
