import Icon from "@/components/data-display/Icon";
import { GuideCard, SectionWrapper } from "@/components/primitives";

// --- Constants ---
const studentSections = [
  {
    id: "dashboard",
    title: "Dashboard",
    content:
      "Shows your enrolled classes, active assignments, deadlines, and grades.",
  },
  {
    id: "submission",
    title: "Submission Methods",
    list: [
      "GitHub Repository Sync",
      "ZIP Upload for multi-file projects",
      "Direct Code Paste for small tasks",
    ],
  },
  {
    id: "ai-helper",
    title: "AI Helper",
    content:
      "The AI provides hints — never full solutions — to support learning.",
  },
];

/**
 * StudentGuide - Documentation section for student users.
 * Displays dashboard, submission methods, and AI helper information.
 */
export default function StudentGuide() {
  return (
    <SectionWrapper>
      <h2 className="text-3xl font-black text-primary mb-4 flex items-center gap-2">
        <Icon name="person" size="3xl" />
        Student Guide
      </h2>
      <p className="text-slate-700 mb-6 leading-relaxed">
        Everything students need to know to submit assignments, receive
        feedback, and learn effectively.
      </p>

      <div className="space-y-6">
        {studentSections.map((section, idx) => (
          <GuideCard key={section.id}>
            <h3 className="font-bold text-primary mb-2">
              {idx + 1}. {section.title}
            </h3>
            {section.list ? (
              <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">{section.content}</p>
            )}
          </GuideCard>
        ))}
      </div>
    </SectionWrapper>
  );
}
