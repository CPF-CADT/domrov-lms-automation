import { SectionHeader } from "@/components/data-display";
import SectionWrapper from "@/components/primitives/SectionWrapper";
import { TEAM_MEMBERS } from "@/config";
import TeamCard from "./TeamCard";

/**
 * TeamSection - Displays the team members grid.
 * Uses TeamCard for individual member cards.
 */
export default function TeamSection() {
  return (
    <SectionWrapper>
      <SectionHeader title="The Team" centered className="mb-12" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {TEAM_MEMBERS.map((member) => (
          <TeamCard key={member.id} member={member} />
        ))}
      </div>
    </SectionWrapper>
  );
}
