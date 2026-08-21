export interface IconCard {
  id: string;
  icon: string;
  title: string;
  desc: string;
}

export interface StepItem {
  num: string;
  title: string;
  desc: string;
}

export const PROBLEM_SOLUTION: IconCard[] = [
  {
    id: "overhead",
    icon: "hourglass_empty",
    title: "Manual Grading Overhead",
    desc: "Instructors spend countless hours manually grading code, leading to slow feedback and burnout.",
  },
  {
    id: "automation",
    icon: "bolt",
    title: "Automated Evaluation",
    desc: "Domrov LMS provides instant, consistent, and automated evaluation for programming assignments.",
  },
  {
    id: "outcomes",
    icon: "trending_up",
    title: "Improved Outcomes",
    desc: "Save valuable time, provide immediate feedback, and enhance student learning and satisfaction.",
  },
];

export const CORE_FEATURES: IconCard[] = [
  {
    id: "grading",
    icon: "terminal",
    title: "Automated Code Grading",
    desc: "Run student submissions against predefined test cases automatically.",
  },
  {
    id: "feedback",
    icon: "rate_review",
    title: "Instant Feedback",
    desc: "Provide students with immediate, detailed feedback on their code.",
  },
  {
    id: "plagiarism",
    icon: "shield",
    title: "Plagiarism Detection",
    desc: "Ensure academic integrity with robust plagiarism detection tools.",
  },
  {
    id: "analytics",
    icon: "analytics",
    title: "Performance Analytics",
    desc: "Track student progress and identify improvement areas.",
  },
];

export const HOW_IT_WORKS_STEPS: StepItem[] = [
  {
    num: "1",
    title: "Create an Assignment",
    desc: "Easily set up programming tasks with custom test cases.",
  },
  {
    num: "2",
    title: "Students Submit Code",
    desc: "Students write and submit solutions directly through the platform.",
  },
  {
    num: "3",
    title: "Get Instant Results",
    desc: "Code is automatically graded with instant, actionable feedback.",
  },
];
