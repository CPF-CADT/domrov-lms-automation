export interface PricingTier {
  id: string;
  name: string;
  price: string;
  unit?: string;
  subtitle: string;
  cta: string;
  featured: boolean;
  badge?: string;
  features: string[];
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "basic",
    name: "Basic",
    price: "Free",
    subtitle: "For individual learners and trial teachers.",
    cta: "Start Free",
    featured: false,
    features: ["Manual Grading", "1 Active Class", "50MB Storage"],
  },
  {
    id: "starter",
    name: "Starter Pack",
    price: "$1",
    unit: "/ 2000 tokens",
    subtitle: "Perfect for students or small testing sessions.",
    cta: "Buy with Bakong KHQR",
    featured: false,
    features: ["AI Feedback", "Automated Code Hints", "Small Assignments"],
  },
  {
    id: "wallet",
    name: "Token Wallet",
    price: "$10",
    unit: "/ 100,000 tokens",
    subtitle: "Ideal for teachers and mid-size classes. Tokens never expire.",
    cta: "Buy with Bakong KHQR",
    featured: true,
    badge: "Best Value",
    features: [
      "AI Code Analysis",
      "Auto-Hint Generation",
      "Code Optimization",
      "Usage Dashboard",
    ],
  },
  {
    id: "university",
    name: "University",
    price: "BYOK",
    subtitle: "Bring Your Own OpenAI Key. Platform-only fee.",
    cta: "Contact Sales",
    featured: false,
    features: [
      "Unlimited Classes",
      "Admin Dashboard",
      "Use Your Own OpenAI Key",
    ],
  },
];
