import { SectionHeader } from "@/components/data-display";
import SectionWrapper from "@/components/primitives/SectionWrapper";
import StepCircle from "@/components/primitives/StepCircle";
import { HOW_IT_WORKS_STEPS, type StepItem } from "@/config/landing";

/**
 * HowItWorksSection - Displays the 3-step workflow process.
 * Shows steps with connecting line on desktop.
 */
export default function HowItWorksSection() {
  return (
    <SectionWrapper className="bg-primary-light/40">
      <SectionHeader
        title="How It Works"
        subtitle="A simple 3-step process to streamline your workflow."
        centered
        className="mb-16"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        <div className="absolute top-1/2 left-0 w-full h-px bg-blue-200 hidden md:block" />

        {HOW_IT_WORKS_STEPS.map((step: StepItem) => (
          <div
            key={step.num}
            className="relative flex flex-col items-center text-center"
          >
            <StepCircle num={step.num} />
            <h3 className="text-primary text-xl font-bold leading-tight mb-2">
              {step.title}
            </h3>
            <p className="text-slate-600 max-w-sm">{step.desc}</p>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
