import { Icon } from "@/components/data-display";
import { GuideCard, SectionWrapper } from "@/components/primitives";

const quizItems = [
  {
    id: "live-quizzes",
    title: "Live Quizzes",
    desc: "Run timed quizzes with real-time submission tracking.",
  },
  {
    id: "anti-cheating",
    title: "Anti-Cheating",
    desc: "Browser lockdown and activity monitoring during exams.",
  },
];

/**
 * QuizGuide - Documentation section for quiz master users.
 * Covers live quizzes and anti-cheating features.
 */
export default function QuizGuide() {
  return (
    <SectionWrapper>
      <h2 className="text-3xl font-black text-primary mb-4 flex items-center gap-2">
        <Icon name="quiz" size="3xl" />
        Quiz Master Guide
      </h2>
      <p className="text-slate-700 mb-6">
        Conduct fair, real-time quizzes with anti-cheating features.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quizItems.map((item) => (
          <GuideCard key={item.id}>
            <strong className="text-primary">{item.title}</strong>
            <p className="text-sm text-slate-600">{item.desc}</p>
          </GuideCard>
        ))}
      </div>
    </SectionWrapper>
  );
}
