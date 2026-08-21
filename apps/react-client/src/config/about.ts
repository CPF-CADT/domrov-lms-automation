export interface VisionCardContent {
  id: string;
  icon: string;
  title: string;
  desc: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  desc: string;
}

export const VISION_CARDS: VisionCardContent[] = [
  {
    id: "vision-1",
    icon: "lightbulb",
    title: "Innovation First",
    desc: "Using AI to deliver real-time feedback and reduce teacher workload.",
  },
  {
    id: "vision-2",
    icon: "school",
    title: "Better Learning",
    desc: "Helping students grow through personalized, automated code assessment.",
  },
  {
    id: "vision-3",
    icon: "public",
    title: "Future for Cambodia",
    desc: "Building a stronger digital generation prepared for global opportunities.",
  },
];

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "panha",
    name: "Sat Panha",
    role: "CEO & Project Manager",
    desc: "Agile planning and vision.",
  },
  {
    id: "vathanak",
    name: "Phy Vathanak",
    role: "Lead Developer",
    desc: "Backend architecture & DevOps.",
  },
  {
    id: "chanpanha",
    name: "Cheng Chanpanha",
    role: "Fullstack Developer",
    desc: "Backend logic & API maintenance.",
  },
  {
    id: "bunna",
    name: "Soveth Roathbunna",
    role: "QA Engineer",
    desc: "Testing & System Quality.",
  },
  {
    id: "sivheng",
    name: "Chhun Sivheng",
    role: "UX/UI & Frontend",
    desc: "Interface design & usability.",
  },
  {
    id: "ratanak",
    name: "Choun Ratanak",
    role: "Frontend Developer",
    desc: "UI Components & Logic.",
  },
];
