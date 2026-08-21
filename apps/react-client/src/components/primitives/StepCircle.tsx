interface StepCircleProps {
  num: string;
}

/**
 * StepCircle - Circular step number indicator.
 * Used in HowItWorksSection for workflow steps.
 */
export default function StepCircle({ num }: StepCircleProps) {
  return (
    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-primary text-2xl font-bold mb-6 border-2 border-blue-300">
      {num}
    </div>
  );
}
