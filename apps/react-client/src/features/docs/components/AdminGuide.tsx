import { Icon } from "@/components/data-display";
import { GuideCard, SectionWrapper } from "@/components/primitives";

// --- Constants ---
const adminItems = [
  {
    id: "user-management",
    title: "User Management",
    desc: "Admins can create teachers, assign roles, or deactivate suspicious accounts.",
  },
  {
    id: "storage",
    title: "Storage Monitoring",
    desc: "Track file uploads and prevent abuse.",
  },
  {
    id: "analytics",
    title: "Analytics Dashboard",
    desc: "See trending assignments, performance, and usage stats.",
  },
];

/**
 * AdminGuide - Documentation section for admin users.
 * Covers user management, storage monitoring, and analytics.
 */
export default function AdminGuide() {
  return (
    <SectionWrapper>
      <h2 className="text-3xl font-black text-primary mb-4 flex items-center gap-2">
        <Icon name="admin_panel_settings" size="3xl" />
        Admin Guide
      </h2>
      <p className="text-slate-700 mb-6">
        Manage users, classes, permissions, storage, and platform monitoring.
      </p>

      <div className="space-y-4">
        {adminItems.map((item) => (
          <GuideCard key={item.id}>
            <strong className="text-primary">{item.title}</strong>
            <p className="text-sm text-slate-600">{item.desc}</p>
          </GuideCard>
        ))}
      </div>
    </SectionWrapper>
  );
}
