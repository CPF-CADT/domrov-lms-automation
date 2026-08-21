import { SectionHeader } from "@/components/data-display";
import SectionWrapper from "@/components/primitives/SectionWrapper";

export default function MissionSection() {
  return (
    <SectionWrapper>
      <SectionHeader
        label="Our Mission"
        title="Addressing the Digital Divide in Cambodian Education."
        subtitle={
          'We built Domrov to solve the "Coding Gap"—where teachers are overwhelmed by manual grading and students lack timely feedback.'
        }
        centered
      />
    </SectionWrapper>
  );
}
