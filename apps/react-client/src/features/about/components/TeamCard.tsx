import { Icon } from "@/components/data-display";
import { CardBase } from "@/components/primitives";
import type { TeamMember } from "@/config";

interface TeamCardProps {
  member: TeamMember;
}

/**
 * TeamCard - Displays a team member with avatar placeholder, name, role, and description.
 * Used in TeamSection for showing the project team.
 */
export default function TeamCard({ member }: TeamCardProps) {
  return (
    <CardBase>
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-24 h-24 rounded-full bg-primary-light flex items-center justify-center text-primary shadow-md">
          <Icon name="person" size="4xl" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-primary">{member.name}</h3>
          <span className="text-xs font-bold text-accent uppercase tracking-wide mb-3 block">
            {member.role}
          </span>
          <p className="text-sm text-slate-500 leading-relaxed">
            {member.desc}
          </p>
        </div>
      </div>
    </CardBase>
  );
}
