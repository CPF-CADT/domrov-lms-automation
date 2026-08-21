export interface NavItem {
  id: string;
  icon: string;
  label: string;
}

export interface GradingStep {
  step: number;
  title: string;
  desc: string;
}

export const USER_TYPES: NavItem[] = [
  { id: "students", icon: "person", label: "Students" },
  { id: "teachers", icon: "assignment_ind", label: "Teachers" },
  { id: "admins", icon: "admin_panel_settings", label: "Admins" },
  { id: "quiz", icon: "quiz", label: "Quiz Masters" },
];

export const PLATFORM_FEATURES: NavItem[] = [
  { id: "analysis", icon: "code", label: "AI Code Analysis" },
  { id: "hints", icon: "lightbulb", label: "AI Hints" },
  { id: "submission", icon: "folder", label: "Submission Methods" },
  { id: "tokens", icon: "workspace_premium", label: "Token System" },
];

export const GRADING_STEPS: GradingStep[] = [
  {
    step: 1,
    title: "Auto Evaluation",
    desc: "AI reviews logic, syntax, efficiency, and common mistakes.",
  },
  {
    step: 2,
    title: "Manual Review",
    desc: "Teachers approve, correct, or override AI recommendations.",
  },
  {
    step: 3,
    title: "Publish",
    desc: "Students receive graded results instantly.",
  },
];
